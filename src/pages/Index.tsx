import React from 'react';
import Header from '@/components/Header';
import Sidebar from '@/components/Sidebar';
import ChatWindow from '@/components/ChatWindow';
import ImagePreview from '@/components/ImagePreview';
import heroImage from '@/assets/hero-banner.jpg';

const Index = () => {
  return (
    <div className="min-h-screen bg-chat-background">
      {/* Header */}
      <Header />
      
      {/* Main Content */}
      <div className="h-[calc(100vh-4rem)] flex">
        {/* Sidebar */}
        <div className="w-80 p-4 hidden lg:block">
          <Sidebar className="h-full" />
        </div>
        
        {/* Chat & Preview */}
        <div className="flex-1 p-4 flex gap-4">
          {/* Chat Window */}
          <div className="flex-1 min-w-0">
            <ChatWindow className="h-full" />
          </div>
          
          {/* Image Preview */}
          <div className="w-96 hidden xl:block">
            <ImagePreview className="h-full" />
          </div>
        </div>
      </div>
      
      {/* Hero Background (Optional) */}
      <div 
        className="fixed inset-0 -z-10 opacity-5 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: `url(${heroImage})` }}
      />
    </div>
  );
};

export default Index;
