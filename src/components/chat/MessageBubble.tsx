import { useState } from 'react';
import { 
  Check, 
  CheckCheck, 
  MoreVertical, 
  Reply, 
  Edit2, 
  Trash2, 
  Copy,
  Forward
} from 'lucide-react';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { formatMessageTime, getInitials, getAvatarColor } from '@/lib/utils';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import type { Message, User } from '@/types';
import { ExternalLink, Download } from 'lucide-react';

interface MessageBubbleProps {
  message: Message;
  isOwn: boolean;
  sender?: User;
  onReply: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onReaction: (emoji: string) => void;
}

const REACTIONS = ['❤️', '👍', '😂', '😮', '😢', '🙏'];

export function MessageBubble({ 
  message, 
  isOwn, 
  sender, 
  onReply, 
  onEdit, 
  onDelete, 
  onReaction 
}: MessageBubbleProps) {
  const [showReactions, setShowReactions] = useState(false);

  const getStatusIcon = () => {
    switch (message.status) {
      case 'sent':
        return <Check className="w-3 h-3 text-gray-400" />;
      case 'delivered':
        return <CheckCheck className="w-3 h-3 text-gray-400" />;
      case 'read':
        return <CheckCheck className="w-3 h-3 text-blue-500" />;
      default:
        return null;
    }
  };

  const parseReplyContent = (content: string) => {
    const replyMatch = content.match(/^\[reply:([^\]]+)\](.*)$/);
    if (replyMatch) {
      return {
        replyToId: replyMatch[1],
        actualContent: replyMatch[2],
      };
    }
    return { replyToId: null, actualContent: content };
  };

  const { replyToId, actualContent } = parseReplyContent(message.content);

  const renderContent = () => {
    if (message.isDeleted) {
      return (
        <span className="italic text-gray-400">
          This message was deleted
        </span>
      );
    }

    switch (message.type) {
      case 'image':
        return (
          <div className="space-y-1">
            <div className="bg-gray-200 dark:bg-gray-700 rounded-lg overflow-hidden max-w-[300px]">
              <div className="aspect-video flex items-center justify-center">
                <span className="text-4xl">🖼️</span>
              </div>
            </div>
            {actualContent !== 'Image' && (
              <p className="text-sm">{actualContent}</p>
            )}
          </div>
        );
      case 'file':
        return (
          <div className="flex items-center gap-3 bg-gray-100 dark:bg-gray-800 p-3 rounded-lg">
            <div className="w-10 h-10 bg-[#128C7E] rounded-lg flex items-center justify-center">
              <span className="text-white text-lg">📎</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{message.fileName || 'File'}</p>
              <p className="text-xs text-gray-500">
                {message.fileSize ? `${(message.fileSize / 1024).toFixed(1)} KB` : 'Unknown size'}
              </p>
            </div>
          </div>
        );
      case 'voice':
        return (
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#128C7E] rounded-full flex items-center justify-center">
              <span className="text-white">🎤</span>
            </div>
            <div className="flex-1">
              <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded-full flex items-center px-3">
                <div className="flex gap-0.5">
                  {Array.from({ length: 20 }).map((_, i) => (
                    <div 
                      key={i}
                      className="w-1 bg-[#128C7E] rounded-full"
                      style={{ height: `${Math.random() * 20 + 5}px` }}
                    />
                  ))}
                </div>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                {message.duration ? `${message.duration}"` : 'Voice message'}
              </p>
            </div>
          </div>
        );
      case 'game':
        return (
          <div className="bg-gradient-to-br from-[#128C7E]/20 to-[#075E54]/20 p-4 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-2xl">🎮</span>
              <span className="font-medium">Game Invitation</span>
            </div>
            <p className="text-sm">{actualContent}</p>
            <Button size="sm" className="mt-2 bg-[#128C7E] hover:bg-[#075E54]">
              Play Now
            </Button>
          </div>
        );
     case 'video': {
  const isExpired = message.videoMetadata?.expiresAt && new Date() > new Date(message.videoMetadata.expiresAt);
  const timeLeft = message.videoMetadata?.expiresAt 
    ? Math.max(0, Math.floor((new Date(message.videoMetadata.expiresAt).getTime() - Date.now()) / 1000))
    : 0;
  
  if (isExpired) {
    return <span className="text-red-500 italic text-sm">Video expired</span>;
  }
  
  return (
    <div className="space-y-2 max-w-xs">
      <div className="relative group rounded-lg overflow-hidden bg-black">
        <img 
          src={message.videoMetadata?.thumbnail} 
          alt={message.videoMetadata?.title}
          className="w-full h-auto max-h-64"
        />
        <div className="absolute top-2 right-2 bg-red-500 text-white text-xs px-2 py-1 rounded">
          ⏱️ {Math.floor(timeLeft / 60)}:{String(timeLeft % 60).padStart(2, '0')}
        </div>
      </div>
      <p className="text-sm font-medium truncate">{message.videoMetadata?.title}</p>
      <div className="flex gap-2">
        <a
          href={message.videoMetadata?.downloadUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex-1 flex items-center justify-center gap-2 bg-[#128C7E] hover:bg-[#0a6d65] text-white px-3 py-1 rounded text-xs"
        >
          <ExternalLink className="w-3 h-3" />
          Watch
        </a>
        <a
          href={message.videoMetadata?.downloadUrl}
          download
          className="flex items-center justify-center gap-2 border border-gray-300 dark:border-gray-600 px-2 py-1 rounded text-xs hover:bg-gray-100 dark:hover:bg-gray-700"
        >
          <Download className="w-3 h-3" />
        </a>
      </div>
    </div>
  );
     }
      default:
        return <p className="text-sm whitespace-pre-wrap">{actualContent}</p>;
    }
  };

  return (
    <div 
      className={`flex ${isOwn ? 'justify-end' : 'justify-start'} group mb-2`}
      onMouseEnter={() => setShowReactions(true)}
      onMouseLeave={() => setShowReactions(false)}
    >
      <div className={`flex items-end gap-2 max-w-[75%] ${isOwn ? 'flex-row-reverse' : ''}`}>
        {/* Avatar for group chats */}
        {!isOwn && sender && (
          <Avatar className="w-8 h-8 flex-shrink-0">
            <AvatarFallback className={`${getAvatarColor(sender.username)} text-white text-xs font-semibold`}>
              {getInitials(sender.displayName || sender.username)}
            </AvatarFallback>
          </Avatar>
        )}

        <div className="relative">
          {/* Quick Reactions */}
          {showReactions && !message.isDeleted && (
            <div 
              className={`absolute ${isOwn ? 'right-0 -top-8' : 'left-0 -top-8'} 
                bg-white dark:bg-gray-800 rounded-full shadow-lg px-2 py-1 
                flex gap-1 z-10 border border-gray-200 dark:border-gray-700
                opacity-0 group-hover:opacity-100 transition-opacity`}
            >
              {REACTIONS.map(emoji => (
                <button
                  key={emoji}
                  onClick={() => onReaction(emoji)}
                  className="hover:scale-125 transition-transform text-lg"
                >
                  {emoji}
                </button>
              ))}
            </div>
          )}

          {/* Message Bubble */}
          <div 
            className={`
              relative px-3 py-2 rounded-lg shadow-sm
              ${isOwn 
                ? 'bg-[#dcf8c6] dark:bg-[#005c4b] text-gray-900 dark:text-white rounded-tr-none' 
                : 'bg-white dark:bg-[#202c33] text-gray-900 dark:text-white rounded-tl-none'
              }
              ${message.isDeleted ? 'opacity-75' : ''}
            `}
          >
            {/* Reply Reference */}
            {replyToId && (
              <div className={`mb-2 pl-2 border-l-4 ${isOwn ? 'border-[#128C7E]' : 'border-gray-400'} text-xs text-gray-500`}>
                <p className="font-medium">Replying to message</p>
              </div>
            )}

            {/* Sender Name in Groups */}
            {!isOwn && sender && (
              <p className="text-xs text-[#128C7E] font-medium mb-1">
                {sender.displayName || sender.username}
              </p>
            )}

            {/* Message Content */}
            {renderContent()}

            {/* Reactions */}
            {message.reactions.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-1">
                {message.reactions.map((reaction, idx) => (
                  <span 
                    key={idx}
                    className="text-sm bg-white/50 dark:bg-black/30 rounded-full px-1"
                  >
                    {reaction.emoji}
                  </span>
                ))}
              </div>
            )}

            {/* Time and Status */}
            <div className={`flex items-center justify-end gap-1 mt-1 ${isOwn ? 'text-gray-500' : 'text-gray-400'}`}>
              <span className="text-[10px]">
                {formatMessageTime(message.createdAt)}
              </span>
              {isOwn && getStatusIcon()}
              {message.isEdited && (
                <span className="text-[10px] italic">edited</span>
              )}
            </div>
          </div>

          {/* Message Actions */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                variant="ghost" 
                size="icon"
                className={`absolute ${isOwn ? 'left-0' : 'right-0'} top-0 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity`}
              >
                <MoreVertical className="w-3 h-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align={isOwn ? 'start' : 'end'}>
              <DropdownMenuItem onClick={onReply}>
                <Reply className="w-4 h-4 mr-2" />
                Reply
              </DropdownMenuItem>
              {isOwn && !message.isDeleted && (
                <>
                  <DropdownMenuItem onClick={onEdit}>
                    <Edit2 className="w-4 h-4 mr-2" />
                    Edit
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={onDelete} className="text-red-600">
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete
                  </DropdownMenuItem>
                </>
              )}
              <DropdownMenuItem onClick={() => navigator.clipboard.writeText(message.content)}>
                <Copy className="w-4 h-4 mr-2" />
                Copy
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Forward className="w-4 h-4 mr-2" />
                Forward
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </div>
  );
}
