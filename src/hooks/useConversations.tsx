import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Tables } from '@/integrations/supabase/types';

type FavoriteImage = Tables<'favorite_images'>;
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

export interface Conversation {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
  user_id: string;
  thumbnail_url?: string | null;
}

export interface ChatMessage {
  id: string;
  conversation_id: string;
  role: 'user' | 'assistant';
  content: string;
  image_url?: string;
  created_at: string;
  additional_image_urls?: string[];
  status?: 'sending' | 'failed';
}

// 1. Define the context type
interface ConversationsContextType {
  conversations: Conversation[];
  currentConversation: Conversation | null;
  messages: ChatMessage[];
  favoriteImages: FavoriteImage[];
  loading: boolean;
  currentImage: string | null;
  currentImageInfo: any;
  createConversation: (title?: string) => Promise<Conversation | null>;
  selectConversation: (conversation: Conversation) => Promise<void>;
  deleteConversation: (conversationId: string) => Promise<boolean>;
  sendMessage: (content: string, imageUrls: string[], targetConversation?: Conversation) => Promise<ChatMessage | null>;
  addAIResponse: (content: string, imageUrl?: string) => Promise<ChatMessage | null>;
  addMessage: (message: ChatMessage) => void;
  updateCurrentImage: (imageUrl: string | null, messageId?: string) => void;
  favoriteImage: (message: ChatMessage, imageUrl: string) => Promise<boolean>;
  unfavoriteImage: (imageUrl: string) => Promise<boolean>;
  isImageFavorited: (imageUrl: string) => boolean;
  loadConversations: () => Promise<void>;
  updateConversationThumbnail: (conversationId: string, thumbnailUrl: string) => Promise<void>;
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
  const { user } = useAuth();
  const { toast } = useToast();

  const updateMessageInList = (updatedMessage: ChatMessage) => {
    setMessages(prevMessages => 
      prevMessages.map(msg => msg.id === updatedMessage.id ? updatedMessage : msg)
    );
  };

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
        title: 'Failed to load conversations',
        description: 'Could not load the conversation list.',
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
          console.log('Favorites table not created yet.');
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

  // 收藏图片 - 修改为基于具体图片URL
  const favoriteImage = async (message: ChatMessage, imageUrl: string) => {
    if (!user || !currentConversation || !imageUrl) return false;

    const newFavorite: FavoriteImage = {
      id: `temp_fav_${Date.now()}`,
      user_id: user.id,
      conversation_id: currentConversation.id,
      message_id: message.id,
      image_url: imageUrl,
      created_at: new Date().toISOString(),
    };

    setFavoriteImages(prev => [newFavorite, ...prev]);

    try {
      const { data, error } = await supabase
        .from('favorite_images')
        .insert({
          user_id: user.id,
          conversation_id: currentConversation.id,
          message_id: message.id,
          image_url: imageUrl
        })
        .select()
        .single();

      if (error) throw error;
      
      setFavoriteImages(prev => prev.map(fav => fav.id === newFavorite.id ? (data as FavoriteImage) : fav));
      
      toast({
        title: 'Image favorited',
        description: 'The image has been added to your favorites.',
      });
      return true;
    } catch (error) {
      console.error('🔴 Error favoriting image:', error);
      
      setFavoriteImages(prev => prev.filter(fav => fav.id !== newFavorite.id));

      toast({
        title: 'Failed to favorite',
        description: 'Please check your connection or contact an admin.',
        variant: 'destructive'
      });
      return false;
    }
  };

  // 取消收藏图片 - 修改为基于具体图片URL
  const unfavoriteImage = async (imageUrl: string) => {
    if (!user || !imageUrl) return false;

    const favoriteToRemove = favoriteImages.find(fav => fav.image_url === imageUrl);
    if (!favoriteToRemove) return false;

    const originalFavorites = [...favoriteImages];
    setFavoriteImages(prev => prev.filter(fav => fav.image_url !== imageUrl));

    try {
      const { error } = await supabase
        .from('favorite_images')
        .delete()
        .eq('user_id', user.id)
        .eq('image_url', imageUrl);

      if (error) throw error;

      toast({
        title: 'Image unfavorited',
        description: 'The image has been removed from your favorites.',
      });
      return true;
    } catch (error) {
      console.error('Error unfavoriting image:', error);
      
      setFavoriteImages(originalFavorites);

      toast({
        title: 'Failed to unfavorite',
        description: 'Could not remove the image from your favorites.',
        variant: 'destructive'
      });
      return false;
    }
  };

  // 检查图片是否已收藏 - 修改为基于具体图片URL
  const isImageFavorited = (imageUrl: string) => {
    const result = favoriteImages.some(fav => fav.image_url === imageUrl);
    console.log(`🔍 Checking favorited status for: ${imageUrl} = ${result}`);
    return result;
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
        title: 'Failed to load messages',
        description: 'Could not load messages for this conversation.',
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
  const createConversation = async (title: string = 'New Chat') => {
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
        title: 'Failed to create conversation',
        description: 'Could not create a new conversation.',
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
        title: 'Conversation deleted',
        description: 'The conversation has been successfully deleted.',
      });
      
      return true;
    } catch (error) {
      console.error('Error deleting conversation:', error);
      toast({
        title: 'Failed to delete',
        description: 'Could not delete the conversation.',
        variant: 'destructive'
      });
      return false;
    }
  };
  
  // 发送消息
  const sendMessage = async (content: string, imageUrls: string[] = [], targetConversation?: Conversation) => {
    const conversation = targetConversation || currentConversation;
    if (!conversation || !user) return null;

    const [firstImageUrl, ...additionalImageUrls] = imageUrls;

    const tempId = `temp_${Date.now()}`;
    const optimisticMessage: ChatMessage = {
      id: tempId,
      conversation_id: conversation.id,
      role: 'user',
      content,
      image_url: firstImageUrl,
      additional_image_urls: additionalImageUrls.length > 0 ? additionalImageUrls : [],
      created_at: new Date().toISOString(),
      status: 'sending',
    };

    setMessages(prev => [...prev, optimisticMessage]);

    if (firstImageUrl && !conversation.thumbnail_url) {
      const updatedConversation = { ...conversation, thumbnail_url: firstImageUrl };
      setCurrentConversation(updatedConversation);
      setConversations(prev => prev.map(c => c.id === conversation.id ? updatedConversation : c));
      updateConversationThumbnail(conversation.id, firstImageUrl);
    }
    
    try {
      const { data: dbMessage, error } = await supabase
        .from('chat_messages')
        .insert({
          conversation_id: conversation.id,
          role: 'user',
          content,
          image_url: firstImageUrl,
          additional_image_urls: additionalImageUrls.length > 0 ? additionalImageUrls : undefined,
        })
        .select()
        .single();

      if (error) throw error;
      
      setMessages(prev => prev.map(msg => msg.id === tempId ? { ...dbMessage, status: undefined } as ChatMessage : msg));

      return dbMessage as ChatMessage;
    } catch (error) {
      console.error('Error sending message:', error);
      setMessages(prev => prev.map(msg => msg.id === tempId ? { ...optimisticMessage, status: 'failed' } : msg));
      toast({
        title: 'Failed to send message',
        description: error instanceof Error ? error.message : 'The message could not be sent.',
        variant: 'destructive'
      });
      return null;
    }
  };

  // 添加AI回复
  const addAIResponse = async (content: string, imageUrl?: string) => {
    if (!currentConversation) return null;

    if (imageUrl && !currentConversation.thumbnail_url) {
      const updatedConversation = { ...currentConversation, thumbnail_url: imageUrl };
      setCurrentConversation(updatedConversation);
      setConversations(prev => prev.map(c => c.id === currentConversation.id ? updatedConversation : c));
      await updateConversationThumbnail(currentConversation.id, imageUrl);
    }

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

  const updateConversationThumbnail = async (conversationId: string, thumbnailUrl: string) => {
    try {
      const { data, error } = await supabase
        .from('conversations')
        .update({ thumbnail_url: thumbnailUrl } as any)
        .eq('id', conversationId)
        .select()
        .single();
      
      if (error) throw error;
      
      setConversations(prev => prev.map(c => c.id === conversationId ? c : c));
      if (currentConversation?.id === conversationId) {
        setCurrentConversation(data as Conversation);
      }
    } catch (error) {
      console.error('Error updating conversation thumbnail', error);
    }
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
    createConversation,
    selectConversation,
    deleteConversation,
    sendMessage,
    addAIResponse,
    addMessage,
    updateCurrentImage,
    favoriteImage,
    unfavoriteImage,
    isImageFavorited,
    loadConversations,
    updateConversationThumbnail,
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