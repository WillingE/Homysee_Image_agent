import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get user from JWT token
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const { conversationId, userMessage, imageUrl } = await req.json();

    // Validate inputs
    if (!conversationId || !userMessage) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Validate message length
    if (userMessage.length > 1000) {
      return new Response(JSON.stringify({ error: 'Message too long (max 1000 characters)' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
    
    if (!openaiApiKey) {
      throw new Error('OpenAI API key not configured');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // 获取对话信息以获取用户ID
    const { data: conversation, error: conversationError } = await supabase
      .from('conversations')
      .select('user_id')
      .eq('id', conversationId)
      .single();

    if (conversationError) throw conversationError;
    const userId = conversation.user_id;

    // 获取对话历史
    const { data: messages, error: messagesError } = await supabase
      .from('chat_messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true });

    if (messagesError) throw messagesError;

    // 构建对话上下文
    const conversationHistory = messages?.map(msg => ({
      role: msg.role as 'user' | 'assistant',
      content: msg.content,
    })) || [];

    // 添加当前用户消息
    let currentMessage = userMessage;
    if (imageUrl) {
      currentMessage += `\n\n已上传图片：${imageUrl}`;
    }
    
    conversationHistory.push({
      role: 'user',
      content: currentMessage
    });

    // 定义AI Agent的system prompt
    const systemPrompt = `你是一个高效、专业的AI图片编辑与生成助手。你的主要任务是根据用户的指令调用\`image_processing\`工具来处理图片或生成新图片。

工作流程:
1.  **分析指令**：分析用户的最新消息，判断属于以下哪种情况：
    - 明确的图片编辑指令（如"更换背景"、"移除物体"、"添加元素"等）
    - 明确的图片生成指令（如"画一只猫"、"生成一个宇宙背景"等）
2.  **判断清晰度**：
    *   **如果指令足够清晰**表达了明确的编辑或生成意图（例如："把背景换成日落的海滩"、"画一只猫"、"生成卡通风格的房子"等），请**直接调用\`image_processing\`工具**。你需要将用户的中文指令准确翻译成符合工具要求的英文\`prompt\`。不要向用户寻求确认或提供选项，立即执行任务。
    *   **如果指令不清晰或过于模糊**（例如："生成图片"、"处理一下这张图"等），或者你无法提取出明确的动作和对象，你才应该向用户提问，以澄清他们的具体需求。可以提供一些建议选项帮助用户决定。
3.  **常规对话**：如果用户的消息与图片编辑或生成无关，则进行正常的对话。

**工具调用规则**：
- 工具名称: \`image_processing\`
- 参数:
  - \`prompt\`: 必须是**英文**的编辑或生成指令 (e.g., "change background to a beach at sunset", "remove the chair", "add a small cat", "a cat sitting on a sofa, cartoon style").
  - \`conversation_id\`: 当前对话的ID。

- **如果有图片（用户上传或历史图片），则基于图片进行编辑**。
- **如果没有图片，则直接根据prompt生成新图片**。

请总是用中文回复用户。当工具调用成功后，你的回复应该简洁明了，例如："好的，正在为您处理图片。" 或 "好的，正在为您生成图片。"`;

    // 定义可用的工具
    const tools = [
      {
        type: 'function',
        function: {
          name: 'image_processing',
          description: '处理或编辑图片',
          parameters: {
            type: 'object',
            properties: {
              prompt: {
                type: 'string',
                description: '图片编辑的英文指令，比如"remove background", "change to sunset", "add a dog"'
              },
              conversation_id: {
                type: 'string',
                description: '当前对话ID'
              }
            },
            required: ['prompt', 'conversation_id']
          }
        }
      }
    ];

    // 调用OpenAI API
    const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          ...conversationHistory
        ],
        tools: tools,
        tool_choice: 'auto',
        temperature: 0.7,
      }),
    });

    if (!openaiResponse.ok) {
      throw new Error(`OpenAI API error: ${openaiResponse.statusText}`);
    }

    const openaiData = await openaiResponse.json();
    const assistantMessage = openaiData.choices[0].message;

    let responseContent = assistantMessage.content || '';
    let processedImageUrl = null;

    // 检查是否需要调用工具
    if (assistantMessage.tool_calls && assistantMessage.tool_calls.length > 0) {
      const toolCall = assistantMessage.tool_calls[0];
      
      if (toolCall.function.name === 'image_processing') {
        const args = JSON.parse(toolCall.function.arguments);
        console.log("🔧 Image processing tool called with args:", args);
        
        // 🔍 直接从数据库查询最新的带图片的消息
        console.log("🔍 Searching for recent images in conversation:", conversationId);
        const { data: recentImages, error: imageQueryError } = await supabase
          .from('chat_messages')
          .select('image_url, created_at, content')
          .eq('conversation_id', conversationId)
          .not('image_url', 'is', null)
          .order('created_at', { ascending: false })
          .limit(5);
        
        if (imageQueryError) {
          console.error("❌ Error querying recent images:", imageQueryError);
        } else {
          console.log("📋 Found recent images:", recentImages);
        }
        
        let actualImageUrl: string | null = null;
        
        // 查找最新的有效图片URL
        if (recentImages && recentImages.length > 0) {
          for (const imageMessage of recentImages) {
            if (imageMessage.image_url && typeof imageMessage.image_url === 'string' && imageMessage.image_url.startsWith('http')) {
              actualImageUrl = imageMessage.image_url;
              console.log("✅ Found valid image URL from database:", actualImageUrl);
              break;
            }
          }
        }
        // 允许无图片时直接生图
        if (!actualImageUrl) {
          console.log("🖼️ No image found, will generate new image from prompt only.");
        }
        // 有图片时校验格式
        if (typeof actualImageUrl === 'string' && !actualImageUrl.startsWith('http')) {
          console.error("❌ Invalid image URL format:", actualImageUrl);
          responseContent += `\n\n抱歉，图片URL格式无效。请重新上传图片后再试。`;
          actualImageUrl = null;
        }
        
        // 无论是否有图片，都调用处理服务（后端会根据是否有图片决定修图还是生图）
        const imageProcessingResponse = await fetch(`${supabaseUrl}/functions/v1/image-processing`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${supabaseServiceKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            original_image_url: actualImageUrl,  // 允许为null，后端需支持生图
            prompt: args.prompt,
            conversation_id: conversationId,
            user_id: userId
          }),
        });

        if (imageProcessingResponse.ok) {
          const imageResult = await imageProcessingResponse.json();
          console.log("✅ Image processing result:", imageResult);
          
          if (imageResult.status === 'completed' && imageResult.processed_image_url) {
            // 🎉 图片处理已完成！直接返回处理后的图片
            processedImageUrl = imageResult.processed_image_url;
            if (actualImageUrl) {
              responseContent += `\n\n🎉 图片处理完成！`;
            } else {
              responseContent += `\n\n🎉 图片生成完成！`;
            }
            
            console.log("✅ Image processing completed immediately:", processedImageUrl);
          } else if (imageResult.status === 'failed') {
            // 处理失败
            responseContent += `\n\n❌ 图片处理失败：${imageResult.error || '未知错误'}`;
            console.error("❌ Image processing failed:", imageResult.error);
          } else {
            // 备用：如果仍然返回task_id（不应该发生）
            processedImageUrl = imageResult.task_id;
            responseContent += `\n\n⏳ 图片正在处理中，请稍候...`;
            console.log("⚠️ Unexpected: Still got task_id:", imageResult.task_id);
          }
        } else {
          const errorText = await imageProcessingResponse.text();
          console.error("❌ Image processing service error:", imageProcessingResponse.status, errorText);
          
          // 解析错误响应
          let errorMessage = '图片处理服务暂时不可用';
          try {
            const errorData = JSON.parse(errorText);
            if (errorData.error) {
              errorMessage = errorData.error;
            }
          } catch (parseError) {
            console.error("Error parsing error response:", parseError);
          }
          
          responseContent += `\n\n❌ 图片处理失败：${errorMessage}`;
        }
      }
    }

    // 保存AI回复到数据库
    const { data: aiMessage, error: saveError } = await supabase
      .from('chat_messages')
      .insert({
        conversation_id: conversationId,
        role: 'assistant',
        content: responseContent,
        image_url: processedImageUrl
      })
      .select()
      .single();

    if (saveError) throw saveError;

    return new Response(JSON.stringify({
      message: aiMessage,
      requiresImageProcessing: !!assistantMessage.tool_calls
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in ai-chat-agent:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message || 'An unexpected error occurred',
        details: error.toString()
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }, 
        status: 500 
      }
    );
  }
});