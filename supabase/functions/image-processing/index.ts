import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

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
    // Check for authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const replicateApiKey = Deno.env.get('REPLICATE_API_TOKEN');
    if (!replicateApiKey) {
      throw new Error('Replicate API key not configured');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const body = await req.json();

    const { original_image_url, prompt, conversation_id, user_id, transform_params } = body;

    console.log("=== NEW IMAGE PROCESSING REQUEST ===");
    console.log("Request body:", { original_image_url, prompt, conversation_id, user_id, transform_params });

    if (!prompt || !user_id) {
      console.log("Missing required fields, returning 400");
      return new Response(
        JSON.stringify({ 
          error: "Missing required fields: prompt and user_id are required" 
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        }
      );
    }

    // Check user credit balance
    const { data: creditBalance, error: creditError } = await supabase
      .rpc('get_user_credit_balance', { p_user_id: user_id });

    if (creditError) {
      console.error("Error checking credit balance:", creditError);
      return new Response(
        JSON.stringify({ 
          error: "Failed to check credit balance" 
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500,
        }
      );
    }

    if (creditBalance < 1) {
      console.log("Insufficient credits:", creditBalance);
      return new Response(
        JSON.stringify({ 
          error: "Insufficient credits. Need 1 credit to generate image.",
          current_balance: creditBalance
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 402, // Payment Required
        }
      );
    }

    // Validate prompt length
    if (prompt.length > 500) {
      return new Response(
        JSON.stringify({ 
          error: "Prompt too long (max 500 characters)" 
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        }
      );
    }

    // 验证和清理图片URL（仅在有图片时）
    let cleanImageUrl: string | null = null;
    if (original_image_url && typeof original_image_url === 'string' && original_image_url.trim() !== '') {
      cleanImageUrl = original_image_url.trim();
      console.log("✅ Received image URL:", original_image_url);
      // 确保URL是有效的HTTP/HTTPS链接
      if (typeof cleanImageUrl === 'string' && !cleanImageUrl.startsWith('http://') && !cleanImageUrl.startsWith('https://')) {
        console.log("❌ Invalid URL protocol, returning 400");
        return new Response(
          JSON.stringify({ 
            error: "Invalid image URL: must be a valid HTTP/HTTPS URL",
            received_url: original_image_url
          }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400,
          }
        );
      }
      // 验证URL格式并清理
      try {
        if (typeof cleanImageUrl === 'string') {
          const urlObj = new URL(cleanImageUrl);
          cleanImageUrl = urlObj.href;
          console.log("✅ URL validation passed, using:", cleanImageUrl);
        }
      } catch (urlError) {
        console.error("❌ Invalid URL format:", urlError);
        return new Response(
          JSON.stringify({ 
            error: `Invalid image URL format: ${urlError.message}`,
            received_url: original_image_url
          }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400,
          }
        );
      }
      // 额外验证：检查URL是否来自允许的域名
      const allowedDomains = ['supabase.co', 'amazonaws.com', 'cloudflare.com', 'googleapis.com', 'googleusercontent.com', 'replicate.delivery'];
      if (typeof cleanImageUrl === 'string') {
        const urlObj = new URL(cleanImageUrl);
        const isAllowedDomain = allowedDomains.some(domain => urlObj.hostname.endsWith(domain) || urlObj.hostname === domain);
        if (!isAllowedDomain) {
          console.log("❌ Image URL from unauthorized domain:", urlObj.hostname);
          return new Response(
            JSON.stringify({ 
              error: `Image URL must be from an authorized domain. Current domain: ${urlObj.hostname}`,
              received_url: original_image_url
            }), {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
              status: 400,
            }
          );
        }
      }
    }

    // 创建图片任务记录
    const { data: task, error: taskError } = await supabase
      .from('image_tasks')
      .insert({
        user_id: user_id,
        conversation_id: conversation_id,
        original_image_url: cleanImageUrl || null,
        prompt: prompt,
        status: 'processing'
      })
      .select()
      .single();

    if (taskError) throw taskError;

    console.log("Starting synchronous image processing with prompt:", prompt);
    
    // 🚀 使用同步的 Replicate API 调用
    try {
      // 构造input参数，支持无图片时不传input_image
      const replicateInput: Record<string, any> = {
        prompt: prompt,
        guidance_scale: 3.5,
        num_inference_steps: 28,
        enable_safety_checker: true,
        output_format: "jpg",
        safety_tolerance: 2
      };
      if (cleanImageUrl && typeof cleanImageUrl === 'string') {
        replicateInput.input_image = cleanImageUrl;
        replicateInput.aspect_ratio = "match_input_image";
      }
      const response = await fetch('https://api.replicate.com/v1/models/black-forest-labs/flux-kontext-pro/predictions', {
        method: 'POST',
        headers: {
          'Authorization': `Token ${replicateApiKey}`,
          'Content-Type': 'application/json',
          'Prefer': 'wait'  // 🔑 关键：使请求同步等待完成
        },
        body: JSON.stringify({
          input: replicateInput
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Replicate API error:", response.status, errorText);
        throw new Error(`Replicate API error: ${response.status} ${errorText}`);
      }

      const prediction = await response.json();
      console.log("Synchronous processing completed:", prediction);

      // 🔧 修改判断逻辑：只要有output且没有error就是成功
      if (prediction.output && !prediction.error) {
        const processedImageUrl = Array.isArray(prediction.output) ? prediction.output[0] : prediction.output;
        
        // Deduct 1 credit from user balance
        const { error: deductError } = await supabase
          .rpc('update_user_credit_balance', {
            p_user_id: user_id,
            p_amount: -1,
            p_transaction_type: 'image_generation',
            p_description: 'AI image generation'
          });

        if (deductError) {
          console.error("Error deducting credits:", deductError);
          // Continue anyway since image was generated successfully
        }

        // 更新任务状态为完成
        await supabase
          .from('image_tasks')
          .update({
            status: 'completed',
            processed_image_url: processedImageUrl,
            prediction_id: prediction.id,
            updated_at: new Date().toISOString()
          })
          .eq('id', task.id);

        console.log("Task completed successfully:", processedImageUrl);

        return new Response(JSON.stringify({ 
          task_id: task.id,
          status: 'completed',
          processed_image_url: processedImageUrl,
          prediction_id: prediction.id
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        });

      } else if (prediction.error) {
        // 有明确的错误信息
        console.error("Processing failed with error:", prediction.error);
        
        await supabase
          .from('image_tasks')
          .update({
            status: 'failed',
            error_message: prediction.error,
            prediction_id: prediction.id,
            updated_at: new Date().toISOString()
          })
          .eq('id', task.id);

        return new Response(JSON.stringify({ 
          task_id: task.id,
          status: 'failed',
          error: prediction.error
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500,
        });
      } else {
        // 既没有输出也没有错误，可能仍在处理中（不应该发生在同步调用中）
        console.error("Unexpected: No output and no error:", prediction);
        
        await supabase
          .from('image_tasks')
          .update({
            status: 'failed',
            error_message: 'No output received from processing service',
            prediction_id: prediction.id,
            updated_at: new Date().toISOString()
          })
          .eq('id', task.id);

        return new Response(JSON.stringify({ 
          task_id: task.id,
          status: 'failed',
          error: 'No output received from processing service'
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500,
        });
      }

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

      return new Response(JSON.stringify({ 
        task_id: task.id,
        status: 'failed',
        error: replicateError.message || 'Replicate API error'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      });
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