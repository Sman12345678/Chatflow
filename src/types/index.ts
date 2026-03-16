// =============================================================================
// ChatFlow Type Definitions
// =============================================================================

export interface User {
  id: string;
  username: string;
  password: string;
  displayName: string;
  bio: string;
  isOnline: boolean;
  lastSeen: Date;
  status?: Status;
  createdAt: Date;
}

export interface Status {
  id: string;
  userId: string;
  text: string;
  createdAt: Date;
  expiresAt: Date;
}

export type MessageType = 'text' | 'image' | 'file' | 'voice' | 'game' | 'system';
export type MessageStatus = 'sent' | 'delivered' | 'read';

export interface Message {
  id: string;
  chatId: string;
  senderId: string;
  type: MessageType;
  content: string;
  fileUrl?: string;
  fileName?: string;
  fileSize?: number;
  duration?: number;
  replyTo?: string;
  reactions: Reaction[];
  status: MessageStatus;
  isEdited: boolean;
  isDeleted: boolean;
  createdAt: Date;
  gameData?: GameData;
}

export interface Reaction {
  userId: string;
  emoji: string;
}

export interface GameData {
  gameType: GameType;
  gameState: any;
  currentPlayer: string;
  winner?: string;
}

export type GameType = 'tic-tac-toe' | 'rock-paper-scissors' | 'word-chain' | 'trivia' | 'hangman';

export type ChatType = 'private' | 'group';

export interface Chat {
  id: string;
  type: ChatType;
  name?: string;
  participants: string[];
  adminIds?: string[];
  avatar?: string;
  description?: string;
  lastMessage?: Message;
  unreadCount: number;
  isMuted: boolean;
  muteUntil?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface TypingIndicator {
  chatId: string;
  userId: string;
  isTyping: boolean;
}

export interface AIConversation {
  id: string;
  userId: string;
  messages: AIMessage[];
  createdAt: Date;
  updatedAt: Date;
}

export interface AIMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: Date;
}

export interface AppSettings {
  theme: 'light' | 'dark' | 'system';
  fontSize: 'small' | 'medium' | 'large';
  notifications: boolean;
  notificationSound: boolean;
  soundName: string;
  vibration: boolean;
  showPreview: boolean;
  readReceipts: boolean;
  lastSeenVisibility: 'everyone' | 'contacts' | 'nobody';
  profilePhotoVisibility: 'everyone' | 'contacts' | 'nobody';
}

export interface CallData {
  id: string;
  chatId: string;
  callerId: string;
  receiverId: string;
  type: 'audio' | 'video';
  status: 'ringing' | 'connected' | 'ended' | 'declined';
  startedAt?: Date;
  endedAt?: Date;
}
