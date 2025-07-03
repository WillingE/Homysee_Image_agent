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
    const { conversationId, userMessage, imageUrl } = await req.json();
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
    const systemPrompt = `你是一个专业的AI图片编辑助手。你可以：

1. 进行自然对话和回答用户问题
2. 分析用户是否需要图片处理服务
3. 如果用户提到图片编辑、修改、生成等需求，使用image_processing工具

当用户上传图片时（消息中包含"已上传图片："），你应该：
- 确认收到图片
- 分析可能的编辑选项（如：背景更换、物体移除、风格转换、添加元素等）
- 询问用户具体想要什么编辑效果
- 提供具体的编辑建议

如果需要处理图片，调用image_processing函数，参数包括：
- prompt: 编辑指令（用英文描述，比如"remove background", "change to sunset", "add a dog"）
- conversation_id: 当前对话ID

注意：不需要提供原图片URL，系统会自动从对话历史中找到最新上传的图片。

请用中文回复用户。`;

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
        
        let actualImageUrl = null;
        
        // 查找最新的有效图片URL
        if (recentImages && recentImages.length > 0) {
          for (const imageMessage of recentImages) {
            if (imageMessage.image_url && imageMessage.image_url.startsWith('http')) {
              actualImageUrl = imageMessage.image_url;
              console.log("✅ Found valid image URL from database:", actualImageUrl);
              break;
            }
          }
        }
        
        // 如果仍然没有找到有效的图片URL，返回错误
        if (!actualImageUrl || !actualImageUrl.startsWith('http')) {
          console.error("❌ No valid image URL found in conversation");
          responseContent += `\n\n抱歉，我没有找到需要处理的图片。请先上传图片，然后再告诉我您想要的编辑效果。`;
        } else {
          console.log("✅ Using valid image URL for processing:", actualImageUrl);
          
          // 验证图片URL格式
          try {
            new URL(actualImageUrl);
            console.log("✅ Image URL format validation passed");
          } catch (urlError) {
            console.error("❌ Invalid image URL format:", actualImageUrl);
            responseContent += `\n\n抱歉，图片URL格式无效。请重新上传图片后再试。`;
            // 跳过图片处理
            actualImageUrl = null;
          }
        }
        
        // 只有在有有效图片URL时才调用处理服务
        if (actualImageUrl) {
          
          // 调用图片处理服务
          const imageProcessingResponse = await fetch(`${supabaseUrl}/functions/v1/image-processing`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${supabaseServiceKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              original_image_url: actualImageUrl,  // 使用从数据库查询到的正确图片URL
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
              responseContent += `\n\n🎉 图片处理完成！`;
              
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