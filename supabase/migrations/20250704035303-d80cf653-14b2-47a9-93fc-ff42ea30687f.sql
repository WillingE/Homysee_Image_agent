-- Add missing RLS policies for chat_messages table
CREATE POLICY "用户可以更新自己对话中的消息"
  ON public.chat_messages FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.conversations
      WHERE conversations.id = chat_messages.conversation_id
      AND conversations.user_id = auth.uid()
    )
  );

CREATE POLICY "用户可以删除自己对话中的消息"
  ON public.chat_messages FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.conversations
      WHERE conversations.id = chat_messages.conversation_id
      AND conversations.user_id = auth.uid()
    )
  );

-- Add missing RLS policy for image_tasks DELETE
CREATE POLICY "用户可以删除自己的图片任务"
  ON public.image_tasks FOR DELETE
  USING (auth.uid() = user_id);