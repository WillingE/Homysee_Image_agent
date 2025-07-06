import React, { useEffect, useRef, useState } from 'react';
import { Canvas as FabricCanvas, FabricImage } from 'fabric';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { RotateCcw, Check, X, Move, RotateCw } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ImageTransform {
  x: number;
  y: number;
  scaleX: number;
  scaleY: number;
  angle: number;
}

interface ImageEditorProps {
  isOpen: boolean;
  onClose: () => void;
  imageUrl: string;
  onApply: (transform: ImageTransform, editedPrompt: string) => void;
  originalPrompt?: string;
}

const ImageEditor = ({ 
  isOpen, 
  onClose, 
  imageUrl, 
  onApply, 
  originalPrompt = "Adjust the product position and size" 
}: ImageEditorProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [fabricCanvas, setFabricCanvas] = useState<FabricCanvas | null>(null);
  const [activeObject, setActiveObject] = useState<FabricImage | null>(null);
  const [transform, setTransform] = useState<ImageTransform>({
    x: 0.5,
    y: 0.5,
    scaleX: 1,
    scaleY: 1,
    angle: 0
  });

  useEffect(() => {
    if (!canvasRef.current || !isOpen) return;

    const canvas = new FabricCanvas(canvasRef.current, {
      width: 500,
      height: 400,
      backgroundColor: '#f8f9fa',
    });

    // Load the image
    FabricImage.fromURL(imageUrl, {
      crossOrigin: 'anonymous'
    }).then((img) => {
      if (!img) return;
      
      // Scale image to fit canvas while maintaining aspect ratio
      const canvasAspect = canvas.width! / canvas.height!;
      const imgAspect = img.width! / img.height!;
      
      let scale;
      if (imgAspect > canvasAspect) {
        scale = (canvas.width! * 0.7) / img.width!;
      } else {
        scale = (canvas.height! * 0.7) / img.height!;
      }
      
      img.set({
        left: canvas.width! / 2,
        top: canvas.height! / 2,
        originX: 'center',
        originY: 'center',
        scaleX: scale,
        scaleY: scale,
        cornerColor: 'rgba(12, 127, 242, 0.8)',
        cornerSize: 12,
        transparentCorners: false,
        borderColor: 'rgb(12, 127, 242)',
        borderOpacityWhenMoving: 0.8,
      });
      
      canvas.add(img);
      canvas.setActiveObject(img);
      setActiveObject(img);
      
      updateTransform(img, canvas);
    });

    // Handle object movement/scaling
    canvas.on('object:modified', () => {
      const obj = canvas.getActiveObject() as FabricImage;
      if (obj) {
        updateTransform(obj, canvas);
      }
    });

    setFabricCanvas(canvas);

    return () => {
      canvas.dispose();
    };
  }, [imageUrl, isOpen]);

  const updateTransform = (obj: FabricImage, canvas: FabricCanvas) => {
    const centerX = obj.left! / canvas.width!;
    const centerY = obj.top! / canvas.height!;
    
    setTransform({
      x: centerX,
      y: centerY,
      scaleX: obj.scaleX!,
      scaleY: obj.scaleY!,
      angle: obj.angle!
    });
  };

  const handleScaleChange = (value: number[]) => {
    if (!activeObject || !fabricCanvas) return;
    
    const scale = value[0];
    activeObject.set({
      scaleX: scale,
      scaleY: scale
    });
    fabricCanvas.renderAll();
    updateTransform(activeObject, fabricCanvas);
  };

  const handleRotationChange = (value: number[]) => {
    if (!activeObject || !fabricCanvas) return;
    
    const angle = value[0];
    activeObject.set({ angle });
    fabricCanvas.renderAll();
    updateTransform(activeObject, fabricCanvas);
  };

  const handleReset = () => {
    if (!activeObject || !fabricCanvas) return;
    
    activeObject.set({
      left: fabricCanvas.width! / 2,
      top: fabricCanvas.height! / 2,
      scaleX: 0.7,
      scaleY: 0.7,
      angle: 0
    });
    fabricCanvas.renderAll();
    updateTransform(activeObject, fabricCanvas);
  };

  const generateEditPrompt = () => {
    let position = '';
    if (transform.x < 0.3) position = 'positioned on the left side';
    else if (transform.x > 0.7) position = 'positioned on the right side';
    else position = 'centered horizontally';

    if (transform.y < 0.3) position += ', positioned at the top';
    else if (transform.y > 0.7) position += ', positioned at the bottom';
    else position += ', vertically centered';

    let size = '';
    const avgScale = (transform.scaleX + transform.scaleY) / 2;
    if (avgScale < 0.5) size = 'small size';
    else if (avgScale > 1.2) size = 'large size, prominent';
    else size = 'medium size';

    let rotation = '';
    if (Math.abs(transform.angle) > 5) {
      rotation = `, rotated ${Math.round(transform.angle)} degrees`;
    }

    return `${originalPrompt}, product ${position}, ${size}${rotation}`;
  };

  const handleApply = () => {
    const editedPrompt = generateEditPrompt();
    onApply(transform, editedPrompt);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Move className="w-5 h-5" />
            Adjust Product Position & Size
          </DialogTitle>
        </DialogHeader>
        
        <div className="flex-1 flex gap-4 min-h-0">
          {/* Canvas Area */}
          <div className="flex-1 flex flex-col">
            <Card className="flex-1 p-4 flex items-center justify-center bg-background">
              <canvas 
                ref={canvasRef} 
                className="border border-border rounded-lg shadow-none bg-background"
              />
            </Card>
            
            {/* Controls */}
            <div className="mt-4 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Scale</label>
                  <Slider
                    value={[(transform.scaleX + transform.scaleY) / 2]}
                    onValueChange={handleScaleChange}
                    min={0.1}
                    max={2}
                    step={0.1}
                    className="w-full"
                  />
                  <div className="text-xs text-muted-foreground text-center">
                    {Math.round(((transform.scaleX + transform.scaleY) / 2) * 100)}%
                  </div>
                </div>
                
                <div className="space-y-2">
                  <label className="text-sm font-medium flex items-center gap-1">
                    <RotateCw className="w-3 h-3" />
                    Rotation
                  </label>
                  <Slider
                    value={[transform.angle]}
                    onValueChange={handleRotationChange}
                    min={-180}
                    max={180}
                    step={5}
                    className="w-full"
                  />
                  <div className="text-xs text-muted-foreground text-center">
                    {Math.round(transform.angle)}°
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          {/* Preview & Info */}
          <div className="w-64 space-y-4">
            <Card className="p-4">
              <h4 className="font-medium mb-2">Position</h4>
              <div className="text-sm text-muted-foreground space-y-1">
                <div>X: {Math.round(transform.x * 100)}%</div>
                <div>Y: {Math.round(transform.y * 100)}%</div>
              </div>
            </Card>
            
            <Card className="p-4">
              <h4 className="font-medium mb-2">Generated Prompt</h4>
              <div className="text-xs text-muted-foreground leading-relaxed">
                {generateEditPrompt()}
              </div>
            </Card>
          </div>
        </div>
        
        {/* Action Buttons */}
        <div className="flex justify-between pt-4 border-t">
          <Button
            variant="outline"
            onClick={handleReset}
            className="flex items-center gap-2"
          >
            <RotateCcw className="w-4 h-4" />
            Reset
          </Button>
          
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose}>
              <X className="w-4 h-4 mr-2" />
              Cancel
            </Button>
            <Button onClick={handleApply} className="bg-primary hover:bg-primary/90">
              <Check className="w-4 h-4 mr-2" />
              Apply Changes
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ImageEditor;