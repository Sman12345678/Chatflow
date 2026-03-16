import { useState } from 'react';
import { useAuthStore, useSettingsStore } from '@/store';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  ArrowLeft, 
  Moon, 
  Sun, 
  Monitor, 
  Bell, 
  Volume2, 
  Vibrate,
  CheckCheck,
  Clock,
  User,
  ChevronRight,
  Type,
  MessageSquare
} from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface SettingsPanelProps {
  onBack: () => void;
}

export function SettingsPanel({ onBack }: SettingsPanelProps) {
  const { currentUser } = useAuthStore();
  const { settings, updateSettings } = useSettingsStore();
  const [activeSection, setActiveSection] = useState<'main' | 'notifications' | 'privacy' | 'appearance'>('main');

  const themeIcons = {
    light: <Sun className="w-5 h-5" />,
    dark: <Moon className="w-5 h-5" />,
    system: <Monitor className="w-5 h-5" />,
  };

  const renderMainSettings = () => (
    <div className="space-y-1">
      {/* Profile Section */}
      <button 
        onClick={() => onBack()}
        className="w-full flex items-center gap-4 p-4 bg-white dark:bg-[#202c33] hover:bg-gray-50 dark:hover:bg-[#2a3942] transition-colors"
      >
        <div className={`w-14 h-14 rounded-full bg-gradient-to-br from-[#128C7E] to-[#075E54] flex items-center justify-center text-white text-xl font-semibold`}>
          {currentUser?.displayName?.[0] || currentUser?.username?.[0] || 'U'}
        </div>
        <div className="flex-1 text-left">
          <p className="font-medium text-gray-900 dark:text-white">{currentUser?.displayName || currentUser?.username}</p>
          <p className="text-sm text-gray-500 dark:text-gray-400">{currentUser?.bio || 'Hey there! I am using ChatFlow.'}</p>
        </div>
        <ChevronRight className="w-5 h-5 text-gray-400" />
      </button>

      <Separator />

      {/* Settings Categories */}
      <button 
        onClick={() => setActiveSection('notifications')}
        className="w-full flex items-center gap-4 p-4 bg-white dark:bg-[#202c33] hover:bg-gray-50 dark:hover:bg-[#2a3942] transition-colors"
      >
        <div className="w-10 h-10 rounded-full bg-[#128C7E]/10 flex items-center justify-center">
          <Bell className="w-5 h-5 text-[#128C7E]" />
        </div>
        <div className="flex-1 text-left">
          <p className="font-medium text-gray-900 dark:text-white">Notifications</p>
          <p className="text-sm text-gray-500 dark:text-gray-400">Message, group & call tones</p>
        </div>
        <ChevronRight className="w-5 h-5 text-gray-400" />
      </button>

      <button 
        onClick={() => setActiveSection('privacy')}
        className="w-full flex items-center gap-4 p-4 bg-white dark:bg-[#202c33] hover:bg-gray-50 dark:hover:bg-[#2a3942] transition-colors"
      >
        <div className="w-10 h-10 rounded-full bg-[#128C7E]/10 flex items-center justify-center">
          <User className="w-5 h-5 text-[#128C7E]" />
        </div>
        <div className="flex-1 text-left">
          <p className="font-medium text-gray-900 dark:text-white">Privacy</p>
          <p className="text-sm text-gray-500 dark:text-gray-400">Last seen, profile photo & status</p>
        </div>
        <ChevronRight className="w-5 h-5 text-gray-400" />
      </button>

      <button 
        onClick={() => setActiveSection('appearance')}
        className="w-full flex items-center gap-4 p-4 bg-white dark:bg-[#202c33] hover:bg-gray-50 dark:hover:bg-[#2a3942] transition-colors"
      >
        <div className="w-10 h-10 rounded-full bg-[#128C7E]/10 flex items-center justify-center">
          {themeIcons[settings.theme]}
        </div>
        <div className="flex-1 text-left">
          <p className="font-medium text-gray-900 dark:text-white">Appearance</p>
          <p className="text-sm text-gray-500 dark:text-gray-400">Theme & font size</p>
        </div>
        <ChevronRight className="w-5 h-5 text-gray-400" />
      </button>

      <Separator />

      {/* App Info */}
      <div className="p-4 text-center">
        <p className="text-sm text-gray-500 dark:text-gray-400">ChatFlow</p>
        <p className="text-xs text-gray-400 dark:text-gray-500">Version 1.0.0</p>
      </div>
    </div>
  );

  const renderNotificationSettings = () => (
    <div className="space-y-1">
      <div className="flex items-center justify-between p-4 bg-white dark:bg-[#202c33]">
        <div className="flex items-center gap-3">
          <Bell className="w-5 h-5 text-gray-500" />
          <div>
            <p className="font-medium text-gray-900 dark:text-white">Notifications</p>
            <p className="text-sm text-gray-500">Show notifications for new messages</p>
          </div>
        </div>
        <Switch 
          checked={settings.notifications}
          onCheckedChange={(checked) => updateSettings({ notifications: checked })}
        />
      </div>

      <div className="flex items-center justify-between p-4 bg-white dark:bg-[#202c33]">
        <div className="flex items-center gap-3">
          <Volume2 className="w-5 h-5 text-gray-500" />
          <div>
            <p className="font-medium text-gray-900 dark:text-white">Notification Sound</p>
            <p className="text-sm text-gray-500">Play sound for new messages</p>
          </div>
        </div>
        <Switch 
          checked={settings.notificationSound}
          onCheckedChange={(checked) => updateSettings({ notificationSound: checked })}
        />
      </div>

      <div className="flex items-center justify-between p-4 bg-white dark:bg-[#202c33]">
        <div className="flex items-center gap-3">
          <Vibrate className="w-5 h-5 text-gray-500" />
          <div>
            <p className="font-medium text-gray-900 dark:text-white">Vibration</p>
            <p className="text-sm text-gray-500">Vibrate on new messages</p>
          </div>
        </div>
        <Switch 
          checked={settings.vibration}
          onCheckedChange={(checked) => updateSettings({ vibration: checked })}
        />
      </div>

      <div className="flex items-center justify-between p-4 bg-white dark:bg-[#202c33]">
        <div className="flex items-center gap-3">
          <MessageSquare className="w-5 h-5 text-gray-500" />
          <div>
            <p className="font-medium text-gray-900 dark:text-white">Show Preview</p>
            <p className="text-sm text-gray-500">Show message content in notifications</p>
          </div>
        </div>
        <Switch 
          checked={settings.showPreview}
          onCheckedChange={(checked) => updateSettings({ showPreview: checked })}
        />
      </div>
    </div>
  );

  const renderPrivacySettings = () => (
    <div className="space-y-1">
      <div className="flex items-center justify-between p-4 bg-white dark:bg-[#202c33]">
        <div className="flex items-center gap-3">
          <Clock className="w-5 h-5 text-gray-500" />
          <div>
            <p className="font-medium text-gray-900 dark:text-white">Last Seen</p>
            <p className="text-sm text-gray-500">Who can see your last seen</p>
          </div>
        </div>
        <Select 
          value={settings.lastSeenVisibility}
          onValueChange={(value: any) => updateSettings({ lastSeenVisibility: value })}
        >
          <SelectTrigger className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="everyone">Everyone</SelectItem>
            <SelectItem value="contacts">Contacts</SelectItem>
            <SelectItem value="nobody">Nobody</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="flex items-center justify-between p-4 bg-white dark:bg-[#202c33]">
        <div className="flex items-center gap-3">
          <User className="w-5 h-5 text-gray-500" />
          <div>
            <p className="font-medium text-gray-900 dark:text-white">Profile Photo</p>
            <p className="text-sm text-gray-500">Who can see your profile photo</p>
          </div>
        </div>
        <Select 
          value={settings.profilePhotoVisibility}
          onValueChange={(value: any) => updateSettings({ profilePhotoVisibility: value })}
        >
          <SelectTrigger className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="everyone">Everyone</SelectItem>
            <SelectItem value="contacts">Contacts</SelectItem>
            <SelectItem value="nobody">Nobody</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="flex items-center justify-between p-4 bg-white dark:bg-[#202c33]">
        <div className="flex items-center gap-3">
          <CheckCheck className="w-5 h-5 text-gray-500" />
          <div>
            <p className="font-medium text-gray-900 dark:text-white">Read Receipts</p>
            <p className="text-sm text-gray-500">Show when you've read messages</p>
          </div>
        </div>
        <Switch 
          checked={settings.readReceipts}
          onCheckedChange={(checked) => updateSettings({ readReceipts: checked })}
        />
      </div>
    </div>
  );

  const renderAppearanceSettings = () => (
    <div className="space-y-1">
      <div className="p-4 bg-white dark:bg-[#202c33]">
        <div className="flex items-center gap-3 mb-4">
          {themeIcons[settings.theme]}
          <div>
            <p className="font-medium text-gray-900 dark:text-white">Theme</p>
            <p className="text-sm text-gray-500">Choose your preferred theme</p>
          </div>
        </div>
        <div className="flex gap-2">
          {(['light', 'dark', 'system'] as const).map((theme) => (
            <button
              key={theme}
              onClick={() => updateSettings({ theme })}
              className={`flex-1 p-3 rounded-lg border-2 transition-all ${
                settings.theme === theme 
                  ? 'border-[#128C7E] bg-[#128C7E]/10' 
                  : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
              }`}
            >
              <div className="flex flex-col items-center gap-2">
                {themeIcons[theme]}
                <span className="text-sm capitalize">{theme}</span>
              </div>
            </button>
          ))}
        </div>
      </div>

      <div className="flex items-center justify-between p-4 bg-white dark:bg-[#202c33]">
        <div className="flex items-center gap-3">
          <Type className="w-5 h-5 text-gray-500" />
          <div>
            <p className="font-medium text-gray-900 dark:text-white">Font Size</p>
            <p className="text-sm text-gray-500">Adjust text size</p>
          </div>
        </div>
        <Select 
          value={settings.fontSize}
          onValueChange={(value: any) => updateSettings({ fontSize: value })}
        >
          <SelectTrigger className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="small">Small</SelectItem>
            <SelectItem value="medium">Medium</SelectItem>
            <SelectItem value="large">Large</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );

  const sections: Record<string, { title: string; content: React.ReactNode }> = {
    main: { title: 'Settings', content: renderMainSettings() },
    notifications: { title: 'Notifications', content: renderNotificationSettings() },
    privacy: { title: 'Privacy', content: renderPrivacySettings() },
    appearance: { title: 'Appearance', content: renderAppearanceSettings() },
  };

  const currentSection = sections[activeSection];

  return (
    <div className="flex flex-col h-full bg-[#f0f2f5] dark:bg-[#0b141a]">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 bg-[#f0f2f5] dark:bg-[#202c33] border-b border-gray-200 dark:border-gray-700">
        <Button variant="ghost" size="icon" onClick={() => activeSection === 'main' ? onBack() : setActiveSection('main')}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <h3 className="font-medium text-gray-900 dark:text-white">{currentSection.title}</h3>
      </div>

      <ScrollArea className="flex-1">
        {currentSection.content}
      </ScrollArea>
    </div>
  );
}
