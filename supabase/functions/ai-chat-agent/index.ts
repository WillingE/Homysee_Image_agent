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
- original_image_url: 原图片URL（从消息中提取）
- prompt: 编辑指令（用英文描述）
- conversation_id: 当前对话ID

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
              original_image_url: {
                type: 'string',
                description: '原图片的URL'
              },
              prompt: {
                type: 'string',
                description: '图片编辑的英文指令，比如"remove background", "change to sunset", "add a dog"'
              },
              conversation_id: {
                type: 'string',
                description: '当前对话ID'
              }
            },
            required: ['original_image_url', 'prompt', 'conversation_id']
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
        
        // 调用图片处理服务
        const imageProcessingResponse = await fetch(`${supabaseUrl}/functions/v1/image-processing`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${supabaseServiceKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            original_image_url: args.original_image_url,
            prompt: args.prompt,
            conversation_id: conversationId
          }),
        });

        if (imageProcessingResponse.ok) {
          const imageResult = await imageProcessingResponse.json();
          processedImageUrl = imageResult.task_id;
          responseContent += `\n\n我正在为您处理图片，请稍候...`;
        } else {
          responseContent += `\n\n抱歉，图片处理服务暂时不可用。`;
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