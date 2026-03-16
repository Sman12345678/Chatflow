import { useState, useRef, useEffect } from 'react';
import { useAuthStore, useChatStore, useUIStore } from '@/store';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { detectVideoUrl, createVideoMessage } from '@/lib/videoProcessor';
import { Input } from '@/components/ui/input';
import { 
  MoreVertical, 
  Phone, 
  Video, 
  Search, 
  Smile, 
  Paperclip, 
  Mic, 
  Send,
  ArrowLeft,
  Gamepad2,
  X,
  Edit2,
  Reply
} from 'lucide-react';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { getInitials, getAvatarColor, formatLastSeen } from '@/lib/utils';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { MessageBubble } from './MessageBubble';
import { GameMenu } from '../games/GameMenu';
import EmojiPicker from 'emoji-picker-react';
// Message type is used via the store

interface ChatWindowProps {
  chatId: string;
  onBack?: () => void;
}

export function ChatWindow({ chatId, onBack }: ChatWindowProps) {
  const { currentUser, getUserById } = useAuthStore();
  const { 
    getChatMessages, 
    sendMessage, 
    deleteMessage, 
    editMessage,
    addReaction,
    setTyping,
    chats,
    muteChat,
    unmuteChat
  } = useChatStore();
  const { 
    showEmojiPicker, 
    setShowEmojiPicker, 
    replyToMessage, 
    setReplyToMessage,
    editingMessage,
    setEditingMessage,
    showGameMenu,
    setShowGameMenu
  } = useUIStore();
  
  const [messageText, setMessageText] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const chat = chats.find(c => c.id === chatId);
  const messages = getChatMessages(chatId);

  const chatInfo = (() => {
    if (!chat) return null;
    
    if (chat.type === 'group') {
      return {
        name: chat.name || 'Group',
        avatar: chat.avatar,
        initials: getInitials(chat.name || 'G'),
        color: getAvatarColor(chat.name || 'Group'),
        subtitle: `${chat.participants.length} participants`,
        isOnline: false,
      };
    } else {
      const otherUserId = chat.participants.find(id => id !== currentUser?.id);
      const otherUser = getUserById(otherUserId || '');
      return {
        name: otherUser?.displayName || otherUser?.username || 'Unknown',
        avatar: undefined,
        initials: getInitials(otherUser?.displayName || otherUser?.username || 'U'),
        color: getAvatarColor(otherUser?.username || 'Unknown'),
        subtitle: otherUser?.isOnline ? 'online' : otherUser?.lastSeen ? `last seen ${formatLastSeen(otherUser.lastSeen)}` : 'offline',
        isOnline: otherUser?.isOnline,
        status: otherUser?.status,
      };
    }
  })();

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Focus input when editing
  useEffect(() => {
    if (editingMessage) {
      setMessageText(editingMessage.content);
      inputRef.current?.focus();
    }
  }, [editingMessage]);

  const handleSendMessage = async () => {
  if (!messageText.trim()) return;

  let messageType: MessageType = 'text';
  let videoMetadata: VideoMetadata | undefined;

  // Check for video URL
  const videoMatch = detectVideoUrl(messageText.trim());
  if (videoMatch) {
    try {
      videoMetadata = await createVideoMessage(videoMatch.url, videoMatch.platform, currentUser?.id || '');
      messageType = 'video';
    } catch (error) {
      alert(`Error: ${error instanceof Error ? error.message : 'Failed to process video'}`);
      return;
    }
  }

  if (editingMessage) {
    editMessage(chatId, editingMessage.id, messageText.trim());
    setEditingMessage(null);
  } else {
    const content = replyToMessage 
      ? `[reply:${replyToMessage.id}]${messageText.trim()}` 
      : messageText.trim();
    
    const msg = sendMessage(chatId, content, messageType);
    if (videoMetadata) {
      msg.videoMetadata = videoMetadata;
    }
    setReplyToMessage(null);
  }
  
  setMessageText('');
  setShowEmojiPicker(false);
};

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleEmojiClick = (emojiData: any) => {
    setMessageText(prev => prev + emojiData.emoji);
    inputRef.current?.focus();
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Simulate file upload
    const isImage = file.type.startsWith('image/');
    sendMessage(
      chatId, 
      isImage ? 'Image' : file.name, 
      isImage ? 'image' : 'file',
      { fileName: file.name, fileSize: file.size }
    );
    
    e.target.value = '';
  };

  const handleReaction = (messageId: string, emoji: string) => {
    addReaction(chatId, messageId, emoji);
  };

  if (!chat || !chatInfo) {
    return (
      <div className="flex-1 flex items-center justify-center bg-[#f0f2f5] dark:bg-[#0b141a]">
        <p className="text-gray-500">Chat not found</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-[#f0f2f5] dark:bg-[#0b141a]">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-[#f0f2f5] dark:bg-[#202c33] border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-3">
          {onBack && (
            <Button variant="ghost" size="icon" onClick={onBack} className="md:hidden">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          )}
          <div className="relative">
            <Avatar className="w-10 h-10">
              <AvatarFallback className={`${chatInfo.color} text-white font-semibold`}>
                {chatInfo.initials}
              </AvatarFallback>
            </Avatar>
            {chatInfo.isOnline && (
              <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-[#f0f2f5] dark:border-[#202c33]" />
            )}
          </div>
          <div>
            <h3 className="font-medium text-gray-900 dark:text-white">{chatInfo.name}</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">{chatInfo.subtitle}</p>
          </div>
        </div>
        
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="hidden sm:flex">
            <Phone className="w-5 h-5" />
          </Button>
          <Button variant="ghost" size="icon" className="hidden sm:flex">
            <Video className="w-5 h-5" />
          </Button>
          <Button variant="ghost" size="icon" className="hidden sm:flex">
            <Search className="w-5 h-5" />
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <MoreVertical className="w-5 h-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {chat.type === 'group' && (
                <DropdownMenuItem>Group Info</DropdownMenuItem>
              )}
              <DropdownMenuItem onClick={() => chat.isMuted ? unmuteChat(chatId) : muteChat(chatId)}>
                {chat.isMuted ? 'Unmute' : 'Mute'} Notifications
              </DropdownMenuItem>
              <DropdownMenuItem className="text-red-600">Clear Chat</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Messages Area */}
      <ScrollArea className="flex-1 px-4 py-4">
        <div className="space-y-1">
          {messages.map((message, index) => {
            const showDate = index === 0 || 
              new Date(message.createdAt).toDateString() !== 
              new Date(messages[index - 1].createdAt).toDateString();

            return (
              <div key={message.id}>
                {showDate && (
                  <div className="flex justify-center my-4">
                    <span className="px-3 py-1 bg-[#e1f2fb] dark:bg-[#202c33] text-xs text-gray-600 dark:text-gray-400 rounded-full">
                      {new Date(message.createdAt).toLocaleDateString('en-US', { 
                        weekday: 'long', 
                        year: 'numeric', 
                        month: 'long', 
                        day: 'numeric' 
                      })}
                    </span>
                  </div>
                )}
                <MessageBubble
                  message={message}
                  isOwn={message.senderId === currentUser?.id}
                  sender={getUserById(message.senderId)}
                  onReply={() => setReplyToMessage(message)}
                  onEdit={() => setEditingMessage(message)}
                  onDelete={() => deleteMessage(chatId, message.id, true)}
                  onReaction={(emoji) => handleReaction(message.id, emoji)}
                />
              </div>
            );
          })}
          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>

      {/* Reply/Edit Banner */}
      {(replyToMessage || editingMessage) && (
        <div className="px-4 py-2 bg-[#f0f2f5] dark:bg-[#202c33] border-t border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm">
            {editingMessage ? (
              <>
                <Edit2 className="w-4 h-4 text-[#128C7E]" />
                <span className="text-gray-600 dark:text-gray-400">Editing message</span>
              </>
            ) : (
              <>
                <Reply className="w-4 h-4 text-[#128C7E]" />
                <span className="text-gray-600 dark:text-gray-400">
                  Replying to {replyToMessage?.senderId === currentUser?.id ? 'yourself' : getUserById(replyToMessage?.senderId || '')?.displayName}
                </span>
              </>
            )}
          </div>
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-6 w-6"
            onClick={() => {
              setReplyToMessage(null);
              setEditingMessage(null);
              setMessageText('');
            }}
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      )}

      {/* Game Menu */}
      {showGameMenu && (
        <GameMenu 
          chatId={chatId} 
          onClose={() => setShowGameMenu(false)} 
        />
      )}

      {/* Emoji Picker */}
      {showEmojiPicker && (
        <div className="absolute bottom-20 right-4 z-50">
          <EmojiPicker 
            onEmojiClick={handleEmojiClick}
            width={300}
            height={400}
          />
        </div>
      )}

      {/* Input Area */}
      <div className="px-4 py-3 bg-[#f0f2f5] dark:bg-[#202c33]">
        <div className="flex items-end gap-2">
          <Button 
            variant="ghost" 
            size="icon"
            onClick={() => setShowEmojiPicker(!showEmojiPicker)}
            className={showEmojiPicker ? 'text-[#128C7E]' : ''}
          >
            <Smile className="w-6 h-6" />
          </Button>
          
          <Button 
            variant="ghost" 
            size="icon"
            onClick={() => fileInputRef.current?.click()}
          >
            <Paperclip className="w-6 h-6" />
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            onChange={handleFileSelect}
            accept="image/*,video/*,audio/*,.pdf,.doc,.docx"
          />

          <Button 
            variant="ghost" 
            size="icon"
            onClick={() => setShowGameMenu(!showGameMenu)}
            className={showGameMenu ? 'text-[#128C7E]' : ''}
          >
            <Gamepad2 className="w-6 h-6" />
          </Button>

          <div className="flex-1 bg-white dark:bg-[#2a3942] rounded-full px-4 py-2">
            <Input
              ref={inputRef}
              value={messageText}
              onChange={(e) => {
                setMessageText(e.target.value);
                // Simulate typing indicator
                if (currentUser) {
                  setTyping(chatId, currentUser.id, true);
                  setTimeout(() => setTyping(chatId, currentUser.id, false), 2000);
                }
              }}
              onKeyDown={handleKeyDown}
              placeholder="Type a message"
              className="border-0 bg-transparent focus-visible:ring-0 px-0 py-0 h-auto"
            />
          </div>

          {messageText.trim() ? (
            <Button 
              variant="ghost" 
              size="icon"
              onClick={handleSendMessage}
              className="bg-[#128C7E] hover:bg-[#075E54] text-white rounded-full"
            >
              <Send className="w-5 h-5" />
            </Button>
          ) : (
            <Button 
              variant="ghost" 
              size="icon"
              onMouseDown={() => setIsRecording(true)}
              onMouseUp={() => setIsRecording(false)}
              onTouchStart={() => setIsRecording(true)}
              onTouchEnd={() => setIsRecording(false)}
              className={isRecording ? 'text-[#128C7E]' : ''}
            >
              <Mic className="w-6 h-6" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
