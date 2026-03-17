// =============================================================================
// ChatFlow State Management (Zustand) - API with Offline Support
// =============================================================================

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { 
  User, 
  Chat, 
  Message, 
  Status, 
  TypingIndicator, 
  AppSettings,
  GameType,
  GameData,
  AIConversation,
  AIMessage
} from '@/types';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

// =============================================================================
// Network Status Helper
// =============================================================================

let isOnline = navigator.onLine;

window.addEventListener('online', () => { isOnline = true; });
window.addEventListener('offline', () => { isOnline = false; });

const network = {
  isOnline: () => isOnline,
  check: async (): Promise<boolean> => {
    if (!navigator.onLine) return false;
    try {
      const response = await fetch(`${API_URL}/api/health`, { 
        method: 'HEAD',
        cache: 'no-store'
      });
      isOnline = response.ok;
      return response.ok;
    } catch {
      isOnline = false;
      return false;
    }
  }
};

// =============================================================================
// Auth Store (API-based, minimal persistence for session only)
// =============================================================================

interface AuthState {
  currentUser: User | null;
  isAuthenticated: boolean;
  users: User[];
  isLoading: boolean;
  error: string | null;
  isOnline: boolean;
  
  login: (username: string, password: string) => Promise<boolean>;
  register: (username: string, password: string, displayName: string) => Promise<boolean>;
  logout: () => Promise<void>;
  updateUser: (updates: Partial<User>) => Promise<void>;
  setUserStatus: (statusText: string) => void;
  getUserById: (userId: string) => User | undefined;
  getUserByUsername: (username: string) => User | undefined;
  fetchUsers: () => Promise<void>;
  checkConnection: () => Promise<boolean>;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      currentUser: null,
      isAuthenticated: false,
      users: [],
      isLoading: false,
      error: null,
      isOnline: navigator.onLine,

      checkConnection: async () => {
        const online = await network.check();
        set({ isOnline: online });
        return online;
      },

      login: async (username: string, password: string) => {
        set({ isLoading: true, error: null });
        
        if (!network.isOnline()) {
          set({ error: 'No internet connection', isLoading: false, isOnline: false });
          return false;
        }

        try {
          const response = await fetch(`${API_URL}/api/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password }),
          });

          const data = await response.json();
          
          if (!response.ok) {
            set({ error: data.error || 'Login failed', isLoading: false });
            return false;
          }

          set({
            currentUser: { ...data.user, isOnline: true },
            isAuthenticated: true,
            isLoading: false,
            isOnline: true,
          });
          
          // Fetch other users for chat
          get().fetchUsers();
          
          // Trigger chat fetch
          useChatStore.getState().fetchChats(data.user.id);
          
          return true;
        } catch (error) {
          set({ error: 'Network error', isLoading: false, isOnline: false });
          return false;
        }
      },

      register: async (username: string, password: string, displayName: string) => {
        set({ isLoading: true, error: null });
        
        if (!network.isOnline()) {
          set({ error: 'No internet connection', isLoading: false, isOnline: false });
          return false;
        }

        try {
          const response = await fetch(`${API_URL}/api/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password, displayName }),
          });

          const data = await response.json();
          
          if (!response.ok) {
            set({ error: data.error || 'Registration failed', isLoading: false });
            return false;
          }

          set({
            currentUser: { ...data.user, isOnline: true },
            isAuthenticated: true,
            isLoading: false,
            isOnline: true,
          });
          
          return true;
        } catch (error) {
          set({ error: 'Network error', isLoading: false, isOnline: false });
          return false;
        }
      },

      logout: async () => {
        const { currentUser } = get();
        
        if (currentUser && network.isOnline()) {
          try {
            await fetch(`${API_URL}/api/logout`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ userId: currentUser.id }),
            });
          } catch (e) {
            console.error('Logout error:', e);
          }
        }
        
        // Clear all stores
        useChatStore.getState().clearLocalData();
        useStatusStore.getState().clearLocalData();
        useGameStore.getState().clearLocalData();
        useAIStore.getState().clearLocalData();
        
        set({
          currentUser: null,
          isAuthenticated: false,
          users: [],
          isOnline: navigator.onLine,
        });
      },

      fetchUsers: async () => {
        if (!network.isOnline()) return;
        
        try {
          const response = await fetch(`${API_URL}/api/users`);
          if (response.ok) {
            const users = await response.json();
            set({ users, isOnline: true });
          }
        } catch (error) {
          console.error('Failed to fetch users:', error);
          set({ isOnline: false });
        }
      },

      updateUser: async (updates: Partial<User>) => {
        const { currentUser } = get();
        if (!currentUser) return;

        // Optimistic update
        const updatedUser = { ...currentUser, ...updates };
        set({ currentUser: updatedUser });

        if (!network.isOnline()) {
          // Queue for later sync
          queueAction('updateUser', { userId: currentUser.id, updates });
          return;
        }

        try {
          await fetch(`${API_URL}/api/user/${currentUser.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updates),
          });
        } catch (error) {
          console.error('Failed to update user:', error);
          queueAction('updateUser', { userId: currentUser.id, updates });
          set({ isOnline: false });
        }
      },

      setUserStatus: (statusText: string) => {
        const { currentUser } = get();
        if (!currentUser) return;
        
        useStatusStore.getState().addStatus(currentUser.id, statusText);
      },

      getUserById: (userId: string) => get().users.find(u => u.id === userId),
      getUserByUsername: (username: string) => get().users.find(u => u.username === username),
      clearError: () => set({ error: null }),
    }),
    {
      name: 'chatflow-auth',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ 
        currentUser: state.currentUser, 
        isAuthenticated: state.isAuthenticated,
        users: state.users,
      }),
    }
  )
);

// =============================================================================
// Action Queue for Offline Support
// =============================================================================

interface QueuedAction {
  id: string;
  type: string;
  payload: any;
  timestamp: number;
  retries: number;
}

let actionQueue: QueuedAction[] = [];

function queueAction(type: string, payload: any) {
  actionQueue.push({
    id: crypto.randomUUID(),
    type,
    payload,
    timestamp: Date.now(),
    retries: 0,
  });
  saveQueue();
}

function saveQueue() {
  localStorage.setItem('chatflow-action-queue', JSON.stringify(actionQueue));
}

function loadQueue() {
  const saved = localStorage.getItem('chatflow-action-queue');
  if (saved) {
    actionQueue = JSON.parse(saved);
  }
}

async function processQueue() {
  if (!network.isOnline() || actionQueue.length === 0) return;
  
  const failed: QueuedAction[] = [];
  
  for (const action of actionQueue) {
    try {
      let success = false;
      
      switch (action.type) {
        case 'sendMessage':
          success = await processSendMessage(action.payload);
          break;
        case 'updateUser':
          success = await processUpdateUser(action.payload);
          break;
        case 'addStatus':
          success = await processAddStatus(action.payload);
          break;
        case 'makeMove':
          success = await processMakeMove(action.payload);
          break;
      }
      
      if (!success) {
        action.retries++;
        if (action.retries < 3) {
          failed.push(action);
        }
      }
    } catch (error) {
      action.retries++;
      if (action.retries < 3) {
        failed.push(action);
      }
    }
  }
  
  actionQueue = failed;
  saveQueue();
}

async function processSendMessage(payload: any): Promise<boolean> {
  try {
    const response = await fetch(`${API_URL}/api/chats/${payload.chatId}/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload.messageData),
    });
    return response.ok;
  } catch {
    return false;
  }
}

async function processUpdateUser(payload: any): Promise<boolean> {
  try {
    const response = await fetch(`${API_URL}/api/user/${payload.userId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload.updates),
    });
    return response.ok;
  } catch {
    return false;
  }
}

async function processAddStatus(payload: any): Promise<boolean> {
  try {
    const response = await fetch(`${API_URL}/api/statuses`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return response.ok;
  } catch {
    return false;
  }
}

async function processMakeMove(payload: any): Promise<boolean> {
  try {
    const response = await fetch(`${API_URL}/api/games/${payload.gameId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ gameState: payload.gameState }),
    });
    return response.ok;
  } catch {
    return false;
  }
}

// Process queue when coming back online
window.addEventListener('online', () => {
  setTimeout(processQueue, 1000);
});

// Load queue on startup
loadQueue();

// =============================================================================
// Chat Store (API + Local Cache)
// =============================================================================

interface ChatState {
  chats: Chat[];
  messages: Record<string, Message[]>;
  typingIndicators: TypingIndicator[];
  selectedChatId: string | null;
  searchQuery: string;
  isLoading: boolean;
  isOnline: boolean;
  pendingMessages: Record<string, Message[]>; // Queued when offline
  
  createPrivateChat: (userId: string, otherUserId: string) => Promise<Chat>;
  createGroupChat: (name: string, participantIds: string[], adminId: string) => Promise<Chat>;
  selectChat: (chatId: string | null) => void;
  fetchChats: (userId: string) => Promise<void>;
  fetchMessages: (chatId: string) => Promise<void>;
  sendMessage: (chatId: string, content: string, type?: Message['type'], fileData?: any) => Promise<void>;
  deleteMessage: (chatId: string, messageId: string, forEveryone?: boolean) => Promise<void>;
  editMessage: (chatId: string, messageId: string, newContent: string) => Promise<void>;
  addReaction: (chatId: string, messageId: string, emoji: string) => void;
  removeReaction: (chatId: string, messageId: string) => void;
  setTyping: (chatId: string, userId: string, isTyping: boolean) => void;
  markAsRead: (chatId: string) => void;
  muteChat: (chatId: string, hours?: number) => void;
  unmuteChat: (chatId: string) => void;
  archiveChat: (chatId: string) => void;
  deleteChat: (chatId: string) => Promise<void>;
  addToGroup: (chatId: string, userId: string) => void;
  removeFromGroup: (chatId: string, userId: string) => void;
  makeAdmin: (chatId: string, userId: string) => void;
  searchChats: (query: string) => Chat[];
  getChatMessages: (chatId: string) => Message[];
  getUnreadCount: () => number;
  clearLocalData: () => void;
  syncPendingMessages: () => Promise<void>;
}

export const useChatStore = create<ChatState>()(
  persist(
    (set, get) => ({
      chats: [],
      messages: {},
      typingIndicators: [],
      selectedChatId: null,
      searchQuery: '',
      isLoading: false,
      isOnline: navigator.onLine,
      pendingMessages: {},

      clearLocalData: () => {
        set({ 
          chats: [], 
          messages: {}, 
          pendingMessages: {},
          selectedChatId: null 
        });
      },

      fetchChats: async (userId: string) => {
        if (!network.isOnline()) {
          set({ isOnline: false });
          return; // Use cached data from persistence
        }

        set({ isLoading: true });
        try {
          const response = await fetch(`${API_URL}/api/chats?userId=${userId}`);
          if (response.ok) {
            const chats = await response.json();
            set({ chats, isLoading: false, isOnline: true });
          }
        } catch (error) {
          console.error('Failed to fetch chats:', error);
          set({ isLoading: false, isOnline: false });
        }
      },

      fetchMessages: async (chatId: string) => {
        // Check cache first
        const cached = get().messages[chatId];
        
        if (!network.isOnline()) {
          set({ isOnline: false });
          return; // Use cached messages
        }

        try {
          const response = await fetch(`${API_URL}/api/chats/${chatId}/messages`);
          if (response.ok) {
            const messages = await response.json();
            set(state => ({
              messages: { ...state.messages, [chatId]: messages },
              isOnline: true,
            }));
          }
        } catch (error) {
          console.error('Failed to fetch messages:', error);
          set({ isOnline: false });
        }
      },

      createPrivateChat: async (userId: string, otherUserId: string) => {
        const existingChat = get().chats.find(c => 
          c.type === 'private' && 
          c.participants.includes(userId) && 
          c.participants.includes(otherUserId)
        );
        if (existingChat) return existingChat;

        if (!network.isOnline()) {
          throw new Error('Cannot create chat while offline');
        }

        try {
          const response = await fetch(`${API_URL}/api/chats`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              type: 'private',
              participants: [userId, otherUserId],
              adminIds: []
            }),
          });
          
          if (response.ok) {
            const data = await response.json();
            const newChat: Chat = {
              id: data.id,
              type: 'private',
              participants: [userId, otherUserId],
              unreadCount: 0,
              isMuted: false,
              createdAt: new Date(),
              updatedAt: new Date(),
            };
            set(state => ({ chats: [...state.chats, newChat] }));
            return newChat;
          }
        } catch (error) {
          console.error('Failed to create chat:', error);
          throw error;
        }
      },

      createGroupChat: async (name: string, participantIds: string[], adminId: string) => {
        if (!network.isOnline()) {
          throw new Error('Cannot create group while offline');
        }

        try {
          const response = await fetch(`${API_URL}/api/chats`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              type: 'group',
              name,
              participants: participantIds,
              adminIds: [adminId]
            }),
          });
          
          if (response.ok) {
            const data = await response.json();
            const newChat: Chat = {
              id: data.id,
              type: 'group',
              name,
              participants: participantIds,
              adminIds: [adminId],
              unreadCount: 0,
              isMuted: false,
              createdAt: new Date(),
              updatedAt: new Date(),
            };
            set(state => ({ chats: [...state.chats, newChat] }));
            return newChat;
          }
        } catch (error) {
          console.error('Failed to create group:', error);
          throw error;
        }
      },

      selectChat: (chatId: string | null) => {
        set({ selectedChatId: chatId });
        if (chatId) {
          get().fetchMessages(chatId);
          get().markAsRead(chatId);
        }
      },

      sendMessage: async (chatId: string, content: string, type: Message['type'] = 'text', fileData?: any) => {
        const { currentUser } = useAuthStore.getState();
        if (!currentUser) throw new Error('Not authenticated');

        const tempId = crypto.randomUUID();
        const newMessage: Message = {
          id: tempId,
          chatId,
          senderId: currentUser.id,
          type,
          content,
          ...fileData,
          reactions: [],
          status: 'sending',
          isEdited: false,
          isDeleted: false,
          createdAt: new Date(),
        };

        // Optimistic update
        set(state => ({
          messages: {
            ...state.messages,
            [chatId]: [...(state.messages[chatId] || []), newMessage],
          },
        }));

        if (!network.isOnline()) {
          // Queue for later
          set(state => ({
            pendingMessages: {
              ...state.pendingMessages,
              [chatId]: [...(state.pendingMessages[chatId] || []), newMessage],
            },
            messages: {
              ...state.messages,
              [chatId]: state.messages[chatId].map(m => 
                m.id === tempId ? { ...m, status: 'pending' } : m
              ),
            },
          }));
          
          queueAction('sendMessage', {
            chatId,
            messageData: {
              senderId: currentUser.id,
              type,
              content,
              fileData
            }
          });
          
          return;
        }

        try {
          const response = await fetch(`${API_URL}/api/chats/${chatId}/messages`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              senderId: currentUser.id,
              type,
              content,
              fileData
            }),
          });

          if (response.ok) {
            const data = await response.json();
            set(state => ({
              messages: {
                ...state.messages,
                [chatId]: state.messages[chatId].map(m => 
                  m.id === tempId ? { ...m, id: data.id, status: 'sent' } : m
                ),
              },
            }));
            
            setTimeo
