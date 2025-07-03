import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Download, Share, Sparkles, Image, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ImagePreviewProps {
  className?: string;
}

const ImagePreview = ({ className }: ImagePreviewProps) => {
  const [currentImage, setCurrentImage] = useState<string | null>(null);
  const [processingProgress, setProcessingProgress] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  
  // Mock image for demo
  React.useEffect(() => {
    // Simulate processing
    if (isProcessing) {
      const interval = setInterval(() => {
        setProcessingProgress(prev => {
          if (prev >= 100) {
            clearInterval(interval);
            setIsProcessing(false);
            return 100;
          }
          return prev + 10;
        });
      }, 200);
      return () => clearInterval(interval);
    }
  }, [isProcessing]);

  const handleStartDemo = () => {
    setIsProcessing(true);
    setProcessingProgress(0);
  };

  return (
    <Card className={cn('flex flex-col h-full bg-chat-surface border-message-border', className)}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-message-border bg-gradient-to-r from-ai-secondary/10 to-ai-accent/10">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-ai-secondary" />
          <h3 className="font-semibold text-foreground">Image Preview</h3>
        </div>
        <Badge variant="outline" className="text-xs border-ai-secondary/30 text-ai-secondary">
          AI Enhanced
        </Badge>
      </div>

      {/* Preview Area */}
      <div className="flex-1 p-6">
        {!currentImage && !isProcessing ? (
          <div className="h-full flex flex-col items-center justify-center text-center space-y-4">
            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-ai-primary/20 to-ai-secondary/20 flex items-center justify-center">
              <Image className="w-12 h-12 text-ai-primary" />
            </div>
            <div className="space-y-2">
              <h4 className="text-lg font-semibold text-foreground">No Image Selected</h4>
              <p className="text-sm text-muted-foreground max-w-sm">
                Upload an image or start a conversation to see AI-powered edits appear here
              </p>
            </div>
            <Button 
              onClick={handleStartDemo}
              className="mt-4 bg-gradient-to-r from-ai-primary to-ai-secondary hover:from-ai-primary-dark hover:to-ai-secondary/80"
            >
              <Zap className="w-4 h-4 mr-2" />
              See Demo
            </Button>
          </div>
        ) : isProcessing ? (
          <div className="h-full flex flex-col items-center justify-center space-y-6">
            <div className="w-32 h-32 rounded-full bg-gradient-to-br from-ai-primary/20 to-ai-secondary/20 flex items-center justify-center relative">
              <div className="absolute inset-0 rounded-full bg-gradient-to-br from-ai-primary to-ai-secondary animate-spin opacity-20"></div>
              <Sparkles className="w-16 h-16 text-ai-primary animate-pulse" />
            </div>
            
            <div className="text-center space-y-2">
              <h4 className="text-lg font-semibold text-foreground">AI Processing Image</h4>
              <p className="text-sm text-muted-foreground">
                Flux-Kontext-Pro is working its magic...
              </p>
            </div>
            
            <div className="w-full max-w-sm space-y-2">
              <Progress value={processingProgress} className="h-2" />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Processing</span>
                <span>{processingProgress}%</span>
              </div>
            </div>
            
            <div className="flex gap-2 text-xs text-muted-foreground">
              <Badge variant="outline" className="animate-pulse">
                Analyzing image
              </Badge>
              {processingProgress > 30 && (
                <Badge variant="outline" className="animate-pulse">
                  Applying effects
                </Badge>
              )}
              {processingProgress > 60 && (
                <Badge variant="outline" className="animate-pulse">
                  Finalizing
                </Badge>
              )}
            </div>
          </div>
        ) : (
          <div className="h-full flex flex-col">
            {/* Image Display */}
            <div className="flex-1 bg-agent-message rounded-lg border border-message-border overflow-hidden">
              <img 
                src={currentImage || ''} 
                alt="Processed" 
                className="w-full h-full object-contain"
              />
            </div>
            
            {/* Image Actions */}
            <div className="mt-4 flex gap-2">
              <Button variant="outline" size="sm" className="flex-1 border-ai-primary/30 hover:bg-ai-primary/10">
                <Download className="w-4 h-4 mr-2" />
                Download
              </Button>
              <Button variant="outline" size="sm" className="flex-1 border-ai-secondary/30 hover:bg-ai-secondary/10">
                <Share className="w-4 h-4 mr-2" />
                Share
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Status Bar */}
      <div className="p-3 border-t border-message-border bg-gradient-to-r from-agent-message to-chat-surface">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>Ready for AI magic</span>
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