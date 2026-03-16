import { useState } from 'react';
import { useAuthStore, useStatusStore } from '@/store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ArrowLeft, Plus, Clock, Trash2 } from 'lucide-react';
import { getInitials, getAvatarColor, formatLastSeen } from '@/lib/utils';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

interface StatusViewProps {
  onBack: () => void;
}

export function StatusView({ onBack }: StatusViewProps) {
  const { currentUser, users } = useAuthStore();
  const { statuses, addStatus, deleteStatus, getRecentStatuses } = useStatusStore();
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [newStatusText, setNewStatusText] = useState('');
  const [viewingStatus, setViewingStatus] = useState<string | null>(null);

  const recentStatuses = getRecentStatuses();
  const myStatus = statuses.find(s => s.userId === currentUser?.id);

  const handleAddStatus = () => {
    if (!newStatusText.trim() || !currentUser) return;
    addStatus(currentUser.id, newStatusText.trim());
    setNewStatusText('');
    setShowAddDialog(false);
  };

  const handleDeleteStatus = (statusId: string) => {
    deleteStatus(statusId);
  };

  const getStatusUser = (userId: string) => users.find(u => u.id === userId);

  return (
    <div className="flex flex-col h-full bg-[#f0f2f5] dark:bg-[#0b141a]">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 bg-[#f0f2f5] dark:bg-[#202c33] border-b border-gray-200 dark:border-gray-700">
        <Button variant="ghost" size="icon" onClick={onBack} className="md:hidden">
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <h3 className="font-medium text-gray-900 dark:text-white">Status</h3>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4">
          {/* My Status */}
          <div className="mb-6">
            <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-3 uppercase">
              My Status
            </h4>
            <button
              onClick={() => myStatus ? setViewingStatus(myStatus.id) : setShowAddDialog(true)}
              className="w-full flex items-center gap-3 p-3 bg-white dark:bg-[#202c33] rounded-xl hover:bg-gray-50 dark:hover:bg-[#2a3942] transition-colors"
            >
              <div className="relative">
                <Avatar className="w-14 h-14">
                  <AvatarFallback className={`${getAvatarColor(currentUser?.username || '')} text-white font-semibold text-lg`}>
                    {getInitials(currentUser?.displayName || currentUser?.username || 'U')}
                  </AvatarFallback>
                </Avatar>
                <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-[#128C7E] rounded-full flex items-center justify-center border-2 border-white dark:border-[#202c33]">
                  <Plus className="w-3 h-3 text-white" />
                </div>
              </div>
              <div className="flex-1 text-left">
                <p className="font-medium text-gray-900 dark:text-white">My Status</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {myStatus ? 'Tap to view your status' : 'Tap to add status update'}
                </p>
              </div>
            </button>
          </div>

          {/* Recent Updates */}
          <div>
            <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-3 uppercase">
              Recent Updates
            </h4>
            <div className="space-y-2">
              {recentStatuses.filter(s => s.userId !== currentUser?.id).length === 0 ? (
                <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                  <p>No recent updates</p>
                  <p className="text-sm mt-1">Status updates disappear after 24 hours</p>
                </div>
              ) : (
                recentStatuses
                  .filter(s => s.userId !== currentUser?.id)
                  .map((status) => {
                    const user = getStatusUser(status.userId);
                    if (!user) return null;
                    
                    return (
                      <button
                        key={status.id}
                        onClick={() => setViewingStatus(status.id)}
                        className="w-full flex items-center gap-3 p-3 bg-white dark:bg-[#202c33] rounded-xl hover:bg-gray-50 dark:hover:bg-[#2a3942] transition-colors"
                      >
                        <div className="w-14 h-14 rounded-full bg-gradient-to-br from-[#128C7E] to-[#25D366] p-[2px]">
                          <div className="w-full h-full rounded-full bg-white dark:bg-[#202c33] flex items-center justify-center">
                            <span className={`w-12 h-12 rounded-full ${getAvatarColor(user.username)} flex items-center justify-center text-white font-semibold`}>
                              {getInitials(user.displayName || user.username)}
                            </span>
                          </div>
                        </div>
                        <div className="flex-1 text-left">
                          <p className="font-medium text-gray-900 dark:text-white">
                            {user.displayName || user.username}
                          </p>
                          <p className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {formatLastSeen(status.createdAt)}
                          </p>
                        </div>
                      </button>
                    );
                  })
              )}
            </div>
          </div>
        </div>
      </ScrollArea>

      {/* Add Status Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add Status Update</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <Input
              placeholder="What's on your mind?"
              value={newStatusText}
              onChange={(e) => setNewStatusText(e.target.value)}
              maxLength={139}
              className="h-20 resize-none"
            />
            <div className="flex justify-between items-center text-sm text-gray-500">
              <span>{newStatusText.length}/139</span>
              <span>Disappears after 24 hours</span>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowAddDialog(false)}>
                Cancel
              </Button>
              <Button 
                onClick={handleAddStatus}
                disabled={!newStatusText.trim()}
                className="bg-[#128C7E] hover:bg-[#075E54]"
              >
                Post Status
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* View Status Dialog */}
      <Dialog open={!!viewingStatus} onOpenChange={() => setViewingStatus(null)}>
        <DialogContent className="sm:max-w-md bg-[#128C7E]">
          {(() => {
            const status = statuses.find(s => s.id === viewingStatus);
            if (!status) return null;
            
            const user = getStatusUser(status.userId);
            const isMyStatus = status.userId === currentUser?.id;
            
            return (
              <div className="text-white">
                <div className="flex items-center gap-3 mb-6">
                  <Avatar className="w-10 h-10">
                    <AvatarFallback className={`${getAvatarColor(user?.username || '')} text-white font-semibold`}>
                      {getInitials(user?.displayName || user?.username || 'U')}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium">{user?.displayName || user?.username}</p>
                    <p className="text-sm text-white/70">{formatLastSeen(status.createdAt)}</p>
                  </div>
                  {isMyStatus && (
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="ml-auto text-white hover:bg-white/20"
                      onClick={() => handleDeleteStatus(status.id)}
                    >
                      <Trash2 className="w-5 h-5" />
                    </Button>
                  )}
                </div>
                <div className="text-center py-12">
                  <p className="text-2xl font-medium">{status.text}</p>
                </div>
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>
    </div>
  );
}
