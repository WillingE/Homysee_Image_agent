import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card } from '@/components/ui/card';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Send, Image, Upload, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import aiAvatar from '@/assets/ai-avatar.jpg';
import { useConversations } from '@/hooks/useConversations';
import { useImageUpload } from '@/hooks/useImageUpload';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface ChatWindowProps {
  className?: string;
}

const ChatWindow = ({ className }: ChatWindowProps) => {
  const { 
    currentConversation, 
    messages, 
    sendMessage, 
    addAIResponse,
    createConversation 
  } = useConversations();
  const { uploadImage } = useImageUpload();
  const { toast } = useToast();
  
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [processingTasks, setProcessingTasks] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || isLoading) return;
    
    let conversation = currentConversation;
    if (!conversation) {
      conversation = await createConversation('新对话');
      if (!conversation) return;
    }

    setIsLoading(true);
    const messageContent = inputMessage;
    setInputMessage('');

    try {
      // 发送用户消息
      const userMessage = await sendMessage(messageContent);
      if (!userMessage) throw new Error('Failed to send message');

      // 调用AI Agent
      const response = await supabase.functions.invoke('ai-chat-agent', {
        body: {
          conversationId: conversation.id,
          userMessage: messageContent
        }
      });

      if (response.error) {
        throw new Error(response.error.message || 'AI service error');
      }

      // 如果需要图片处理，开始轮询任务状态
      if (response.data?.requiresImageProcessing && response.data?.message?.image_url) {
        const taskId = response.data.message.image_url;
        setProcessingTasks(prev => new Set([...prev, taskId]));
        pollImageProcessingStatus(taskId);
      }

    } catch (error) {
      console.error('Error sending message:', error);
      toast({
        title: '发送失败',
        description: error instanceof Error ? error.message : '发送消息时出错',
        variant: 'destructive'
      });
      
      // 添加错误消息
      await addAIResponse('抱歉，我遇到了一些问题，请稍后再试。');
    } finally {
      setIsLoading(false);
    }
  };

  const pollImageProcessingStatus = async (taskId: string) => {
    const maxPolls = 60; // 最多轮询60次（5分钟）
    let pollCount = 0;

    const poll = async () => {
      try {
        const response = await supabase.functions.invoke('image-processing', {
          body: { task_id: taskId }
        });

        if (response.data?.status === 'completed') {
          setProcessingTasks(prev => {
            const newSet = new Set(prev);
            newSet.delete(taskId);
            return newSet;
          });
          
          toast({
            title: '图片处理完成',
            description: '您的图片已经处理完成！',
          });
          return;
        } else if (response.data?.status === 'failed') {
          setProcessingTasks(prev => {
            const newSet = new Set(prev);
            newSet.delete(taskId);
            return newSet;
          });
          
          toast({
            title: '图片处理失败',
            description: '图片处理时出错，请重试',
            variant: 'destructive'
          });
          return;
        }

        // 继续轮询
        pollCount++;
        if (pollCount < maxPolls) {
          setTimeout(poll, 5000); // 每5秒轮询一次
        } else {
          setProcessingTasks(prev => {
            const newSet = new Set(prev);
            newSet.delete(taskId);
            return newSet;
          });
        }
      } catch (error) {
        console.error('Error polling task status:', error);
        setProcessingTasks(prev => {
          const newSet = new Set(prev);
          newSet.delete(taskId);
          return newSet;
        });
      }
    };

    poll();
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      console.log('No file selected');
      return;
    }

    console.log('Image upload started for file:', file.name);

    let conversation = currentConversation;
    if (!conversation) {
      console.log('Creating new conversation for image upload');
      conversation = await createConversation('图片编辑');
      if (!conversation) {
        console.error('Failed to create conversation');
        return;
      }
    }

    try {
      setIsLoading(true);
      
      // 上传图片到 Supabase Storage
      console.log('Uploading image to storage...');
      const imageUrl = await uploadImage(file);
      
      if (!imageUrl) {
        throw new Error('图片上传失败，未获得有效URL');
      }

      console.log('Image uploaded successfully, URL:', imageUrl);
      
      // 发送带图片的消息
      console.log('Sending message with image...');
      const userMessage = await sendMessage('我上传了一张图片，请帮我分析一下', imageUrl);
      
      if (!userMessage) {
        throw new Error('消息发送失败');
      }

      console.log('Message sent successfully, calling AI agent...');
      
      // 调用AI分析图片
      const response = await supabase.functions.invoke('ai-chat-agent', {
        body: {
          conversationId: conversation.id,
          userMessage: '我上传了一张图片，请帮我分析一下可以做什么编辑',
          imageUrl
        }
      });

      console.log('AI agent response:', response);

      if (response.error) {
        console.error('AI agent error:', response.error);
        throw new Error(response.error.message || 'AI service error');
      }

    } catch (error) {
      console.error('Error in handleImageUpload:', error);
      toast({
        title: '上传失败',
        description: error instanceof Error ? error.message : '图片上传时出错',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className={cn('flex flex-col h-full bg-chat-surface border-message-border', className)}>
      {/* Chat Header */}
      <div className="flex items-center justify-between p-4 border-b border-message-border bg-gradient-to-r from-ai-primary/10 to-ai-secondary/10">
        <div className="flex items-center gap-3">
          <Avatar className="w-10 h-10 ring-2 ring-ai-primary/30">
            <AvatarImage src={aiAvatar} alt="AI Assistant" />
            <AvatarFallback className="bg-ai-primary text-primary-foreground">AI</AvatarFallback>
          </Avatar>
          <div>
            <h3 className="font-semibold text-foreground">AI Image Assistant</h3>
            <p className="text-sm text-muted-foreground">Powered by Flux-Kontext-Pro</p>
          </div>
        </div>
        <Badge variant="secondary" className="bg-ai-primary/20 text-ai-primary border-ai-primary/30">
          <Sparkles className="w-3 h-3 mr-1" />
          Online
        </Badge>
      </div>

      {/* Messages Area */}
      <ScrollArea className="flex-1 p-4" ref={scrollAreaRef}>
        <div className="space-y-4">
          {!currentConversation ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>创建新对话开始聊天</p>
            </div>
          ) : messages.length === 0 ? (
            <div className="flex gap-3 animate-fade-in">
              <Avatar className="w-8 h-8 mt-1">
                <AvatarImage src={aiAvatar} alt="AI" />
                <AvatarFallback className="bg-ai-primary text-primary-foreground text-xs">AI</AvatarFallback>
              </Avatar>
              <div className="bg-agent-message border border-message-border rounded-lg px-4 py-2 max-w-[80%]">
                <p className="text-sm leading-relaxed">
                  你好！我是您的AI图片编辑助手。我可以帮助您进行背景更换、物体移除、添加元素等操作。上传图片或描述您想要的效果！
                </p>
              </div>
            </div>
          ) : (
            messages.map((message) => (
              <div
                key={message.id}
                className={cn(
                  'flex gap-3 animate-fade-in',
                  message.role === 'user' ? 'justify-end' : 'justify-start'
                )}
              >
                {message.role === 'assistant' && (
                  <Avatar className="w-8 h-8 mt-1">
                    <AvatarImage src={aiAvatar} alt="AI" />
                    <AvatarFallback className="bg-ai-primary text-primary-foreground text-xs">AI</AvatarFallback>
                  </Avatar>
                )}
                
                <div
                  className={cn(
                    'max-w-[80%] rounded-lg px-4 py-2 shadow-md',
                    message.role === 'user'
                      ? 'bg-user-message text-primary-foreground'
                      : 'bg-agent-message border border-message-border'
                  )}
                >
                  {message.image_url && (
                    <div className="mb-2">
                      <img 
                        src={message.image_url} 
                        alt="Uploaded" 
                        className="max-w-full h-auto rounded-lg"
                      />
                    </div>
                  )}
                  <p className="text-sm leading-relaxed">{message.content}</p>
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-xs text-muted-foreground">
                      {new Date(message.created_at).toLocaleTimeString()}
                    </span>
                    {processingTasks.has(message.image_url || '') && (
                      <Badge variant="outline" className="text-xs animate-pulse">
                        处理中...
                      </Badge>
                    )}
                  </div>
                </div>

                {message.role === 'user' && (
                  <Avatar className="w-8 h-8 mt-1">
                    <AvatarFallback className="bg-secondary text-secondary-foreground text-xs">U</AvatarFallback>
                  </Avatar>
                )}
              </div>
            ))
          )}
          
          {isLoading && (
            <div className="flex gap-3 animate-fade-in">
              <Avatar className="w-8 h-8 mt-1">
                <AvatarImage src={aiAvatar} alt="AI" />
                <AvatarFallback className="bg-ai-primary text-primary-foreground text-xs">AI</AvatarFallback>
              </Avatar>
              <div className="bg-agent-message border border-message-border rounded-lg px-4 py-2 max-w-[80%]">
                <div className="flex items-center gap-2">
                  <div className="flex gap-1">
                    <div className="w-2 h-2 bg-ai-primary rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-ai-primary rounded-full animate-bounce [animation-delay:0.1s]"></div>
                    <div className="w-2 h-2 bg-ai-primary rounded-full animate-bounce [animation-delay:0.2s]"></div>
                  </div>
                  <span className="text-sm text-muted-foreground">AI正在思考...</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Input Area */}
      <div className="p-4 border-t border-message-border bg-gradient-to-r from-chat-surface to-agent-message">
        <div className="flex gap-2">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleImageUpload}
            accept="image/*"
            className="hidden"
          />
          <Button
            variant="outline"
            size="icon"
            onClick={() => fileInputRef.current?.click()}
            className="shrink-0 border-message-border hover:bg-ai-primary/20 hover:border-ai-primary/30"
          >
            <Upload className="w-4 h-4" />
          </Button>
          
          <div className="flex-1 relative">
            <Input
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="描述您的图片编辑需求..."
              className="pr-12 bg-input border-message-border focus:border-ai-primary/50 focus:ring-ai-primary/30"
              disabled={isLoading || !currentConversation}
            />
            <Button
              onClick={handleSendMessage}
              disabled={!inputMessage.trim() || isLoading || !currentConversation}
              size="icon"
              className="absolute right-1 top-1 h-8 w-8 bg-ai-primary hover:bg-ai-primary-dark"
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </div>
        
        <div className="flex gap-2 mt-2">
          <Button 
            variant="ghost" 
            size="sm" 
            className="text-xs text-muted-foreground hover:text-ai-primary"
            onClick={() => setInputMessage('更换背景')}
          >
            <Image className="w-3 h-3 mr-1" />
            更换背景
          </Button>
          <Button 
            variant="ghost" 
            size="sm" 
            className="text-xs text-muted-foreground hover:text-ai-primary"
            onClick={() => setInputMessage('移除物体')}
          >
            移除物体
          </Button>
          <Button 
            variant="ghost" 
            size="sm" 
            className="text-xs text-muted-foreground hover:text-ai-primary"
            onClick={() => setInputMessage('添加元素')}
          >
            添加元素
          </Button>
        </div>
      </div>
    </Card>
  );
};

export default ChatWindow;