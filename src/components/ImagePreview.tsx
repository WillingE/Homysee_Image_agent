import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Download, Share, Sparkles, Heart } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useConversations } from '@/hooks/useConversations';

interface ImagePreviewProps {
  className?: string;
}

const ImagePreview = ({ className }: ImagePreviewProps) => {
  const { 
    currentConversation,
    favoriteImages,
    isImageProcessing,
    imageProcessingProgress
  } = useConversations();
  
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  const handleDownload = (imageUrl: string) => {
    const link = document.createElement('a');
    link.href = imageUrl;
    link.download = 'favorite-image.jpg';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleShare = async (imageUrl: string) => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Favorite Image',
          text: '看看我收藏的图片！',
          url: imageUrl
        });
      } catch (error) {
        console.log('分享失败:', error);
      }
    }
  };

  return (
    <Card className={cn('flex flex-col h-full bg-chat-surface border-message-border', className)}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-message-border bg-gradient-to-r from-ai-secondary/10 to-ai-accent/10">
        <div className="flex items-center gap-2">
          <Heart className="w-5 h-5 text-ai-secondary" />
          <h3 className="font-semibold text-foreground">收藏图片</h3>
        </div>
        <Badge variant="outline" className="text-xs border-ai-secondary/30 text-ai-secondary">
          {favoriteImages.length} 张图片
        </Badge>
      </div>

      {/* Preview Area */}
      <div className="flex-1 p-4">
        {favoriteImages.length === 0 && !isImageProcessing ? (
          <div className="h-full flex flex-col items-center justify-center text-center space-y-4">
            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-ai-primary/20 to-ai-secondary/20 flex items-center justify-center">
              <Heart className="w-12 h-12 text-ai-primary" />
            </div>
            <div className="space-y-2">
              <h4 className="text-lg font-semibold text-foreground">暂无收藏图片</h4>
              <p className="text-sm text-muted-foreground max-w-sm">
                在对话中点击图片上的心形按钮来收藏图片
              </p>
            </div>
          </div>
        ) : isImageProcessing ? (
          <div className="h-full flex flex-col items-center justify-center space-y-6">
            <div className="w-32 h-32 rounded-full bg-gradient-to-br from-ai-primary/20 to-ai-secondary/20 flex items-center justify-center relative">
              <div className="absolute inset-0 rounded-full bg-gradient-to-br from-ai-primary to-ai-secondary animate-spin opacity-20"></div>
              <Sparkles className="w-16 h-16 text-ai-primary animate-pulse" />
            </div>
            
            <div className="text-center space-y-2">
              <h4 className="text-lg font-semibold text-foreground">AI Processing Images</h4>
              <p className="text-sm text-muted-foreground">
                正在处理收藏的图片...
              </p>
            </div>
            
            <div className="w-full max-w-sm space-y-2">
              <Progress value={imageProcessingProgress} className="h-2" />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Processing</span>
                <span>{imageProcessingProgress}%</span>
              </div>
            </div>
          </div>
        ) : (
          <div className="h-full flex flex-col">
            {/* Image Grid */}
            <ScrollArea className="flex-1">
              <div className="grid grid-cols-1 gap-4">
                {favoriteImages.map((image) => (
                  <div key={image.id} className="relative group">
                    <div className="aspect-square bg-agent-message rounded-lg border border-message-border overflow-hidden">
                      <img 
                        src={image.image_url} 
                        alt="Favorite" 
                        className="w-full h-full object-cover cursor-pointer hover:opacity-80 transition-opacity"
                        onClick={() => setSelectedImage(image.image_url)}
                        onError={(e) => {
                          console.error('图片加载失败:', image.image_url);
                        }}
                      />
                    </div>
                    
                    {/* Image Actions */}
                    <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 rounded-full shadow-md backdrop-blur-sm bg-white/20 hover:bg-white/30 text-white"
                        onClick={() => handleDownload(image.image_url)}
                      >
                        <Download className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 rounded-full shadow-md backdrop-blur-sm bg-white/20 hover:bg-white/30 text-white"
                        onClick={() => handleShare(image.image_url)}
                      >
                        <Share className="w-4 h-4" />
                      </Button>
                    </div>
                    
                    {/* Image Info */}
                    <div className="mt-1 text-xs text-muted-foreground">
                      {new Date(image.created_at).toLocaleString()}
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
            
            {/* Selected Image Modal */}
            {selectedImage && (
              <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50" onClick={() => setSelectedImage(null)}>
                <div className="max-w-4xl max-h-4xl p-4">
                  <img 
                    src={selectedImage} 
                    alt="Selected" 
                    className="max-w-full max-h-full object-contain rounded-lg"
                  />
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Status Bar */}
      <div className="p-3 border-t border-message-border bg-gradient-to-r from-agent-message to-chat-surface">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>
            {currentConversation?.title ? `${currentConversation.title} 的收藏` : '当前对话的收藏图片'}
          </span>
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 bg-status-success rounded-full"></div>
            <span>Connected</span>
          </div>
        </div>
      </div>
    </Card>
  );
};

export default ImagePreview;