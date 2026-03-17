import { useState, useMemo } from 'react';
import { useAuthStore, useChatStore } from '@/store';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Search, Check, Users } from 'lucide-react';
import { getInitials, getAvatarColor } from '@/lib/utils';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Checkbox } from '@/components/ui/checkbox';

interface NewGroupDialogProps {
  open: boolean;
  onClose: () => void;
}

export function NewGroupDialog({ open, onClose }: NewGroupDialogProps) {
  const { currentUser, users } = useAuthStore();
  const { createGroupChat, selectChat } = useChatStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [groupName, setGroupName] = useState('');
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [step, setStep] = useState<1 | 2>(1);

  const availableUsers = useMemo(() => {
    return users.filter(user => {
      if (user.id === currentUser?.id) return false;
      
      if (!searchQuery.trim()) return true;
      
      return (
        user.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.displayName.toLowerCase().includes(searchQuery.toLowerCase())
      );
    });
  }, [users, currentUser, searchQuery]);

  const toggleUserSelection = (userId: string) => {
    setSelectedUsers(prev => 
      prev.includes(userId) 
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  const handleCreateGroup = () => {
    if (!currentUser || !groupName.trim() || selectedUsers.length === 0) return;
    
    const chat = await createGroupChat(
      groupName.trim(),
      [currentUser.id, ...selectedUsers],
      currentUser.id
    );
    selectChat(chat.id);
    handleClose();
  };

  const handleClose = () => {
    onClose();
    setSearchQuery('');
    setGroupName('');
    setSelectedUsers([]);
    setStep(1);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>
            {step === 1 ? 'Add Group Participants' : 'New Group'}
          </DialogTitle>
        </DialogHeader>
        
        {step === 1 ? (
          <>
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

            {selectedUsers.length > 0 && (
              <div className="flex items-center gap-2 mb-4 overflow-x-auto no-scrollbar">
                <span className="text-sm text-gray-500">Selected:</span>
                {selectedUsers.map(userId => {
                  const user = users.find(u => u.id === userId);
                  if (!user) return null;
                  return (
                    <span 
                      key={userId}
                      className="px-2 py-1 bg-[#128C7E]/10 text-[#128C7E] rounded-full text-sm flex items-center gap-1"
                    >
                      {user.displayName || user.username}
                      <button 
                        onClick={() => toggleUserSelection(userId)}
                        className="hover:text-red-500"
                      >
                        ×
                      </button>
                    </span>
                  );
                })}
              </div>
            )}

            <ScrollArea className="flex-1 -mx-6 px-6">
              <div className="space-y-2">
                {availableUsers.map((user) => (
                  <label
                    key={user.id}
                    className="w-full p-3 flex items-center gap-3 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors cursor-pointer"
                  >
                    <Checkbox
                      checked={selectedUsers.includes(user.id)}
                      onCheckedChange={() => toggleUserSelection(user.id)}
                    />
                    <Avatar className="w-10 h-10">
                      <AvatarFallback className={`${getAvatarColor(user.username)} text-white font-semibold text-sm`}>
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
                  </label>
                ))}

                {availableUsers.length === 0 && (
                  <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                    No users found
                  </div>
                )}
              </div>
            </ScrollArea>

            <div className="flex justify-end gap-2 mt-4">
              <Button variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button 
                onClick={() => setStep(2)}
                disabled={selectedUsers.length === 0}
                className="bg-[#128C7E] hover:bg-[#075E54]"
              >
                Next
                <Check className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </>
        ) : (
          <>
            <div className="my-4 space-y-4">
              <div className="flex justify-center">
                <div className="w-20 h-20 rounded-full bg-[#128C7E]/10 flex items-center justify-center">
                  <Users className="w-10 h-10 text-[#128C7E]" />
                </div>
              </div>
              <Input
                placeholder="Group Subject"
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                className="text-center"
                autoFocus
              />
              <p className="text-center text-sm text-gray-500">
                {selectedUsers.length + 1} participants
              </p>
            </div>

            <div className="flex justify-end gap-2 mt-4">
              <Button variant="outline" onClick={() => setStep(1)}>
                Back
              </Button>
              <Button 
                onClick={handleCreateGroup}
                disabled={!groupName.trim()}
                className="bg-[#128C7E] hover:bg-[#075E54]"
              >
                Create Group
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
