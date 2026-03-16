import { useState } from 'react';
import { useAuthStore } from '@/store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ArrowLeft, Camera, Edit2, Check, X } from 'lucide-react';
import { getInitials, getAvatarColor } from '@/lib/utils';

interface UserProfileProps {
  onBack: () => void;
}

export function UserProfile({ onBack }: UserProfileProps) {
  const { currentUser, updateUser } = useAuthStore();
  const [isEditingName, setIsEditingName] = useState(false);
  const [isEditingBio, setIsEditingBio] = useState(false);
  const [displayName, setDisplayName] = useState(currentUser?.displayName || '');
  const [bio, setBio] = useState(currentUser?.bio || '');

  const handleSaveName = () => {
    updateUser({ displayName: displayName.trim() || currentUser?.username });
    setIsEditingName(false);
  };

  const handleSaveBio = () => {
    updateUser({ bio: bio.trim() });
    setIsEditingBio(false);
  };

  const handleCancelName = () => {
    setDisplayName(currentUser?.displayName || '');
    setIsEditingName(false);
  };

  const handleCancelBio = () => {
    setBio(currentUser?.bio || '');
    setIsEditingBio(false);
  };

  return (
    <div className="flex flex-col h-full bg-[#f0f2f5] dark:bg-[#0b141a]">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 bg-[#f0f2f5] dark:bg-[#202c33] border-b border-gray-200 dark:border-gray-700">
        <Button variant="ghost" size="icon" onClick={onBack}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <h3 className="font-medium text-gray-900 dark:text-white">Profile</h3>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4 space-y-4">
          {/* Avatar Section */}
          <div className="flex flex-col items-center py-6">
            <div className="relative">
              <div className={`w-32 h-32 rounded-full ${getAvatarColor(currentUser?.username || '')} flex items-center justify-center text-white text-4xl font-bold shadow-lg`}>
                {getInitials(currentUser?.displayName || currentUser?.username || 'U')}
              </div>
              <button className="absolute bottom-0 right-0 w-10 h-10 bg-[#128C7E] rounded-full flex items-center justify-center shadow-lg hover:bg-[#075E54] transition-colors">
                <Camera className="w-5 h-5 text-white" />
              </button>
            </div>
            <p className="mt-4 text-sm text-gray-500 dark:text-gray-400">
              Your avatar is automatically generated from your name
            </p>
          </div>

          {/* Name Section */}
          <div className="bg-white dark:bg-[#202c33] rounded-lg p-4">
            <Label className="text-xs text-[#128C7E] uppercase font-medium mb-2 block">
              Your Name
            </Label>
            {isEditingName ? (
              <div className="flex items-center gap-2">
                <Input
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="flex-1"
                  autoFocus
                />
                <Button size="icon" variant="ghost" onClick={handleSaveName} className="text-green-600">
                  <Check className="w-5 h-5" />
                </Button>
                <Button size="icon" variant="ghost" onClick={handleCancelName} className="text-red-600">
                  <X className="w-5 h-5" />
                </Button>
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <p className="text-gray-900 dark:text-white">{currentUser?.displayName || currentUser?.username}</p>
                <Button size="icon" variant="ghost" onClick={() => setIsEditingName(true)}>
                  <Edit2 className="w-4 h-4 text-gray-400" />
                </Button>
              </div>
            )}
          </div>

          {/* Username Section */}
          <div className="bg-white dark:bg-[#202c33] rounded-lg p-4">
            <Label className="text-xs text-[#128C7E] uppercase font-medium mb-2 block">
              Username
            </Label>
            <p className="text-gray-900 dark:text-white">@{currentUser?.username}</p>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              This is your unique identifier
            </p>
          </div>

          {/* Bio Section */}
          <div className="bg-white dark:bg-[#202c33] rounded-lg p-4">
            <Label className="text-xs text-[#128C7E] uppercase font-medium mb-2 block">
              About
            </Label>
            {isEditingBio ? (
              <div className="flex items-center gap-2">
                <Input
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  className="flex-1"
                  placeholder="Hey there! I am using ChatFlow."
                  maxLength={139}
                  autoFocus
                />
                <Button size="icon" variant="ghost" onClick={handleSaveBio} className="text-green-600">
                  <Check className="w-5 h-5" />
                </Button>
                <Button size="icon" variant="ghost" onClick={handleCancelBio} className="text-red-600">
                  <X className="w-5 h-5" />
                </Button>
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <p className="text-gray-900 dark:text-white">
                  {currentUser?.bio || 'Hey there! I am using ChatFlow.'}
                </p>
                <Button size="icon" variant="ghost" onClick={() => setIsEditingBio(true)}>
                  <Edit2 className="w-4 h-4 text-gray-400" />
                </Button>
              </div>
            )}
          </div>

          {/* Account Info */}
          <div className="bg-white dark:bg-[#202c33] rounded-lg p-4">
            <Label className="text-xs text-[#128C7E] uppercase font-medium mb-2 block">
              Account Info
            </Label>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-500 dark:text-gray-400">Joined</span>
                <span className="text-gray-900 dark:text-white">
                  {currentUser?.createdAt ? new Date(currentUser.createdAt).toLocaleDateString() : 'Unknown'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500 dark:text-gray-400">Status</span>
                <span className="text-green-500">Active</span>
              </div>
            </div>
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}
