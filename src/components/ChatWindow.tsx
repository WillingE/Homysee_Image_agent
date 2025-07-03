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

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  imageUrl?: string;
  timestamp: Date;
  status?: 'processing' | 'completed' | 'error';
}

interface ChatWindowProps {
  className?: string;
}

const ChatWindow = ({ className }: ChatWindowProps) => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'assistant',
      content: "Hello! I'm your AI image editing assistant. I can help you with background changes, object removal, adding elements, and creating custom designs. Upload an image or describe what you'd like to create!",
      timestamp: new Date(),
      status: 'completed'
    }
  ]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: inputMessage,
      timestamp: new Date(),
      status: 'completed'
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsLoading(true);

    // Simulate AI response
    setTimeout(() => {
      const aiResponse: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: "I understand you'd like to edit an image. Could you please upload the image you'd like me to work with? Once uploaded, I can help you with various modifications like changing backgrounds, adding objects, or creating artistic effects.",
        timestamp: new Date(),
        status: 'completed'
      };
      setMessages(prev => [...prev, aiResponse]);
      setIsLoading(false);
    }, 2000);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const imageUrl = URL.createObjectURL(file);
      const imageMessage: Message = {
        id: Date.now().toString(),
        role: 'user',
        content: 'Uploaded an image for editing',
        imageUrl,
        timestamp: new Date(),
        status: 'completed'
      };
      setMessages(prev => [...prev, imageMessage]);
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
          {messages.map((message) => (
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
                {message.imageUrl && (
                  <div className="mb-2">
                    <img 
                      src={message.imageUrl} 
                      alt="Uploaded" 
                      className="max-w-full h-auto rounded-lg"
                    />
                  </div>
                )}
                <p className="text-sm leading-relaxed">{message.content}</p>
                <div className="flex items-center justify-between mt-2">
                  <span className="text-xs text-muted-foreground">
                    {message.timestamp.toLocaleTimeString()}
                  </span>
                  {message.status === 'processing' && (
                    <Badge variant="outline" className="text-xs">
                      Processing...
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
          ))}
          
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
              placeholder="Describe your image editing request..."
              className="pr-12 bg-input border-message-border focus:border-ai-primary/50 focus:ring-ai-primary/30"
              disabled={isLoading}
            />
            <Button
              onClick={handleSendMessage}
              disabled={!inputMessage.trim() || isLoading}
              size="icon"
              className="absolute right-1 top-1 h-8 w-8 bg-ai-primary hover:bg-ai-primary-dark"
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </div>
        
        <div className="flex gap-2 mt-2">
          <Button variant="ghost" size="sm" className="text-xs text-muted-foreground hover:text-ai-primary">
            <Image className="w-3 h-3 mr-1" />
            Change Background
          </Button>
          <Button variant="ghost" size="sm" className="text-xs text-muted-foreground hover:text-ai-primary">
            Remove Object
          </Button>
          <Button variant="ghost" size="sm" className="text-xs text-muted-foreground hover:text-ai-primary">
            Add Elements
          </Button>
        </div>
      </div>
    </Card>
  );
};

export default ChatWindow;