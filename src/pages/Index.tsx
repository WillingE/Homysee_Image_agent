import React, { useState } from 'react';
import Header from '@/components/Header';
import Sidebar from '@/components/Sidebar';
import ChatWindow from '@/components/ChatWindow';
import ImagePreview from '@/components/ImagePreview';
import Gallery from '@/components/Gallery';

const Index = () => {
  const [imagePreviewCollapsed, setImagePreviewCollapsed] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [isGalleryPage, setIsGalleryPage] = useState(false);

  // 新增：点击对话时切换回聊天界面
  const handleSelectConversation = () => {
    setIsGalleryPage(false);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header + Main Content 并列布局 */}
      <div className="flex h-screen">
        {/* Sidebar */}
        <div className={sidebarCollapsed ? 'w-16 flex-shrink-0 flex flex-col' : 'w-80 flex-shrink-0 flex flex-col'}>
          <Sidebar 
            className="h-full" 
            onCollapse={setSidebarCollapsed} 
            onSelectGallery={() => setIsGalleryPage(true)}
            onSelectConversation={handleSelectConversation}
          />
        </div>
        {/* 主内容区 */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Header */}
          <Header />
          {/* Main Content */}
          <div className="flex-1 p-4 flex gap-4 h-0">
            {isGalleryPage ? (
              <div className="flex-1 min-w-0">
                <Gallery />
              </div>
            ) : (
              <>
                <div className={imagePreviewCollapsed ? 'flex-1 min-w-0' : 'flex-1 min-w-0'}>
                  <ChatWindow className="h-full" />
                </div>
                <div className={imagePreviewCollapsed ? 'w-0 hidden xl:block' : 'w-96 hidden xl:block'}>
                  <ImagePreview className="h-full" onCollapse={setImagePreviewCollapsed} />
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Index;
