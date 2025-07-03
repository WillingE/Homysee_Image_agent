-- 创建收藏图片表
CREATE TABLE public.favorite_images (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  message_id UUID NOT NULL REFERENCES public.chat_messages(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 创建唯一约束，防止重复收藏同一张图片
CREATE UNIQUE INDEX favorite_images_unique_idx ON public.favorite_images(user_id, message_id);

-- 启用行级安全
ALTER TABLE public.favorite_images ENABLE ROW LEVEL SECURITY;

-- 创建RLS策略 - favorite_images表
CREATE POLICY "用户可以查看自己的收藏图片"
  ON public.favorite_images FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "用户可以收藏图片"
  ON public.favorite_images FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "用户可以取消收藏图片"
  ON public.favorite_images FOR DELETE
  USING (auth.uid() = user_id); 