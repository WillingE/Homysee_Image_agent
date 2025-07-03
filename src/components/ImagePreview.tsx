import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Download, Heart, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useConversations } from '@/hooks/useConversations';
import { useToast } from '@/hooks/use-toast';
import JSZip from 'jszip';

interface ImagePreviewProps {
  className?: string;
}

const ImagePreview = ({ className }: ImagePreviewProps) => {
  const {
    currentConversation,
    favoriteImages,
    unfavoriteImage,
  } = useConversations();

  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isZipping, setIsZipping] = useState(false);
  const { toast } = useToast();

  const handleDownload = (imageUrl: string) => {
    const link = document.createElement('a');
    link.href = imageUrl;
    link.download = `image_${Date.now()}.jpg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };
  
  const handleBatchDownload = async () => {
    if (favoriteImages.length === 0 || isZipping) return;

    setIsZipping(true);
    toast({
      title: 'Zipping images...',
      description: `Preparing to compress ${favoriteImages.length} images, please wait.`,
    });

    try {
      const zip = new JSZip();
      
      const imagePromises = favoriteImages.map(async (image) => {
        try {
          const response = await fetch(image.image_url);
          if (!response.ok) {
            throw new Error(`Unable to fetch image: ${image.image_url}`);
          }
          const blob = await response.blob();
          const filename = image.image_url.split('/').pop()?.split('?')[0] || `image_${image.id}.jpg`;
          zip.file(filename, blob);
        } catch (fetchError) {
          console.error(`Skipping image that couldn't be downloaded: ${image.image_url}`, fetchError);
        }
      });

      await Promise.all(imagePromises);

      const zipContent = await zip.generateAsync({ type: 'blob' });
      
      const link = document.createElement('a');
      link.href = URL.createObjectURL(zipContent);
      const zipFileName = `favorites_${currentConversation?.title.replace(/ /g, '_') || 'collection'}_${Date.now()}.zip`;
      link.download = zipFileName;
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(link.href);

      toast({
        title: 'Zipping completed',
        description: `${zipFileName} has started downloading.`,
      });

    } catch (error) {
      console.error('Failed to create zip file', error);
      toast({
        title: 'Zipping failed',
        description: 'Unable to create zip file, please check console for more information.',
        variant: 'destructive',
      });
    } finally {
      setIsZipping(false);
    }
  };

  return (
    <Card className={cn('flex flex-col h-full bg-chat-surface border-message-border', className)}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-message-border bg-gradient-to-r from-ai-secondary/10 to-ai-accent/10">
        <div className="flex items-center gap-2">
          <Heart className="w-5 h-5 text-ai-secondary" />
          <h3 className="font-semibold text-foreground">Favorite Images</h3>
        </div>
        <div className="flex items-center gap-2">
          {favoriteImages.length > 0 && (
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleBatchDownload}
              disabled={isZipping}
            >
              {isZipping ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Download className="w-4 h-4 mr-2" />
              )}
              {isZipping ? 'Zipping...' : 'Download All'}
            </Button>
          )}
          <Badge variant="outline" className="text-xs border-ai-secondary/30 text-ai-secondary">
            {favoriteImages.length} {favoriteImages.length === 1 ? 'image' : 'images'}
          </Badge>
        </div>
      </div>

      {/* Preview Area */}
      <div className="flex-1 flex flex-col min-h-0">
        {favoriteImages.length === 0 ? (
          <div className="p-4 h-full flex flex-col items-center justify-center text-center space-y-4">
            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-ai-primary/20 to-ai-secondary/20 flex items-center justify-center">
              <Heart className="w-12 h-12 text-ai-primary" />
            </div>
            <div className="space-y-2">
              <h4 className="text-lg font-semibold text-foreground">No Favorite Images</h4>
              <p className="text-sm text-muted-foreground max-w-sm">
                Click the heart icon on an image in the chat to save it here.
              </p>
            </div>
          </div>
        ) : (
          <ScrollArea className="h-full">
            <div className="grid grid-cols-1 gap-4 p-4">
              {favoriteImages.map((image) => (
                <div key={image.id} className="relative group">
                  <div className="aspect-square bg-agent-message rounded-lg border border-message-border overflow-hidden">
                    <img 
                      src={image.image_url} 
                      alt="Favorite" 
                      className="w-full h-full object-cover cursor-pointer hover:opacity-80 transition-opacity"
                      onClick={() => setSelectedImage(image.image_url)}
                      onError={(e) => {
                        console.error('Image loading failed:', image.image_url);
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
                      title="Download image"
                    >
                      <Download className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0 rounded-full shadow-md backdrop-blur-sm bg-red-500/20 hover:bg-red-500/30 text-red-500"
                      onClick={() => unfavoriteImage(image.message_id)}
                      title="Unfavorite"
                    >
                      <Heart className="w-4 h-4 fill-current" />
                    </Button>
                  </div>
                  
                  {/* Image Info */}
                  <div className="mt-1 text-xs text-muted-foreground">
                    {new Date(image.created_at).toLocaleString()}
                  </div>
                </div>
              ))}
            </div>
            
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
          </ScrollArea>
        )}
      </div>

      {/* Status Bar */}
      <div className="p-3 border-t border-message-border bg-gradient-to-r from-agent-message to-chat-surface">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>
            {currentConversation?.title ? `Favorites from "${currentConversation.title}"` : 'Favorites from current chat'}
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