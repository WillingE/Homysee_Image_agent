import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card } from '@/components/ui/card';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Send, Image, Upload, Sparkles, Heart, HeartHandshake, X, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import aiAvatar from '@/assets/ai-avatar.jpg';
import { useConversations, ChatMessage } from '@/hooks/useConversations';
import { useImageUpload } from '@/hooks/useImageUpload';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import ImageModal from '@/components/ui/image-modal';

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
    isImageFavorited
  } = useConversations();
  const { uploadImage } = useImageUpload();
  const { toast } = useToast();
  
  const [inputMessage, setInputMessage] = useState('');
  const [stagedFiles, setStagedFiles] = useState<File[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [isImageModalOpen, setIsImageModalOpen] = useState(false);
  const [currentModalImage, setCurrentModalImage] = useState<string>('');
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight;
    }
  }, [messages]);

  const handleFavoriteClick = async (message: any, imageUrl: string) => {
    if (isImageFavorited(imageUrl)) {
      await unfavoriteImage(imageUrl);
    } else {
      await favoriteImage(message, imageUrl);
    }
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
    if (!files) return;
    
    setStagedFiles(prev => [...prev, ...Array.from(files)]);
    
    if (event.target) {
      event.target.value = '';
    }
  };

  const handleRemoveStagedImage = (indexToRemove: number) => {
    setStagedFiles(prev => prev.filter((_, index) => index !== indexToRemove));
  };

  const handleImageClick = (imageUrl: string, messageId: string) => {
    // Open modal for large view
    setCurrentModalImage(imageUrl);
    setIsImageModalOpen(true);
    
    // Also update the right preview area
    updateCurrentImage(imageUrl, messageId);
  };

  const closeImageModal = () => {
    setIsImageModalOpen(false);
    setCurrentModalImage('');
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
              <p>Start a new conversation to begin</p>
            </div>
          ) : messages.length === 0 ? (
            <div className="flex gap-3 animate-fade-in">
              <Avatar className="w-8 h-8 mt-1">
                <AvatarImage src={aiAvatar} alt="AI" />
                <AvatarFallback className="bg-ai-primary text-primary-foreground text-xs">AI</AvatarFallback>
              </Avatar>
              <div className="bg-agent-message border border-message-border rounded-lg px-4 py-2 max-w-[80%]">
                <p className="text-sm leading-relaxed">
                  Hi! I'm your AI image assistant. I can help with background changes, object removal, and more. Upload an image or describe what you'd like to do!
                </p>
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
                  {allImageUrls.length > 0 && (
                    <div className="mb-2 relative group grid gap-2" style={{ gridTemplateColumns: `repeat(auto-fill, minmax(120px, 1fr))` }}>
                      {allImageUrls.map((url, index) => (
                        <div key={index} className="aspect-square bg-agent-message rounded-lg border border-message-border overflow-hidden relative group/image">
                          <img 
                            src={url} 
                            alt={`Uploaded ${index + 1}`}
                            className="w-full h-full object-cover cursor-pointer hover:opacity-80 transition-opacity"
                            onClick={() => handleImageClick(url, message.id)}
                            title="Click to view large image"
                          />
                           <div className="absolute top-1 right-1 opacity-0 group-hover/image:opacity-100 transition-opacity">
                            <Button
                              variant="ghost"
                              size="sm"
                              className={cn(
                                "h-7 w-7 p-0 rounded-full shadow-md backdrop-blur-sm",
                                isImageFavorited(url) 
                                  ? "bg-red-500/20 hover:bg-red-500/30 text-red-500" 
                                  : "bg-white/20 hover:bg-white/30 text-white border border-white/50"
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
                  <p className="text-sm leading-relaxed">{message.content}</p>
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-xs text-muted-foreground">
                      {new Date(message.created_at).toLocaleTimeString()}
                    </span>
                  </div>
                </div>

                {message.role === 'user' && (
                  <Avatar className="w-8 h-8 mt-1">
                    <AvatarFallback className="bg-secondary text-secondary-foreground text-xs">U</AvatarFallback>
                  </Avatar>
                )}
              </div>
            )})
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
                  <span className="text-sm text-muted-foreground">AI is thinking...</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Input Area */}
      <div className="p-4 border-t border-message-border bg-gradient-to-r from-chat-surface to-agent-message">
        {stagedFiles.length > 0 && (
          <div className="mb-2 p-2 border-b border-message-border">
              <div className="flex gap-2 pb-2">
                {stagedFiles.map((file, index) => (
                  <StagedImagePreview key={index} file={file} onRemove={() => handleRemoveStagedImage(index)} />
                ))}
              </div>
          </div>
        )}
        <div className="flex gap-2">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleImageUpload}
            accept="image/*"
            className="hidden"
            multiple
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
              id="chat-input"
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Describe your image editing needs..."
              className="pr-12 bg-input border-message-border focus:border-ai-primary/50 focus:ring-ai-primary/30"
            />
            <Button
              onClick={handleSendMessage}
              disabled={(!inputMessage.trim() && stagedFiles.length === 0) || isSending || isLoading}
              size="icon"
              className="absolute right-1 top-1 h-8 w-8 bg-ai-primary hover:bg-ai-primary-dark"
            >
              {isSending || isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            </Button>
          </div>
        </div>
        
        <div className="flex gap-2 mt-2">
          <Button 
            variant="ghost" 
            size="sm" 
            className="text-xs text-muted-foreground hover:text-ai-primary"
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
            className="text-xs text-muted-foreground hover:text-ai-primary"
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
            className="text-xs text-muted-foreground hover:text-ai-primary"
            onClick={() => {
              setInputMessage('Add element: ');
              document.getElementById('chat-input')?.focus();
            }}
          >
            Add Element
          </Button>
        </div>
      </div>

      {/* Image Modal */}
      <ImageModal
        isOpen={isImageModalOpen}
        onClose={closeImageModal}
        imageUrl={currentModalImage}
        alt="Large image view"
      />
    </Card>
  );
};

export default ChatWindow;