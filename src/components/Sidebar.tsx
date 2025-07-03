import React from 'react';
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
import { useConversations } from '@/hooks/useConversations';

interface SidebarProps {
  className?: string;
}

const Sidebar = ({ className }: SidebarProps) => {
  const { 
    conversations, 
    currentConversation, 
    createConversation, 
    selectConversation,
    deleteConversation,
    loading 
  } = useConversations();

  const formatTimestamp = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (minutes < 1) return `just now`;
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
  };

  const handleDeleteConversation = async (conversationId: string) => {
    await deleteConversation(conversationId);
  };

  return (
    <Card className={cn('h-full bg-chat-surface border-message-border flex flex-col', className)}>
      {/* Header */}
      <div className="p-4 border-b border-message-border">
        <Button 
          onClick={() => createConversation()}
          className="w-full bg-gradient-to-r from-ai-primary to-ai-secondary hover:from-ai-primary-dark hover:to-ai-secondary/80"
        >
          <Plus className="w-4 h-4 mr-2" />
          New Chat
        </Button>
      </div>

      {/* Conversations List */}
      <ScrollArea className="flex-1">
        <div className="p-2 space-y-2">
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">
              Loading...
            </div>
          ) : conversations.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No conversations
            </div>
          ) : (
            conversations.map((conversation) => (
              <div
                key={conversation.id}
                onClick={() => selectConversation(conversation)}
                className={cn(
                  'group relative p-3 rounded-lg border cursor-pointer transition-all duration-200 flex items-center gap-3',
                  currentConversation?.id === conversation.id
                    ? 'bg-ai-primary/10 border-ai-primary/30 shadow-sm' 
                    : 'bg-agent-message border-message-border hover:border-ai-primary/20 hover:bg-ai-primary/5'
                )}
              >
                {/* Thumbnail */}
                {conversation.thumbnail_url ? (
                  <img src={conversation.thumbnail_url} alt={conversation.title} className="w-10 h-10 rounded-md object-cover flex-shrink-0 bg-agent-message" />
                ) : (
                  <div className="w-10 h-10 rounded-md bg-agent-message flex items-center justify-center flex-shrink-0">
                    <MessageCircle className="w-5 h-5 text-muted-foreground" />
                  </div>
                )}

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between mb-1">
                    <div className="flex-1 min-w-0 pr-2">
                      <h4 className={cn(
                        'text-sm font-medium truncate',
                        currentConversation?.id === conversation.id ? 'text-ai-primary' : 'text-foreground'
                      )}>
                        {conversation.title}
                      </h4>
                    </div>
                    {currentConversation?.id === conversation.id && (
                      <Sparkles className="w-3 h-3 text-ai-primary animate-pulse flex-shrink-0" />
                    )}
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Clock className="w-3 h-3" />
                      {formatTimestamp(conversation.updated_at)}
                    </div>
                  </div>
                </div>

                {/* Delete Button */}
                <div className="absolute top-1/2 -translate-y-1/2 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0 hover:bg-destructive/20 hover:text-destructive"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteConversation(conversation.id);
                    }}
                    title="Delete conversation"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))
          )}
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