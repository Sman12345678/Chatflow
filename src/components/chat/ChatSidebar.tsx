import { useState, useMemo } from 'react';
import { useAuthStore, useChatStore, useStatusStore } from '@/store';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { 
  Search, 
  MoreVertical, 
  MessageSquare, 
  Bot, 
  Circle, 
  Settings, 
  LogOut, 
  User, 
  Plus,
  Users,
  ChevronDown
} from 'lucide-react';
import { getInitials, getAvatarColor, formatChatListTime, truncateMessage } from '@/lib/utils';
import type { Chat } from '@/types';
import { NewChatDialog } from './NewChatDialog';
import { NewGroupDialog } from './NewGroupDialog';

interface ChatSidebarProps {
  activeView: string;
  onViewChange: (view: 'chats' | 'ai' | 'status' | 'settings' | 'profile') => void;
  onLogout: () => void;
}

export function ChatSidebar({ activeView, onViewChange, onLogout }: ChatSidebarProps) {
  const { currentUser, users } = useAuthStore();
  const { chats, selectChat, selectedChatId, searchChats } = useChatStore();
  const { getRecentStatuses } = useStatusStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [showNewChat, setShowNewChat] = useState(false);
  const [showNewGroup, setShowNewGroup] = useState(false);

  const recentStatuses = getRecentStatuses();

  const filteredChats = useMemo(() => {
    if (!searchQuery.trim()) return chats;
    return searchChats(searchQuery);
  }, [chats, searchQuery, searchChats]);

  const sortedChats = useMemo(() => {
    return [...filteredChats].sort((a, b) => {
      const timeA = a.lastMessage?.createdAt || a.createdAt;
      const timeB = b.lastMessage?.createdAt || b.createdAt;
      return new Date(timeB).getTime() - new Date(timeA).getTime();
    });
  }, [filteredChats]);

  const getChatDisplayInfo = (chat: Chat) => {
    if (chat.type === 'group') {
      return {
        name: chat.name || 'Group',
        avatar: chat.avatar,
        initials: getInitials(chat.name || 'G'),
        color: getAvatarColor(chat.name || 'Group'),
      };
    } else {
      const otherUserId = chat.participants.find(id => id !== currentUser?.id);
      const otherUser = users.find(u => u.id === otherUserId);
      return {
        name: otherUser?.displayName || otherUser?.username || 'Unknown',
        avatar: undefined,
        initials: getInitials(otherUser?.displayName || otherUser?.username || 'U'),
        color: getAvatarColor(otherUser?.username || 'Unknown'),
        isOnline: otherUser?.isOnline,
        status: otherUser?.status,
      };
    }
  };

  const getLastMessagePreview = (chat: Chat) => {
    if (!chat.lastMessage) return 'No messages yet';
    if (chat.lastMessage.isDeleted) return 'This message was deleted';
    
    const prefix = chat.lastMessage.senderId === currentUser?.id ? 'You: ' : '';
    const content = chat.lastMessage.type === 'image' 
      ? '📷 Photo' 
      : chat.lastMessage.type === 'voice' 
        ? '🎤 Voice message' 
        : chat.lastMessage.type === 'file'
          ? '📎 File'
          : chat.lastMessage.content;
    
    return prefix + truncateMessage(content, 30);
  };

  return (
    <>
      {/* Header */}
      <div className="p-3 bg-[#f0f2f5] dark:bg-[#202c33] flex items-center justify-between">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="p-1 h-auto hover:bg-transparent">
              <Avatar className="w-10 h-10 cursor-pointer hover:ring-2 hover:ring-[#128C7E] transition-all">
                <AvatarFallback className={`${getAvatarColor(currentUser?.username || '')} text-white font-semibold`}>
                  {getInitials(currentUser?.displayName || currentUser?.username || 'U')}
                </AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-56">
            <DropdownMenuItem onClick={() => onViewChange('profile')}>
              <User className="w-4 h-4 mr-2" />
              Profile
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onViewChange('settings')}>
              <Settings className="w-4 h-4 mr-2" />
              Settings
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={onLogout} className="text-red-600">
              <LogOut className="w-4 h-4 mr-2" />
              Logout
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <div className="flex items-center gap-1">
          <Button 
            variant="ghost" 
            size="icon"
            onClick={() => onViewChange('status')}
            className={activeView === 'status' ? 'bg-[#128C7E]/10 text-[#128C7E]' : ''}
          >
            <Circle className="w-5 h-5" />
          </Button>
          <Button 
            variant="ghost" 
            size="icon"
            onClick={() => onViewChange('ai')}
            className={activeView === 'ai' ? 'bg-[#128C7E]/10 text-[#128C7E]' : ''}
          >
            <Bot className="w-5 h-5" />
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <MoreVertical className="w-5 h-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setShowNewGroup(true)}>
                <Users className="w-4 h-4 mr-2" />
                New Group
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onViewChange('settings')}>
                <Settings className="w-4 h-4 mr-2" />
                Settings
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Status Bar */}
      {recentStatuses.length > 0 && (
        <div className="px-3 py-2 bg-white dark:bg-[#111b21] border-b border-gray-100 dark:border-gray-800">
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
            <div 
              className="flex flex-col items-center cursor-pointer min-w-[60px]"
              onClick={() => onViewChange('status')}
            >
              <div className="w-14 h-14 rounded-full bg-gradient-to-br from-[#128C7E] to-[#075E54] flex items-center justify-center border-2 border-dashed border-[#128C7E]">
                <Plus className="w-6 h-6 text-white" />
              </div>
              <span className="text-xs mt-1 text-gray-600 dark:text-gray-400">My Status</span>
            </div>
            {recentStatuses.slice(0, 5).map((status) => {
              const user = users.find(u => u.id === status.userId);
              if (!user || user.id === currentUser?.id) return null;
              return (
                <div 
                  key={status.id}
                  className="flex flex-col items-center cursor-pointer min-w-[60px]"
                  onClick={() => onViewChange('status')}
                >
                  <div className="w-14 h-14 rounded-full bg-gradient-to-br from-[#128C7E] to-[#25D366] p-[2px]">
                    <div className="w-full h-full rounded-full bg-white dark:bg-[#111b21] flex items-center justify-center">
                      <span className={`w-12 h-12 rounded-full ${getAvatarColor(user.username)} flex items-center justify-center text-white font-semibold text-sm`}>
                        {getInitials(user.displayName || user.username)}
                      </span>
                    </div>
                  </div>
                  <span className="text-xs mt-1 text-gray-600 dark:text-gray-400 truncate max-w-[60px]">
                    {user.displayName || user.username}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Search Bar */}
      <div className="p-3 bg-white dark:bg-[#111b21]">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            placeholder="Search or start new chat"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 bg-[#f0f2f5] dark:bg-[#202c33] border-0 focus:ring-1 focus:ring-[#128C7E]"
          />
        </div>
      </div>

      {/* Chat List */}
      <ScrollArea className="flex-1">
        <div className="divide-y divide-gray-100 dark:divide-gray-800">
          {/* AI Assistant */}
          <button
            onClick={() => onViewChange('ai')}
            className={`w-full p-3 flex items-center gap-3 hover:bg-gray-50 dark:hover:bg-[#202c33] transition-colors ${
              activeView === 'ai' ? 'bg-[#128C7E]/10' : ''
            }`}
          >
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#128C7E] to-[#075E54] flex items-center justify-center">
              <Bot className="w-6 h-6 text-white" />
            </div>
            <div className="flex-1 text-left">
              <div className="flex items-center justify-between">
                <span className="font-medium text-gray-900 dark:text-white">ChatFlow AI</span>
              </div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Your personal assistant</p>
            </div>
          </button>

          {/* Chats */}
          {sortedChats.map((chat) => {
            const info = getChatDisplayInfo(chat);
            const isSelected = selectedChatId === chat.id;

            return (
              <button
                key={chat.id}
                onClick={() => {
                  selectChat(chat.id);
                  onViewChange('chats');
                }}
                className={`w-full p-3 flex items-center gap-3 hover:bg-gray-50 dark:hover:bg-[#202c33] transition-colors ${
                  isSelected ? 'bg-[#128C7E]/10' : ''
                }`}
              >
                <div className="relative">
                  <Avatar className="w-12 h-12">
                    <AvatarFallback className={`${info.color} text-white font-semibold`}>
                      {info.initials}
                    </AvatarFallback>
                  </Avatar>
                  {info.isOnline && (
                    <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-white dark:border-[#111b21]" />
                  )}
                </div>
                <div className="flex-1 min-w-0 text-left">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-gray-900 dark:text-white truncate">
                      {info.name}
                    </span>
                    {chat.lastMessage && (
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        {formatChatListTime(new Date(chat.lastMessage.createdAt))}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center justify-between">
                    <p className={`text-sm truncate ${chat.unreadCount > 0 ? 'text-gray-900 dark:text-white font-medium' : 'text-gray-500 dark:text-gray-400'}`}>
                      {getLastMessagePreview(chat)}
                    </p>
                    {chat.unreadCount > 0 && (
                      <span className="ml-2 px-2 py-0.5 bg-[#128C7E] text-white text-xs rounded-full min-w-[20px] text-center">
                        {chat.unreadCount}
                      </span>
                    )}
                    {chat.isMuted && (
                      <span className="ml-2 text-gray-400">
                        <ChevronDown className="w-4 h-4" />
                      </span>
                    )}
                  </div>
                </div>
              </button>
            );
          })}

          {sortedChats.length === 0 && !searchQuery && (
            <div className="p-8 text-center text-gray-500 dark:text-gray-400">
              <MessageSquare className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>No chats yet</p>
              <p className="text-sm mt-1">Start a new conversation</p>
              <Button 
                onClick={() => setShowNewChat(true)}
                className="mt-4 bg-[#128C7E] hover:bg-[#075E54]"
              >
                <Plus className="w-4 h-4 mr-2" />
                New Chat
              </Button>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Floating Action Button */}
      <div className="absolute bottom-6 right-6">
        <Button
          onClick={() => setShowNewChat(true)}
          className="w-14 h-14 rounded-full bg-[#128C7E] hover:bg-[#075E54] shadow-lg"
        >
          <MessageSquare className="w-6 h-6" />
        </Button>
      </div>

      {/* Dialogs */}
      <NewChatDialog open={showNewChat} onClose={() => setShowNewChat(false)} />
      <NewGroupDialog open={showNewGroup} onClose={() => setShowNewGroup(false)} />
    </>
  );
}
