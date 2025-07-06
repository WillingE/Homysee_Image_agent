import React, { useState, useMemo, useEffect } from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from './ui/tabs';
import { Card } from './ui/card';
import { useConversations } from '@/hooks/useConversations';
import { useTranslation } from 'react-i18next';

const Gallery: React.FC = () => {
  const { favoriteImages, loadAllImagesForUser } = useConversations();
  const { t } = useTranslation();
  const [tab, setTab] = useState<'all' | 'favorite'>('all');
  const [allImages, setAllImages] = useState<{ url: string; id: string }[]>([]);
  const [loading, setLoading] = useState(false);

  // 收藏图片
  const favImages = useMemo(() => favoriteImages.map(img => ({ url: img.image_url, id: img.id })), [favoriteImages]);

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
    }
  }, [tab, loadAllImagesForUser]);

  const images = tab === 'all' ? allImages : favImages;

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
                <Card key={img.id} className="overflow-hidden">
                  <img src={img.url} alt="all" className="w-full h-40 object-cover" />
                </Card>
              ))
            )}
          </div>
        </TabsContent>
        <TabsContent value="favorite">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
            {favImages.length === 0 ? <div className="col-span-4 text-center text-muted-foreground">{t('gallery.noFavorites', 'No favorite images')}</div> :
              favImages.map(img => (
                <Card key={img.id} className="overflow-hidden">
                  <img src={img.url} alt="fav" className="w-full h-40 object-cover" />
                </Card>
              ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Gallery; 