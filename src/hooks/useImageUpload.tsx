import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

export const useImageUpload = () => {
  const [uploading, setUploading] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();

  const uploadImage = async (file: File): Promise<string | null> => {
    if (!user) {
      console.error('Upload failed: User not authenticated');
      toast({
        title: 'Upload Failed',
        description: 'Please login first',
        variant: 'destructive'
      });
      return null;
    }

    console.log('Starting image upload for file:', file.name, 'Size:', file.size, 'Type:', file.type);
    setUploading(true);
    
    try {
      // 验证文件类型和大小
      if (!file.type.startsWith('image/')) {
        throw new Error('Only image files can be uploaded');
      }
      
      if (file.size > 10 * 1024 * 1024) { // 10MB
        throw new Error('Image files cannot exceed 10MB');
      }

      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;
      
      console.log('Uploading to storage with fileName:', fileName);
      
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('images')
        .upload(fileName, file);

      if (uploadError) {
        console.error('Storage upload error:', uploadError);
        throw uploadError;
      }

      console.log('Upload successful, data:', uploadData);

      const { data: urlData } = supabase.storage
        .from('images')
        .getPublicUrl(fileName);

      console.log('Generated public URL:', urlData.publicUrl);

      // 验证URL是否有效
      if (!urlData.publicUrl) {
        throw new Error('Failed to generate image URL');
      }

      return urlData.publicUrl;
    } catch (error) {
      console.error('Error uploading image:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      toast({
        title: 'Image Upload Failed',
        description: errorMessage,
        variant: 'destructive'
      });
      return null;
    } finally {
      setUploading(false);
    }
  };

  return {
    uploadImage,
    uploading
  };
};