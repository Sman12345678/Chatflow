import { useState, useEffect } from 'react';
import { useAuthStore, useChatStore, useUIStore } from '@/store';
import { ChatSidebar } from '@/components/chat/ChatSidebar';
import { ChatWindow } from '@/components/chat/ChatWindow';
import { EmptyState } from '@/components/chat/EmptyState';
import { AIChat } from '@/components/ai/AIChat';
import { StatusView } from '@/components/status/StatusView';
import { SettingsPanel } from '@/components/settings/SettingsPanel';
import { UserProfile } from '@/components/profile/UserProfile';
import { Menu, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function ChatLayout() {
  const { logout } = useAuthStore();
  const { selectedChatId, selectChat } = useChatStore();
  const { isSidebarOpen, toggleSidebar } = useUIStore();
  const [activeView, setActiveView] = useState<'chats' | 'ai' | 'status' | 'settings' | 'profile'>('chats');
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
      if (window.innerWidth >= 768) {
        // Reset sidebar on desktop
      }
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const handleBack = () => {
    selectChat(null);
  };

  const renderMainContent = () => {
    switch (activeView) {
      case 'ai':
        return <AIChat onBack={() => setActiveView('chats')} />;
      case 'status':
        return <StatusView onBack={() => setActiveView('chats')} />;
      case 'settings':
        return <SettingsPanel onBack={() => setActiveView('chats')} />;
      case 'profile':
        return <UserProfile onBack={() => setActiveView('chats')} />;
      default:
        if (selectedChatId) {
          return <ChatWindow chatId={selectedChatId} onBack={handleBack} />;
        }
        return <EmptyState />;
    }
  };

  return (
    <div className="h-screen w-full flex bg-white dark:bg-[#0b141a] overflow-hidden">
      {/* Sidebar */}
      <div 
        className={`
          ${isMobile 
            ? selectedChatId || activeView !== 'chats' ? 'hidden' : 'w-full' 
            : isSidebarOpen ? 'w-[400px] min-w-[400px]' : 'hidden'
          }
          flex flex-col border-r border-gray-200 dark:border-gray-800
          bg-white dark:bg-[#111b21]
        `}
      >
        <ChatSidebar 
          activeView={activeView}
          onViewChange={setActiveView}
          onLogout={logout}
        />
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col relative">
        {/* Mobile Header - Show back button when in chat or other views */}
        {isMobile && (selectedChatId || activeView !== 'chats') && (
          <div className="flex items-center p-3 bg-[#f0f2f5] dark:bg-[#202c33] border-b border-gray-200 dark:border-gray-700">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => {
                if (selectedChatId) {
                  handleBack();
                } else {
                  setActiveView('chats');
                }
              }}
              className="mr-2"
            >
              <ArrowLeft className="w-6 h-6" />
            </Button>
            <span className="font-medium">
              {selectedChatId ? 'Back to Chats' : 'Back'}
            </span>
          </div>
        )}

        {/* Desktop Sidebar Toggle */}
        {!isMobile && (
          <div className="absolute top-4 left-4 z-10">
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleSidebar}
              className="bg-white/80 dark:bg-black/50 backdrop-blur-sm hover:bg-white dark:hover:bg-black/70"
            >
              <Menu className="w-5 h-5" />
            </Button>
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-hidden">
          {renderMainContent()}
        </div>
      </div>
    </div>
  );
}
