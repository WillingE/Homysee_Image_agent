import React, { useState, useRef, useEffect, ElementRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card } from '@/components/ui/card';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Send, Image, Upload, Sparkles, Heart, HeartHandshake, X, Loader2, Edit } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import aiAvatar from '@/assets/ai-avatar.jpg';
import { useConversations, ChatMessage } from '@/hooks/useConversations';
import { useImageUpload } from '@/hooks/useImageUpload';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import ImageModal from '@/components/ui/image-modal';
import ImageEditor from '@/components/ImageEditor';

interface StagedImagePreviewProps {
  file: File;
  onRemove: () => void;
}

const StagedImagePreview = ({ file, onRemove }: StagedImagePreviewProps) => {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  if (!previewUrl) return null;

  return (
    <div className="relative group flex-shrink-0">
      <img src={previewUrl} alt={file.name} className="w-16 h-16 rounded-md object-cover" />
      <Button
        variant="ghost"
        size="icon"
        className="absolute -top-2 -right-2 w-5 h-5 rounded-full opacity-100 group-hover:opacity-100 bg-black/50 hover:bg-black/70 text-white"
        onClick={onRemove}
      >
        <X className="w-3 h-3" />
      </Button>
    </div>
  );
};

interface ChatWindowProps {
  className?: string;
}

const ChatWindow = ({ className }: ChatWindowProps) => {
  const { 
    currentConversation, 
    messages, 
    sendMessage, 
    addAIResponse,
    createConversation,
    addMessage,
    updateCurrentImage,
    favoriteImage,
    unfavoriteImage,
    isImageFavorited,
    loading
  } = useConversations();
  const { uploadImage } = useImageUpload();
  const { toast } = useToast();
  
  const [inputMessage, setInputMessage] = useState('');
  const [stagedFiles, setStagedFiles] = useState<File[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [isImageModalOpen, setIsImageModalOpen] = useState(false);
  const [currentModalImage, setCurrentModalImage] = useState<string>('');
  const [isImageEditorOpen, setIsImageEditorOpen] = useState(false);
  const [currentEditImage, setCurrentEditImage] = useState<string>('');
  const [currentEditPrompt, setCurrentEditPrompt] = useState<string>('');
  const scrollAreaRef = useRef<ElementRef<typeof ScrollArea>>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const viewport = scrollAreaRef.current?.querySelector('div[data-radix-scroll-area-viewport]');
    if (viewport) {
      setTimeout(() => {
        viewport.scrollTo({ top: viewport.scrollHeight, behavior: 'smooth' });
      }, 100);
    }
  }, [messages]);

  const handleFavoriteClick = async (message: any, imageUrl: string) => {
    if (isImageFavorited(imageUrl)) {
      await unfavoriteImage(imageUrl);
    } else {
      await favoriteImage(message, imageUrl);
    }
  };

  const handleRetryMessage = async (message: ChatMessage) => {
    if (message.status !== 'failed') return;
    
    // 重新发送失败的消息
    const imageUrls = [
      ...(message.image_url ? [message.image_url] : []),
      ...(message.additional_image_urls || [])
    ];
    
    // 先设置输入内容，然后触发发送
    setInputMessage(message.content);
    setStagedFiles([]); // 清空暂存文件，因为图片已经上传过了
    
    // 延迟一下再发送，让UI更新
    setTimeout(() => {
      handleSendMessage();
    }, 100);
  };

  const handleSendMessage = async () => {
    if ((!inputMessage.trim() && stagedFiles.length === 0) || isSending || isLoading) return;
    
    let conversation = currentConversation;
    if (!conversation) {
      const newTitle = inputMessage.trim().substring(0, 30) || 'Image Analysis';
      conversation = await createConversation(newTitle);
      if (!conversation) return;
    }

    setIsSending(true);

    const messageContent = inputMessage;
    const filesToUpload = stagedFiles;
    setInputMessage('');
    setStagedFiles([]);
    
    let messageSent = false;
    try {
      let uploadedImageUrls: string[] = [];
      if (filesToUpload.length > 0) {
        const uploadPromises = filesToUpload.map(file => uploadImage(file));
        const results = await Promise.all(uploadPromises);
        uploadedImageUrls = results.filter((url): url is string => !!url);

        if (uploadedImageUrls.length !== filesToUpload.length) {
          toast({
            title: 'Some images failed to upload',
            description: 'Not all images were uploaded successfully, please try again.',
            variant: 'destructive',
          });
        }
      }

      if (uploadedImageUrls.length === 0 && !messageContent.trim()) {
        throw new Error("No content to send.");
      }

      const userMessage = await sendMessage(messageContent, uploadedImageUrls, conversation);
      if (!userMessage) throw new Error('Failed to send message');
      
      messageSent = true;
      setIsLoading(true);

      const response = await supabase.functions.invoke('ai-chat-agent', {
        body: {
          conversationId: conversation.id,
          userMessage: messageContent || `Uploaded ${uploadedImageUrls.length} image(s)`,
          imageUrl: uploadedImageUrls[0]
        }
      });

      if (response.error) {
        throw new Error(response.error.message || 'AI service error');
      }

      if (response.data.message) {
        addMessage(response.data.message);
      }

    } catch (error) {
      console.error('Error sending message:', error);
      toast({
        title: 'Failed to send',
        description: error instanceof Error ? error.message : 'An error occurred while sending the message.',
        variant: 'destructive'
      });

      if (!messageSent) {
        setInputMessage(messageContent);
        setStagedFiles(filesToUpload);
      }
    } finally {
      setIsSending(false);
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;
    
    setStagedFiles([files[0]]);
    
    if (event.target) {
      event.target.value = '';
    }
  };

  const handleRemoveStagedImage = () => {
    setStagedFiles([]);
  };

  const handleImageClick = (imageUrl: string, messageId: string) => {
    // Open modal for large view
    setCurrentModalImage(imageUrl);
    setIsImageModalOpen(true);
    
    // Also update the right preview area
    updateCurrentImage(imageUrl, messageId);
  };

  const handleImageEdit = (imageUrl: string, messageContent: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentEditImage(imageUrl);
    setCurrentEditPrompt(messageContent);
    setIsImageEditorOpen(true);
  };

  const handleApplyImageEdit = async (transform: any, editedPrompt: string) => {
    if (!currentConversation) return;
    
    setIsLoading(true);
    try {
      const response = await supabase.functions.invoke('image-processing', {
        body: {
          original_image_url: currentEditImage,
          prompt: editedPrompt,
          conversation_id: currentConversation.id,
          user_id: currentConversation.user_id,
          transform_params: transform
        }
      });

      if (response.error) {
        throw new Error(response.error.message || 'Image processing failed');
      }

      // Add the processed image as a new message
      if (response.data.processed_image_url) {
        await addAIResponse(
          `I've adjusted the product position and size as requested.`,
          response.data.processed_image_url
        );
      }
    } catch (error) {
      console.error('Error processing image edit:', error);
      toast({
        title: 'Failed to process image',
        description: error instanceof Error ? error.message : 'An error occurred during image processing.',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const closeImageModal = () => {
    setIsImageModalOpen(false);
    setCurrentModalImage('');
  };

  return (
    <div className={cn('flex flex-col h-full bg-background', className)}>
      {/* Messages */}
      <ScrollArea ref={scrollAreaRef} className="flex-1 p-4">
        <div className="space-y-4 pb-4">
          {!currentConversation ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>Start a new conversation to begin</p>
            </div>
          ) : loading ? (
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="flex flex-col gap-2">
                  {/* 用户消息骨架屏 */}
                  <div className="flex justify-end">
                    <div className="max-w-[80%] rounded-lg p-4 bg-secondary/50 animate-pulse">
                      <Skeleton className="h-4 w-48 bg-secondary" />
                    </div>
                  </div>
                  {/* AI回复骨架屏 */}
                  <div className="flex justify-start">
                    <div className="max-w-[320px] space-y-2 animate-pulse">
                      <Skeleton className="h-48 w-full rounded-2xl bg-secondary" />
                      <Skeleton className="h-4 w-3/4 bg-secondary" />
                      <Skeleton className="h-4 w-1/2 bg-secondary" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : messages.length === 0 ? (
            <div className="flex gap-3 animate-fade-in">
              <div className="text-sm leading-relaxed text-foreground">
                Hi! I'm your AI image assistant. I can help with background changes, object removal, and more. Upload an image or describe what you'd like to do!
              </div>
            </div>
          ) : (
            messages.map((message) => {
              const allImageUrls = [
                ...(message.image_url ? [message.image_url] : []),
                ...(message.additional_image_urls || [])
              ];

              return (
              <div
                key={message.id}
                className={cn(
                  'flex flex-col gap-1',
                  message.role === 'user' ? 'items-end' : 'items-start'
                )}
              >
                {/* 用户图片单独渲染，右对齐 */}
                {message.role === 'user' && allImageUrls.length > 0 && (
                  <div className="flex gap-2 justify-end mb-2">
                    {allImageUrls.map((url, index) => (
                      <div
                        key={index}
                        className="aspect-square overflow-hidden relative group/image flex-shrink-0 w-[120px] h-[120px] bg-transparent border-none rounded-none"
                        style={{ background: 'none', border: 'none', borderRadius: 0 }}
                      >
                        <img 
                          src={url} 
                          alt={`Uploaded ${index + 1}`}
                          className="w-full h-full object-cover cursor-pointer hover:opacity-80 transition-opacity"
                          onClick={() => handleImageClick(url, message.id)}
                          title="Click to view large image"
                        />
                      </div>
                    ))}
                  </div>
                )}
                {/* 用户文字单独渲染，右对齐，带圆角气泡 */}
                {message.role === 'user' && message.content && (
                  <div className={cn(
                    "max-w-[80%] rounded-lg px-4 py-2 text-foreground shadow-none relative",
                    message.status === 'sending' ? 'bg-secondary/70' : 'bg-secondary'
                  )}>
                    <p className="text-sm leading-relaxed text-foreground">{message.content}</p>
                    {/* 发送状态指示器 */}
                    {message.status === 'sending' && (
                      <div className="absolute -bottom-1 -right-1 flex items-center gap-1 bg-background border border-border rounded-full px-2 py-1">
                        <Loader2 className="w-3 h-3 animate-spin text-primary" />
                        <span className="text-xs text-muted-foreground">发送中</span>
                      </div>
                    )}
                    {message.status === 'failed' && (
                      <div className="absolute -bottom-1 -right-1 flex items-center gap-1 bg-destructive/10 border border-destructive/20 rounded-full px-2 py-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-auto w-auto p-0 text-destructive hover:text-destructive/80"
                          onClick={() => handleRetryMessage(message)}
                          title="重试发送"
                        >
                          <X className="w-3 h-3" />
                        </Button>
                        <span className="text-xs text-destructive">失败</span>
                      </div>
                    )}
                  </div>
                )}
                {/* AI消息和图片美化展示 */}
                {message.role !== 'user' && allImageUrls.length > 0 ? (
                  <div className="flex flex-col items-start w-full mb-8">
                    {/* 大图展示 */}
                    <div className="w-full flex justify-start">
                      <div className="relative max-w-[320px] w-full">
                        <img
                          src={allImageUrls[0]}
                          alt="AI生成图片"
                          className="w-full rounded-2xl object-cover"
                          style={{ background: '#fff' }}
                          onClick={() => handleImageClick(allImageUrls[0], message.id)}
                        />
                        {/* 收藏按钮 */}
                        <div className="absolute top-2 right-2 z-10">
                          <Button
                            variant="ghost"
                            size="icon"
                            className={cn(
                              'rounded-full bg-white/80 hover:bg-white/90 border border-border shadow',
                              isImageFavorited(allImageUrls[0]) ? 'text-destructive' : 'text-muted-foreground'
                            )}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleFavoriteClick(message, allImageUrls[0]);
                            }}
                            title={isImageFavorited(allImageUrls[0]) ? '取消收藏' : '收藏'}
                          >
                            <Heart className={cn('w-5 h-5', isImageFavorited(allImageUrls[0]) ? 'fill-current' : '')} />
                          </Button>
                        </div>
                      </div>
                    </div>
                    {/* 文字描述 */}
                    {message.content && (
                      <div className="w-full text-base text-foreground text-left mt-2">{message.content}</div>
                    )}
                  </div>
                ) : message.role !== 'user' && (
                  <div className="flex flex-col items-start">
                    {allImageUrls.length > 0 && (
                      <div className="mb-2 relative group grid gap-2" style={{ gridTemplateColumns: `repeat(auto-fill, minmax(120px, 1fr))` }}>
                        {allImageUrls.map((url, index) => (
                          <div key={index} className="aspect-square bg-secondary rounded-lg border border-border overflow-hidden relative group/image w-[120px] h-[120px]">
                            <img 
                              src={url} 
                              alt={`Uploaded ${index + 1}`}
                              className="w-full h-full object-cover cursor-pointer hover:opacity-80 transition-opacity"
                              onClick={() => handleImageClick(url, message.id)}
                              title="Click to view large image"
                            />
                            <div className="absolute top-1 right-1 opacity-0 group-hover/image:opacity-100 transition-opacity flex gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 w-7 p-0 rounded-full shadow-md backdrop-blur-sm bg-primary/20 hover:bg-primary/30 text-primary border border-primary/50"
                                onClick={(e) => handleImageEdit(url, message.content, e)}
                                title="Edit position and size"
                              >
                                <Edit className="w-3 h-3" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className={cn(
                                  "h-7 w-7 p-0 rounded-full shadow-md backdrop-blur-sm",
                                  isImageFavorited(url) 
                                    ? "bg-destructive/20 hover:bg-destructive/30 text-destructive"
                                    : "bg-foreground/20 hover:bg-foreground/30 text-foreground border border-foreground/50"
                                )}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleFavoriteClick(message, url);
                                }}
                                title={isImageFavorited(url) ? "Unfavorite" : "Favorite"}
                              >
                                {isImageFavorited(url) ? (
                                  <Heart className="w-4 h-4 fill-current" />
                                ) : (
                                  <Heart className="w-4 h-4" />
                                )}
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                    {message.content && (
                      <div className="max-w-[80%] px-0 py-0 bg-transparent border-none shadow-none text-foreground">
                        <p className="text-sm leading-relaxed text-foreground">{message.content}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )})
          )}
          
          {isLoading && (
            <div className="flex gap-3 animate-fade-in">
              <div className="px-0 py-0 bg-transparent border-none shadow-none text-foreground">
                <div className="flex items-center gap-2">
                  <div className="flex gap-1">
                    <div className="w-2 h-2 bg-primary rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-primary rounded-full animate-bounce [animation-delay:0.1s]"></div>
                    <div className="w-2 h-2 bg-primary rounded-full animate-bounce [animation-delay:0.2s]"></div>
                  </div>
                  <span className="text-sm text-muted-foreground">AI is thinking...</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Input Area */}
      <div className="p-4 bg-background flex justify-center">
        <div className="w-full max-w-3xl">
          {stagedFiles.length > 0 && (
            <div className="mb-3 p-3 border border-border rounded-lg bg-secondary/50">
              <div className="flex gap-2">
                {stagedFiles.map((file, index) => (
                  <StagedImagePreview key={index} file={file} onRemove={handleRemoveStagedImage} />
                ))}
              </div>
            </div>
          )}
          
          <div className="space-y-3">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleImageUpload}
              accept="image/*"
              className="hidden"
            />
            
            <div className="relative">
              <Input
                id="chat-input"
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Describe your image editing needs..."
                className="bg-background border border-border focus:border-primary/50 focus:ring-primary/30 rounded-xl py-3 px-4 min-h-[48px]"
              />
            </div>
            
            <div className="flex justify-between items-center">
              <Button
                variant="outline"
                size="icon"
                onClick={() => fileInputRef.current?.click()}
                className="shrink-0 border-border hover:bg-primary/20 hover:border-primary/30"
              >
                <Upload className="w-4 h-4" />
              </Button>
              
              <Button
                onClick={handleSendMessage}
                disabled={(!inputMessage.trim() && stagedFiles.length === 0) || isSending || isLoading}
                size="icon"
                className="h-8 w-8 bg-primary hover:bg-primary/90 rounded-lg"
              >
                {isSending || isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              </Button>
            </div>
          </div>
          
          <div className="flex gap-2 mt-3 justify-center">
            <Button 
              variant="ghost" 
              size="sm" 
              className="text-xs text-muted-foreground hover:text-primary rounded-full"
              onClick={() => {
                setInputMessage('Change background to: ');
                document.getElementById('chat-input')?.focus();
              }}
            >
              <Image className="w-3 h-3 mr-1" />
              Change BG
            </Button>
            <Button 
              variant="ghost" 
              size="sm" 
              className="text-xs text-muted-foreground hover:text-primary rounded-full"
              onClick={() => {
                setInputMessage('Remove object: ');
                document.getElementById('chat-input')?.focus();
              }}
            >
              Remove Object
            </Button>
            <Button 
              variant="ghost" 
              size="sm" 
              className="text-xs text-muted-foreground hover:text-primary rounded-full"
              onClick={() => {
                setInputMessage('Add element: ');
                document.getElementById('chat-input')?.focus();
              }}
            >
              Add Element
            </Button>
          </div>
        </div>
      </div>

      {/* Image Modal */}
      <ImageModal
        isOpen={isImageModalOpen}
        onClose={closeImageModal}
        imageUrl={currentModalImage}
        alt="Large image view"
      />

      {/* Image Editor */}
      <ImageEditor
        isOpen={isImageEditorOpen}
        onClose={() => setIsImageEditorOpen(false)}
        imageUrl={currentEditImage}
        onApply={handleApplyImageEdit}
        originalPrompt={currentEditPrompt}
      />
    </div>
  );
};

export default ChatWindow;