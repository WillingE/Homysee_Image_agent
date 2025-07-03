import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';
import Replicate from "https://esm.sh/replicate@0.25.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const replicateApiKey = Deno.env.get('REPLICATE_API_TOKEN');
    if (!replicateApiKey) {
      throw new Error('Replicate API key not configured');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const replicate = new Replicate({ auth: replicateApiKey });

    const body = await req.json();
    
    // 如果是状态检查请求
    if (body.task_id) {
      const { data: task, error } = await supabase
        .from('image_tasks')
        .select('*')
        .eq('id', body.task_id)
        .single();

      if (error) throw error;

      // 如果任务还在进行中，检查Replicate状态
      if (task.status === 'processing' && task.prediction_id) {
        try {
          const prediction = await replicate.predictions.get(task.prediction_id);
          
          if (prediction.status === 'succeeded') {
            // 任务完成，更新数据库
            const { error: updateError } = await supabase
              .from('image_tasks')
              .update({
                status: 'completed',
                processed_image_url: prediction.output[0],
                updated_at: new Date().toISOString()
              })
              .eq('id', task.id);

            if (updateError) throw updateError;

            // 更新聊天消息
            await supabase
              .from('chat_messages')
              .update({
                content: `图片处理完成！`,
                image_url: prediction.output[0]
              })
              .eq('conversation_id', task.conversation_id)
              .eq('role', 'assistant')
              .order('created_at', { ascending: false })
              .limit(1);

            return new Response(JSON.stringify({
              status: 'completed',
              processed_image_url: prediction.output[0]
            }), {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
          } else if (prediction.status === 'failed') {
            // 任务失败
            await supabase
              .from('image_tasks')
              .update({
                status: 'failed',
                error_message: prediction.error || 'Processing failed',
                updated_at: new Date().toISOString()
              })
              .eq('id', task.id);

            return new Response(JSON.stringify({
              status: 'failed',
              error: prediction.error
            }), {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
          }
        } catch (predictionError) {
          console.error('Error checking prediction:', predictionError);
        }
      }

      return new Response(JSON.stringify({
        status: task.status,
        processed_image_url: task.processed_image_url
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 如果是新的处理请求
    const { original_image_url, prompt, conversation_id, user_id } = body;

    if (!original_image_url || !prompt) {
      return new Response(
        JSON.stringify({ 
          error: "Missing required fields: original_image_url and prompt are required" 
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        }
      );
    }

    // 创建图片任务记录
    const { data: task, error: taskError } = await supabase
      .from('image_tasks')
      .insert({
        user_id: user_id,
        conversation_id: conversation_id,
        original_image_url: original_image_url,
        prompt: prompt,
        status: 'processing'
      })
      .select()
      .single();

    if (taskError) throw taskError;

    console.log("Starting image processing with prompt:", prompt);
    
    // 调用Replicate API进行图片处理
    try {
      const prediction = await replicate.predictions.create({
        model: "fofr/flux-kontext-pro",
        input: {
          image: original_image_url,
          prompt: prompt,
          guidance_scale: 3.5,
          num_inference_steps: 28,
          enable_safety_checker: true
        }
      });

      // 更新任务记录，保存prediction ID
      await supabase
        .from('image_tasks')
        .update({
          prediction_id: prediction.id
        })
        .eq('id', task.id);

      console.log("Image processing started with prediction ID:", prediction.id);

      return new Response(JSON.stringify({ 
        task_id: task.id,
        prediction_id: prediction.id,
        status: 'processing'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });

    } catch (replicateError) {
      console.error("Replicate API error:", replicateError);
      
      // 更新任务状态为失败
      await supabase
        .from('image_tasks')
        .update({
          status: 'failed',
          error_message: replicateError.message || 'Replicate API error'
        })
        .eq('id', task.id);

      throw replicateError;
    }

  } catch (error) {
    console.error("Error in image-processing function:", error);
    return new Response(JSON.stringify({ 
      error: error.message || 'An unexpected error occurred'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});