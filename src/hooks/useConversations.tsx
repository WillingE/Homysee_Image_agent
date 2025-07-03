import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { FavoriteImage } from '@/integrations/supabase/types';
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

// 1. Define the context type
interface ConversationsContextType {
  conversations: Conversation[];
  currentConversation: Conversation | null;
  messages: ChatMessage[];
  favoriteImages: FavoriteImage[];
  loading: boolean;
  currentImage: string | null;
  currentImageInfo: any; // Using 'any' for simplicity, can be typed further
  isImageProcessing: boolean;
  imageProcessingProgress: number;
  createConversation: (title?: string) => Promise<Conversation | null>;
  selectConversation: (conversation: Conversation) => Promise<void>;
  deleteConversation: (conversationId: string) => Promise<boolean>;
  sendMessage: (content: string, imageUrl?: string, targetConversation?: Conversation) => Promise<ChatMessage | null>;
  addAIResponse: (content: string, imageUrl?: string) => Promise<ChatMessage | null>;
  addMessage: (message: ChatMessage) => void;
  updateCurrentImage: (imageUrl: string | null, messageId?: string) => void;
  updateImageProcessing: (processing: boolean, progress?: number) => void;
  favoriteImage: (message: ChatMessage) => Promise<boolean>;
  unfavoriteImage: (messageId: string) => Promise<boolean>;
  isImageFavorited: (messageId: string) => boolean;
  loadConversations: () => Promise<void>;
}

// 2. Create the Context
const ConversationsContext = createContext<ConversationsContextType | undefined>(undefined);

// 3. Create the Provider Component
export const ConversationsProvider = ({ children }: { children: ReactNode }) => {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [currentConversation, setCurrentConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [favoriteImages, setFavoriteImages] = useState<FavoriteImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentImage, setCurrentImage] = useState<string | null>(null);
  const [currentImageInfo, setCurrentImageInfo] = useState<any | null>(null);
  const [isImageProcessing, setIsImageProcessing] = useState(false);
  const [imageProcessingProgress, setImageProcessingProgress] = useState(0);
  const { user } = useAuth();
  const { toast } = useToast();

  // 加载用户的所有对话
  const loadConversations = async () => {
    if (!user) return;
    
    setLoading(true);
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

  // 加载对话的收藏图片
  const loadFavoriteImages = async (conversationId: string) => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('favorite_images' as any)
        .select('*')
        .eq('user_id', user.id)
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: false });

      if (error) {
        if (error.code === '42P01' || error.message?.includes('relation "public.favorite_images" does not exist')) {
          console.log('收藏图片表尚未创建');
          setFavoriteImages([]);
          return;
        }
        throw error;
      }
      setFavoriteImages((data || []) as unknown as FavoriteImage[]);
    } catch (error) {
      console.error('Error loading favorite images:', error);
      setFavoriteImages([]);
    }
  };

  // 收藏图片
  const favoriteImage = async (message: ChatMessage) => {
    if (!user || !currentConversation || !message.image_url) return false;

    try {
      const { data, error } = await supabase
        .from('favorite_images' as any)
        .insert({
          user_id: user.id,
          conversation_id: currentConversation.id,
          message_id: message.id,
          image_url: message.image_url
        })
        .select()
        .single();

      if (error) {
        if (error.code === '23505') {
          toast({
            title: '已收藏',
            description: '该图片已经收藏过了',
            variant: 'default'
          });
          return false;
        }
        if (error.code === '42P01' || error.message?.includes('relation "public.favorite_images" does not exist')) {
          toast({
            title: '功能尚未启用',
            description: '收藏图片功能需要数据库配置，请联系管理员',
            variant: 'destructive'
          });
          return false;
        }
        throw error;
      }

      setFavoriteImages(prev => [data as unknown as FavoriteImage, ...prev]);
      toast({
        title: '收藏成功',
        description: '图片已添加到收藏',
      });
      return true;
    } catch (error) {
      console.error('Error favoriting image:', error);
      toast({
        title: '收藏失败',
        description: '请检查网络连接或联系管理员',
        variant: 'destructive'
      });
      return false;
    }
  };

  // 取消收藏图片
  const unfavoriteImage = async (messageId: string) => {
    if (!user) return false;

    try {
      const { error } = await supabase
        .from('favorite_images' as any)
        .delete()
        .eq('user_id', user.id)
        .eq('message_id', messageId);

      if (error) throw error;

      setFavoriteImages(prev => prev.filter(fav => fav.message_id !== messageId));
      toast({
        title: '已取消收藏',
        description: '图片已从收藏中移除',
      });
      return true;
    } catch (error) {
      console.error('Error unfavoriting image:', error);
      toast({
        title: '取消收藏失败',
        description: '无法取消收藏图片',
        variant: 'destructive'
      });
      return false;
    }
  };

  // 检查图片是否已收藏
  const isImageFavorited = (messageId: string) => {
    return favoriteImages.some(fav => fav.message_id === messageId);
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
      const messagesData = (data || []) as ChatMessage[];
      setMessages(messagesData);
      
      await loadFavoriteImages(conversationId);
      
      const latestImageMessage = messagesData
        .filter(msg => msg.image_url)
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0];
      
      if (latestImageMessage) {
        setCurrentImage(latestImageMessage.image_url);
        setCurrentImageInfo({
          messageId: latestImageMessage.id,
          timestamp: latestImageMessage.created_at,
          role: latestImageMessage.role,
          conversationTitle: currentConversation?.title
        });
      } else {
        setCurrentImage(null);
        setCurrentImageInfo(null);
      }
    } catch (error) {
      console.error('Error loading messages:', error);
      toast({
        title: '加载消息失败',
        description: '无法加载对话消息',
        variant: 'destructive'
      });
    }
  };
  
  // 选择对话
  const selectConversation = async (conversation: Conversation) => {
    setCurrentConversation(conversation);
    await loadMessages(conversation.id);
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
      setFavoriteImages([]);
      
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
  
  // 删除对话
  const deleteConversation = async (conversationId: string) => {
    if (!user) return false;

    try {
      const { error } = await supabase
        .from('conversations')
        .delete()
        .eq('id', conversationId)
        .eq('user_id', user.id);

      if (error) throw error;
      
      setConversations(prev => prev.filter(c => c.id !== conversationId));
      
      if (currentConversation?.id === conversationId) {
        setCurrentConversation(null);
        setMessages([]);
        setFavoriteImages([]);
      }
      
      toast({
        title: '删除成功',
        description: '对话已删除',
      });
      
      return true;
    } catch (error) {
      console.error('Error deleting conversation:', error);
      toast({
        title: '删除失败',
        description: '无法删除对话',
        variant: 'destructive'
      });
      return false;
    }
  };
  
  // 发送消息
  const sendMessage = async (content: string, imageUrl?: string, targetConversation?: Conversation) => {
    const conversation = targetConversation || currentConversation;
    if (!conversation || !user) return null;

    try {
      const { data, error } = await supabase
        .from('chat_messages')
        .insert({
          conversation_id: conversation.id,
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
        description: error instanceof Error ? error.message : '无法发送消息',
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

  const addMessage = (message: ChatMessage) => {
    setMessages(prev => {
      if (prev.some(m => m.id === message.id)) {
        return prev;
      }
      return [...prev, message];
    });
    
    if (message.image_url) {
      setCurrentImage(message.image_url);
      setCurrentImageInfo({
        messageId: message.id,
        timestamp: message.created_at,
        role: message.role,
        conversationTitle: currentConversation?.title
      });
    }
  };

  const updateCurrentImage = (imageUrl: string | null, messageId?: string) => {
    setCurrentImage(imageUrl);
    
    if (imageUrl && messageId) {
      const messageWithImage = messages.find(m => m.id === messageId);
      if (messageWithImage) {
        setCurrentImageInfo({
          messageId: messageWithImage.id,
          timestamp: messageWithImage.created_at,
          role: messageWithImage.role,
          conversationTitle: currentConversation?.title
        });
      }
    } else if (imageUrl) {
      const messageWithImage = messages.find(m => m.image_url === imageUrl);
      if (messageWithImage) {
        setCurrentImageInfo({
          messageId: messageWithImage.id,
          timestamp: messageWithImage.created_at,
          role: messageWithImage.role,
          conversationTitle: currentConversation?.title
        });
      }
    } else {
      setCurrentImageInfo(null);
    }
  };

  const updateImageProcessing = (processing: boolean, progress: number = 0) => {
    setIsImageProcessing(processing);
    setImageProcessingProgress(progress);
  };
  
  useEffect(() => {
    if (user) {
      loadConversations();
    }
  }, [user]);

  useEffect(() => {
    if (!currentConversation) {
      setMessages([]);
      setFavoriteImages([]);
      return;
    }
    loadMessages(currentConversation.id);
  }, [currentConversation]);

  const value = {
    conversations,
    currentConversation,
    messages,
    favoriteImages,
    loading,
    currentImage,
    currentImageInfo,
    isImageProcessing,
    imageProcessingProgress,
    createConversation,
    selectConversation,
    deleteConversation,
    sendMessage,
    addAIResponse,
    addMessage,
    updateCurrentImage,
    updateImageProcessing,
    favoriteImage,
    unfavoriteImage,
    isImageFavorited,
    loadConversations,
  };

  return <ConversationsContext.Provider value={value}>{children}</ConversationsContext.Provider>;
};

// 4. Create the custom hook
export const useConversations = () => {
  const context = useContext(ConversationsContext);
  if (context === undefined) {
    throw new Error('useConversations must be used within a ConversationsProvider');
  }
  return context;
};

export type ChatMessageWithSender = ChatMessage & {
  // ... existing code ...
};