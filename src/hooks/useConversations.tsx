import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

export interface Conversation {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
  user_id: string;
}

export interface ChatMessage {
  id: string;
  conversation_id: string;
  role: 'user' | 'assistant';
  content: string;
  image_url?: string;
  created_at: string;
}

export const useConversations = () => {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [currentConversation, setCurrentConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const { toast } = useToast();

  // 加载用户的所有对话
  const loadConversations = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('conversations')
        .select('*')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false });

      if (error) throw error;
      setConversations(data || []);
    } catch (error) {
      console.error('Error loading conversations:', error);
      toast({
        title: '加载对话失败',
        description: '无法加载对话列表',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  // 创建新对话
  const createConversation = async (title: string = '新对话') => {
    if (!user) return null;

    try {
      const { data, error } = await supabase
        .from('conversations')
        .insert({
          user_id: user.id,
          title
        })
        .select()
        .single();

      if (error) throw error;
      
      setConversations(prev => [data, ...prev]);
      setCurrentConversation(data);
      setMessages([]);
      
      return data;
    } catch (error) {
      console.error('Error creating conversation:', error);
      toast({
        title: '创建对话失败',
        description: '无法创建新对话',
        variant: 'destructive'
      });
      return null;
    }
  };

  // 加载对话消息
  const loadMessages = async (conversationId: string) => {
    try {
      const { data, error } = await supabase
        .from('chat_messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setMessages((data || []) as ChatMessage[]);
    } catch (error) {
      console.error('Error loading messages:', error);
      toast({
        title: '加载消息失败',
        description: '无法加载对话消息',
        variant: 'destructive'
      });
    }
  };

  // 发送消息
  const sendMessage = async (content: string, imageUrl?: string) => {
    if (!currentConversation || !user) return null;

    try {
      const { data, error } = await supabase
        .from('chat_messages')
        .insert({
          conversation_id: currentConversation.id,
          role: 'user',
          content,
          image_url: imageUrl
        })
        .select()
        .single();

      if (error) throw error;
      
      setMessages(prev => [...prev, data as ChatMessage]);
      return data as ChatMessage;
    } catch (error) {
      console.error('Error sending message:', error);
      toast({
        title: '发送消息失败',
        description: '无法发送消息',
        variant: 'destructive'
      });
      return null;
    }
  };

  // 添加AI回复
  const addAIResponse = async (content: string, imageUrl?: string) => {
    if (!currentConversation) return null;

    try {
      const { data, error } = await supabase
        .from('chat_messages')
        .insert({
          conversation_id: currentConversation.id,
          role: 'assistant',
          content,
          image_url: imageUrl
        })
        .select()
        .single();

      if (error) throw error;
      
      setMessages(prev => [...prev, data as ChatMessage]);
      return data as ChatMessage;
    } catch (error) {
      console.error('Error adding AI response:', error);
      return null;
    }
  };

  // 选择对话
  const selectConversation = async (conversation: Conversation) => {
    setCurrentConversation(conversation);
    await loadMessages(conversation.id);
  };

  useEffect(() => {
    if (user) {
      loadConversations();
    }
  }, [user]);

  return {
    conversations,
    currentConversation,
    messages,
    loading,
    createConversation,
    selectConversation,
    sendMessage,
    addAIResponse,
    loadConversations
  };
};