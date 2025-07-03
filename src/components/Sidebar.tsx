import React from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
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

    if (minutes < 60) return `${minutes}分钟前`;
    if (hours < 24) return `${hours}小时前`;
    return `${days}天前`;
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
          新建对话
        </Button>
      </div>

      {/* Conversations List */}
      <ScrollArea className="flex-1">
        <div className="p-2 space-y-2">
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">
              加载中...
            </div>
          ) : conversations.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              暂无对话
            </div>
          ) : (
            conversations.map((conversation) => (
              <div
                key={conversation.id}
                className={cn(
                  'group relative p-3 rounded-lg border cursor-pointer transition-all duration-200 hover:shadow-md',
                  currentConversation?.id === conversation.id
                    ? 'bg-ai-primary/10 border-ai-primary/30 shadow-sm' 
                    : 'bg-agent-message border-message-border hover:border-ai-primary/20 hover:bg-ai-primary/5'
                )}
              >
                <div 
                  onClick={() => selectConversation(conversation)}
                  className="flex-1"
                >
                  {/* Conversation Header */}
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1 min-w-0 pr-2">
                      <h4 className={cn(
                        'text-sm font-medium truncate',
                        currentConversation?.id === conversation.id ? 'text-ai-primary' : 'text-foreground'
                      )}>
                        {conversation.title}
                      </h4>
                    </div>
                    {currentConversation?.id === conversation.id && (
                      <Sparkles className="w-3 h-3 text-ai-primary animate-pulse" />
                    )}
                  </div>

                  {/* Metadata */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Clock className="w-3 h-3" />
                      {formatTimestamp(conversation.updated_at)}
                    </div>
                  </div>
                </div>

                {/* Delete Button */}
                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0 hover:bg-destructive/20 hover:text-destructive"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>确认删除对话</AlertDialogTitle>
                        <AlertDialogDescription>
                          确定要删除对话 "{conversation.title}" 吗？此操作无法撤销，对话中的所有消息也将被删除。
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>取消</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => handleDeleteConversation(conversation.id)}
                          className="bg-destructive hover:bg-destructive/90"
                        >
                          删除
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
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