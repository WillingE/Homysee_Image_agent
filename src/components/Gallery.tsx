import React, { useState, useMemo, useEffect } from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from './ui/tabs';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { useConversations } from '@/hooks/useConversations';
import { useTranslation } from 'react-i18next';
import { Heart, Download, Eye } from 'lucide-react';

const Gallery: React.FC = () => {
  const { favoriteImages, loadAllImagesForUser, loadAllFavoriteImages, unfavoriteImage } = useConversations();
  const { t } = useTranslation();
  const [tab, setTab] = useState<'all' | 'favorite'>('all');
  const [allImages, setAllImages] = useState<{ url: string; id: string }[]>([]);
  const [allFavoriteImages, setAllFavoriteImages] = useState<{ url: string; id: string }[]>([]);
  const [loading, setLoading] = useState(false);
  const [favoritesLoading, setFavoritesLoading] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  // 收藏图片 - 这里保持当前对话的收藏图片用于兼容性
  const favImages = useMemo(() => favoriteImages.map(img => ({ url: img.image_url, id: img.id })), [favoriteImages]);

  // 处理图片下载
  const handleDownload = (imageUrl: string) => {
    const link = document.createElement('a');
    link.href = imageUrl;
    link.download = `image_${Date.now()}.jpg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // 处理取消收藏
  const handleUnfavorite = async (imageUrl: string) => {
    await unfavoriteImage(imageUrl);
    // 重新加载收藏图片
    if (tab === 'favorite') {
      setFavoritesLoading(true);
      loadAllFavoriteImages().then(favorites => {
        const images = favorites.map(fav => ({ url: fav.image_url, id: fav.id }));
        setAllFavoriteImages(images);
        setFavoritesLoading(false);
      });
    }
  };

  useEffect(() => {
    if (tab === 'all') {
      setLoading(true);
      loadAllImagesForUser().then(msgs => {
        // 聚合所有图片
        const images: { url: string; id: string }[] = [];
        msgs.forEach(msg => {
          if (msg.image_url) {
            images.push({ url: msg.image_url, id: msg.id + '_main' });
          }
          if (msg.additional_image_urls && Array.isArray(msg.additional_image_urls)) {
            msg.additional_image_urls.forEach((url, idx) => {
              if (url) images.push({ url, id: msg.id + '_add_' + idx });
            });
          }
        });
        // 去重
        const seen = new Set();
        const deduped = images.filter(img => {
          if (seen.has(img.url)) return false;
          seen.add(img.url);
          return true;
        });
        setAllImages(deduped);
        setLoading(false);
      });
    } else if (tab === 'favorite') {
      setFavoritesLoading(true);
      loadAllFavoriteImages().then(favorites => {
        const images = favorites.map(fav => ({ url: fav.image_url, id: fav.id }));
        setAllFavoriteImages(images);
        setFavoritesLoading(false);
      });
    }
  }, [tab, loadAllImagesForUser, loadAllFavoriteImages]);

  const images = tab === 'all' ? allImages : allFavoriteImages;

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-2 mb-4">
        <h2 className="text-xl font-bold">{t('gallery.title', 'Gallery')}</h2>
      </div>
      <Tabs value={tab} onValueChange={v => setTab(v as 'all' | 'favorite')}>
        <TabsList>
          <TabsTrigger value="all">{t('gallery.all', 'All')}</TabsTrigger>
          <TabsTrigger value="favorite">{t('gallery.favorite', 'Favorite')}</TabsTrigger>
        </TabsList>
        <TabsContent value="all">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
            {loading ? (
              <div className="col-span-4 text-center text-muted-foreground">Loading...</div>
            ) : allImages.length === 0 ? (
              <div className="col-span-4 text-center text-muted-foreground">{t('gallery.noImages', 'No images yet')}</div>
            ) : (
              allImages.map(img => (
                <Card key={img.id} className="overflow-hidden relative group">
                  <img 
                    src={img.url} 
                    alt="all" 
                    className="w-full h-40 object-cover cursor-pointer hover:opacity-80 transition-opacity" 
                    onClick={() => setSelectedImage(img.url)}
                  />
                  <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0 rounded-full bg-background/80 hover:bg-background/90 backdrop-blur-sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDownload(img.url);
                      }}
                      title="Download image"
                    >
                      <Download className="w-4 h-4" />
                    </Button>
                  </div>
                </Card>
              ))
            )}
          </div>
        </TabsContent>
        <TabsContent value="favorite">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
            {favoritesLoading ? (
              <div className="col-span-4 text-center text-muted-foreground">Loading favorites...</div>
            ) : allFavoriteImages.length === 0 ? (
              <div className="col-span-4 text-center text-muted-foreground">{t('gallery.noFavorites', 'No favorite images')}</div>
            ) : (
              allFavoriteImages.map(img => (
                <Card key={img.id} className="overflow-hidden relative group">
                  <img 
                    src={img.url} 
                    alt="fav" 
                    className="w-full h-40 object-cover cursor-pointer hover:opacity-80 transition-opacity" 
                    onClick={() => setSelectedImage(img.url)}
                  />
                  <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0 rounded-full bg-background/80 hover:bg-background/90 backdrop-blur-sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDownload(img.url);
                      }}
                      title="Download image"
                    >
                      <Download className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0 rounded-full bg-red-500/80 hover:bg-red-500/90 backdrop-blur-sm text-white"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleUnfavorite(img.url);
                      }}
                      title="Remove from favorites"
                    >
                      <Heart className="w-4 h-4 fill-current" />
                    </Button>
                  </div>
                </Card>
              ))
            )}
          </div>
        </TabsContent>
      </Tabs>
      
      {/* 图片预览模态框 */}
      {selectedImage && (
        <div 
          className="fixed inset-0 bg-black/80 flex items-center justify-center z-50" 
          onClick={() => setSelectedImage(null)}
        >
          <div className="max-w-4xl max-h-4xl p-4">
            <img 
              src={selectedImage} 
              alt="Preview" 
              className="max-w-full max-h-full object-contain rounded-lg"
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default Gallery; 