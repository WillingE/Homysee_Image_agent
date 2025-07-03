import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Plus,
  MessageCircle,
  Image,
  Trash2,
  Edit,
  Clock,
  Sparkles
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface Conversation {
  id: string;
  title: string;
  lastMessage: string;
  timestamp: Date;
  imageCount: number;
  isActive?: boolean;
}

interface SidebarProps {
  className?: string;
}

const Sidebar = ({ className }: SidebarProps) => {
  const [conversations, setConversations] = useState<Conversation[]>([
    {
      id: '1',
      title: 'Beach Background Swap',
      lastMessage: 'Perfect! The sunset beach background looks amazing.',
      timestamp: new Date(Date.now() - 1000 * 60 * 30), // 30 minutes ago
      imageCount: 3,
      isActive: true
    },
    {
      id: '2',
      title: 'Product Photo Enhancement',
      lastMessage: 'Can you remove the background and add a white studio backdrop?',
      timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2), // 2 hours ago
      imageCount: 2
    },
    {
      id: '3',
      title: 'Portrait Touch-up',
      lastMessage: 'The skin smoothing effect is exactly what I needed.',
      timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24), // 1 day ago
      imageCount: 1
    },
    {
      id: '4',
      title: 'Logo Design Creation',
      lastMessage: 'Generate a modern logo for my tech startup.',
      timestamp: new Date(Date.now() - 1000 * 60 * 60 * 48), // 2 days ago
      imageCount: 5
    }
  ]);

  const handleNewConversation = () => {
    const newConv: Conversation = {
      id: Date.now().toString(),
      title: 'New Conversation',
      lastMessage: 'Start a new image editing session...',
      timestamp: new Date(),
      imageCount: 0
    };
    
    setConversations(prev => prev.map(c => ({ ...c, isActive: false })));
    setConversations(prev => [{ ...newConv, isActive: true }, ...prev]);
  };

  const handleSelectConversation = (id: string) => {
    setConversations(prev => 
      prev.map(c => ({ ...c, isActive: c.id === id }))
    );
  };

  const formatTimestamp = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
  };

  return (
    <Card className={cn('h-full bg-chat-surface border-message-border flex flex-col', className)}>
      {/* Header */}
      <div className="p-4 border-b border-message-border">
        <Button 
          onClick={handleNewConversation}
          className="w-full bg-gradient-to-r from-ai-primary to-ai-secondary hover:from-ai-primary-dark hover:to-ai-secondary/80"
        >
          <Plus className="w-4 h-4 mr-2" />
          New Chat
        </Button>
      </div>

      {/* Conversations List */}
      <ScrollArea className="flex-1">
        <div className="p-2 space-y-2">
          {conversations.map((conversation) => (
            <div
              key={conversation.id}
              onClick={() => handleSelectConversation(conversation.id)}
              className={cn(
                'group p-3 rounded-lg border cursor-pointer transition-all duration-200 hover:shadow-md',
                conversation.isActive 
                  ? 'bg-ai-primary/10 border-ai-primary/30 shadow-sm' 
                  : 'bg-agent-message border-message-border hover:border-ai-primary/20 hover:bg-ai-primary/5'
              )}
            >
              {/* Conversation Header */}
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1 min-w-0">
                  <h4 className={cn(
                    'text-sm font-medium truncate',
                    conversation.isActive ? 'text-ai-primary' : 'text-foreground'
                  )}>
                    {conversation.title}
                  </h4>
                </div>
                <div className="flex items-center gap-1 ml-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 hover:bg-ai-primary/20"
                    onClick={(e) => {
                      e.stopPropagation();
                      // Handle edit
                    }}
                  >
                    <Edit className="w-3 h-3" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 hover:bg-destructive/20 hover:text-destructive"
                    onClick={(e) => {
                      e.stopPropagation();
                      // Handle delete
                    }}
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              </div>

              {/* Last Message */}
              <p className="text-xs text-muted-foreground line-clamp-2 mb-2">
                {conversation.lastMessage}
              </p>

              {/* Metadata */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Clock className="w-3 h-3" />
                    {formatTimestamp(conversation.timestamp)}
                  </div>
                  {conversation.imageCount > 0 && (
                    <Badge variant="outline" className="text-xs h-5 px-1 border-ai-secondary/30 text-ai-secondary">
                      <Image className="w-2 h-2 mr-1" />
                      {conversation.imageCount}
                    </Badge>
                  )}
                </div>
                
                {conversation.isActive && (
                  <div className="flex items-center gap-1">
                    <Sparkles className="w-3 h-3 text-ai-primary animate-pulse" />
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>

      {/* Footer */}
      <div className="p-3 border-t border-message-border bg-gradient-to-r from-agent-message to-chat-surface">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <MessageCircle className="w-3 h-3" />
            <span>{conversations.length} conversations</span>
          </div>
          <Badge variant="outline" className="text-xs border-status-success/30 text-status-success">
            Synced
          </Badge>
        </div>
      </div>
    </Card>
  );
};

export default Sidebar;