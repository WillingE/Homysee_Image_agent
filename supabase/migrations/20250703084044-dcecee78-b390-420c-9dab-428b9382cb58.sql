-- 创建用户配置文件表
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 创建对话会话表
CREATE TABLE public.conversations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 创建聊天消息表
CREATE TABLE public.chat_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  image_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 创建图片处理任务表
CREATE TABLE public.image_tasks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  conversation_id UUID REFERENCES public.conversations(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  original_image_url TEXT NOT NULL,
  processed_image_url TEXT,
  prompt TEXT NOT NULL,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 启用行级安全
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.image_tasks ENABLE ROW LEVEL SECURITY;

-- 创建RLS策略 - profiles表
CREATE POLICY "用户可以查看自己的配置文件"
  ON public.profiles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "用户可以更新自己的配置文件"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "用户可以插入自己的配置文件"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- 创建RLS策略 - conversations表
CREATE POLICY "用户可以查看自己的对话"
  ON public.conversations FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "用户可以创建自己的对话"
  ON public.conversations FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "用户可以更新自己的对话"
  ON public.conversations FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "用户可以删除自己的对话"
  ON public.conversations FOR DELETE
  USING (auth.uid() = user_id);

-- 创建RLS策略 - chat_messages表
CREATE POLICY "用户可以查看自己对话中的消息"
  ON public.chat_messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.conversations
      WHERE conversations.id = chat_messages.conversation_id
      AND conversations.user_id = auth.uid()
    )
  );

CREATE POLICY "用户可以在自己的对话中创建消息"
  ON public.chat_messages FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.conversations
      WHERE conversations.id = chat_messages.conversation_id
      AND conversations.user_id = auth.uid()
    )
  );

-- 创建RLS策略 - image_tasks表
CREATE POLICY "用户可以查看自己的图片任务"
  ON public.image_tasks FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "用户可以创建自己的图片任务"
  ON public.image_tasks FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "用户可以更新自己的图片任务"
  ON public.image_tasks FOR UPDATE
  USING (auth.uid() = user_id);

-- 创建自动更新时间戳的函数
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 创建自动更新时间戳的触发器
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_conversations_updated_at
  BEFORE UPDATE ON public.conversations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_image_tasks_updated_at
  BEFORE UPDATE ON public.image_tasks
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- 创建用户注册时自动创建配置文件的函数
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, username)
  VALUES (NEW.id, NEW.raw_user_meta_data ->> 'username');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 创建用户注册时的触发器
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- 创建存储桶用于图片存储
INSERT INTO storage.buckets (id, name, public) 
VALUES ('images', 'images', true);

-- 创建存储策略
CREATE POLICY "用户可以查看所有图片"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'images');

CREATE POLICY "用户可以上传自己的图片"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'images' 
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "用户可以更新自己的图片"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'images' 
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "用户可以删除自己的图片"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'images' 
    AND auth.uid()::text = (storage.foldername(name))[1]
  );