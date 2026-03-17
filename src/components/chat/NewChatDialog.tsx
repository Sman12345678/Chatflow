import { useState, useMemo } from 'react';
import { useAuthStore, useChatStore } from '@/store';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Search, UserPlus } from 'lucide-react';
import { getInitials, getAvatarColor } from '@/lib/utils';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useEffect } from 'react'; 

interface NewChatDialogProps {
  open: boolean;
  onClose: () => void;
}

export function NewChatDialog({ open, onClose }: NewChatDialogProps) {
  const { currentUser, users, fetchUsers } = useAuthStore();
  const { createPrivateChat, selectChat, chats } = useChatStore();
  const [searchQuery, setSearchQuery] = useState('');
  useEffect(() => {
  if (open) {
    fetchUsers();
  }
}, [open, fetchUsers]);

  const availableUsers = useMemo(() => {
    return users.filter(user => {
      if (user.id === currentUser?.id) return false;
      
      // Check if private chat already exists
  /*    const existingChat = chats.find(chat => 
        chat.type === 'private' && 
        chat.participants.includes(user.id) &&
        chat.participants.includes(currentUser?.id || '')
      );
      
   //   if (existingChat) return false;*/
      
      if (!searchQuery.trim()) return true;
      
      return (
        user.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.displayName.toLowerCase().includes(searchQuery.toLowerCase())
      );
    });
  }, [users, currentUser, chats, searchQuery]);

  const handleStartChat = async (userId: string) => {
    if (!currentUser) return;
    
    const chat = await createPrivateChat(currentUser.id, userId);
    selectChat(chat.id);
    onClose();
    setSearchQuery('');
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>New Chat</DialogTitle>
        </DialogHeader>
        
        <div className="relative my-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            placeholder="Search users..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
            autoFocus
          />
        </div>

        <ScrollArea className="flex-1 -mx-6 px-6">
          <div className="space-y-2">
            {availableUsers.map((user) => (
              <button
                key={user.id}
                onClick={() => handleStartChat(user.id)}
                className="w-full p-3 flex items-center gap-3 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-left"
              >
                <Avatar className="w-12 h-12">
                  <AvatarFallback className={`${getAvatarColor(user.username)} text-white font-semibold`}>
                    {getInitials(user.displayName || user.username)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <p className="font-medium text-gray-900 dark:text-white">
                    {user.displayName || user.username}
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    @{user.username}
                  </p>
                </div>
                <UserPlus className="w-5 h-5 text-gray-400" />
              </button>
            ))}

            {availableUsers.length === 0 && (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                {searchQuery ? 'No users found' : 'No new users available'}
              </div>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
