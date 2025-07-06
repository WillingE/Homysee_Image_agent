import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Plus,
  MessageCircle,
  Image as ImageIcon,
  Trash2,
  Edit,
  Clock,
  Sparkles,
  ChevronLeft,
  Menu
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useConversations } from '@/hooks/useConversations';
import homyworkLogo from '@/assets/homywork_logo.svg';

interface SidebarProps {
  className?: string;
  onCollapse?: (collapsed: boolean) => void;
  onSelectGallery?: () => void;
  onSelectConversation?: () => void;
}

const Sidebar = ({ className, onCollapse, onSelectGallery, onSelectConversation }: SidebarProps) => {
  const { 
    conversations, 
    currentConversation, 
    createConversation, 
    selectConversation,
    deleteConversation,
    loading 
  } = useConversations();
  const [collapsed, setCollapsed] = useState(false);

  if (collapsed) {
    if (onCollapse) onCollapse(true);
    return (
      <div className="flex flex-col h-full bg-background items-center pt-4 w-16">
        {/* Logo */}
        <div className="mb-4">
          <img src={homyworkLogo} alt="Homywork Logo" className="h-6 w-6" />
        </div>
        
        {/* 展开按钮 */}
        <button
          className="mb-2 p-2 rounded hover:bg-secondary transition-colors border border-border"
          onClick={() => setCollapsed(false)}
          title="展开侧边栏"
        >
          <Menu className="w-4 h-4 text-black" />
        </button>
        
        {/* New Chat 按钮 */}
        <Button
          variant="ghost"
          size="icon"
          className="mb-2 text-black hover:bg-secondary w-10 h-10"
          onClick={() => { 
            createConversation();
            if (onSelectConversation) onSelectConversation(); 
          }}
          title="New Chat"
        >
          <Plus className="w-4 h-4" />
        </Button>
        
        {/* Gallery 按钮 */}
        <Button
          variant="ghost"
          size="icon"
          className="mb-2 text-black hover:bg-secondary w-10 h-10"
          onClick={onSelectGallery}
          title="Gallery"
        >
          <ImageIcon className="w-4 h-4" />
        </Button>
      </div>
    );
  } else {
    if (onCollapse) onCollapse(false);
  }

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
    <Card className={cn('h-full bg-background flex flex-col', className)}>
      {/* Logo 和折叠按钮 */}
      <div className="flex items-center justify-between pt-4 pb-2 px-4">
        <img src={homyworkLogo} alt="Homywork Logo" className="h-8" />
        <button
          className="p-2 rounded hover:bg-secondary transition-colors border border-border"
          onClick={() => setCollapsed(true)}
          title="收起侧边栏"
        >
          <ChevronLeft className="w-4 h-4 text-black" />
        </button>
      </div>
      
      {/* Header - New Chat 和 Gallery 按钮 */}
      <div className="p-4 border-b border-border flex flex-col gap-2">
        <Button 
          onClick={() => createConversation()}
          className="w-full bg-transparent hover:bg-secondary text-black text-base font-medium flex items-center gap-2 justify-start border-none shadow-none"
        >
          <Plus className="w-5 h-5 mr-2" />
          New Chat
        </Button>
        <Button
          variant="ghost"
          className="flex items-center gap-2 w-full justify-start text-black text-base font-medium"
          onClick={onSelectGallery}
        >
          <ImageIcon className="w-5 h-5" />
          <span>Gallery</span>
        </Button>
      </div>
      
      {/* Conversations List */}
      <ScrollArea className="flex-1">
        <div className="p-2 space-y-2">
          {loading ? (
            <div className="space-y-2">
              {[...Array(8)].map((_, i) => (
                <div key={i} className="flex items-center space-x-3 p-3 rounded-lg border border-border bg-background animate-pulse">
                  <Skeleton className="h-10 w-10 rounded-md bg-secondary" />
                  <div className="space-y-2 flex-1">
                    <Skeleton className="h-4 w-3/4 bg-secondary" />
                    <div className="flex items-center justify-between">
                      <Skeleton className="h-3 w-1/3 bg-secondary" />
                      <Skeleton className="h-3 w-8 bg-secondary" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : conversations.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No conversations
            </div>
          ) : (
            conversations.map((conversation) => (
              <div
                key={conversation.id}
                onClick={() => {
                  selectConversation(conversation);
                  if (onSelectConversation) onSelectConversation();
                }}
                className={cn(
                  'group relative p-3 rounded-lg border cursor-pointer transition-all duration-200 flex items-center gap-3',
                  currentConversation?.id === conversation.id
                    ? 'bg-secondary border-secondary shadow-none'
                    : 'bg-background border-border hover:border-primary/20 hover:bg-secondary'
                )}
              >
                {/* Thumbnail */}
                {conversation.thumbnail_url ? (
                  <img src={conversation.thumbnail_url} alt={conversation.title} className="w-10 h-10 rounded-md object-cover flex-shrink-0 bg-secondary" />
                ) : (
                  <div className="w-10 h-10 rounded-md bg-secondary flex items-center justify-center flex-shrink-0">
                    <MessageCircle className="w-5 h-5 text-muted-foreground" />
                  </div>
                )}

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between mb-1">
                    <div className="flex-1 min-w-0 pr-2">
                      <h4 className={cn(
                        'text-sm font-medium truncate',
                        currentConversation?.id === conversation.id ? 'text-primary' : 'text-foreground'
                      )}>
                        {conversation.title}
                      </h4>
                    </div>
                    {currentConversation?.id === conversation.id && (
                      <Sparkles className="w-3 h-3 text-primary animate-pulse flex-shrink-0" />
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
      <div className="p-3 border-t border-border bg-background">
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