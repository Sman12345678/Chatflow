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
            
            setTimeout(() => {
              set(state => ({
                messages: {
                  ...state.messages,
                  [chatId]: state.messages[chatId]?.map(m => 
                    m.id === data.id ? { ...m, status: 'delivered' } : m
                  ) || [],
                },
              }));
            }, 1000);
          }
        } catch (error) {
          console.error('Failed to send message:', error);
          set(state => ({
            messages: {
              ...state.messages,
              [chatId]: state.messages[chatId].map(m => 
                m.id === tempId ? { ...m, status: 'failed' } : m
              ),
            },
            isOnline: false,
          }));
          
          // Queue for retry
          queueAction('sendMessage', {
            chatId,
            messageData: {
              senderId: currentUser.id,
              type,
              content,
              fileData
            }
          });
        }
      },

      syncPendingMessages: async () => {
        const { pendingMessages } = get();
        const { currentUser } = useAuthStore.getState();
        if (!currentUser || !network.isOnline()) return;

        for (const [chatId, messages] of Object.entries(pendingMessages)) {
          for (const msg of messages) {
            if (msg.status === 'pending') {
              try {
                const response = await fetch(`${API_URL}/api/chats/${chatId}/messages`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    senderId: msg.senderId,
                    type: msg.type,
                    content: msg.content,
                    fileData: (msg as any).fileData,
                  }),
                });

                if (response.ok) {
                  const data = await response.json();
                  set(state => ({
                    messages: {
                      ...state.messages,
                      [chatId]: state.messages[chatId].map(m => 
                        m.id === msg.id ? { ...m, id: data.id, status: 'sent' } : m
                      ),
                    },
                    pendingMessages: {
                      ...state.pendingMessages,
                      [chatId]: state.pendingMessages[chatId].filter(m => m.id !== msg.id),
                    },
                  }));
                }
              } catch (error) {
                console.error('Failed to sync message:', error);
              }
            }
          }
        }
      },

      deleteMessage: async (chatId: string, messageId: string, forEveryone = false) => {
        // Optimistic
        if (forEveryone) {
          set(state => ({
            messages: {
              ...state.messages,
              [chatId]: state.messages[chatId]?.map(m => 
                m.id === messageId 
                  ? { ...m, isDeleted: true, content: 'This message was deleted' } 
                  : m
              ) || [],
            },
          }));
        } else {
          set(state => ({
            messages: {
              ...state.messages,
              [chatId]: state.messages[chatId]?.filter(m => m.id !== messageId) || [],
            },
          }));
        }

        if (!network.isOnline()) return;

        try {
          await fetch(`${API_URL}/api/messages/${messageId}`, {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ forEveryone }),
          });
        } catch (error) {
          console.error('Failed to delete message:', error);
        }
      },

      editMessage: async (chatId: string, messageId: string, newContent: string) => {
        // Optimistic
        set(state => ({
          messages: {
            ...state.messages,
            [chatId]: state.messages[chatId]?.map(m => 
              m.id === messageId 
                ? { ...m, content: newContent, isEdited: true } 
                : m
            ) || [],
          },
        }));

        if (!network.isOnline()) return;

        try {
          await fetch(`${API_URL}/api/messages/${messageId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ content: newContent }),
          });
        } catch (error) {
          console.error('Failed to edit message:', error);
        }
      },

      addReaction: (chatId: string, messageId: string, emoji: string) => {
        const { currentUser } = useAuthStore.getState();
        if (!currentUser) return;

        set(state => {
          const messages = state.messages[chatId] || [];
          const message = messages.find(m => m.id === messageId);
          if (!message) return state;

          const newReactions = [
            ...message.reactions.filter(r => r.userId !== currentUser.id),
            { userId: currentUser.id, emoji }
          ];

          if (network.isOnline()) {
            fetch(`${API_URL}/api/messages/${messageId}`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ reactions: newReactions }),
            }).catch(console.error);
          }

          return {
            messages: {
              ...state.messages,
              [chatId]: messages.map(m => 
                m.id === messageId ? { ...m, reactions: newReactions } : m
              ),
            },
          };
        });
      },

      removeReaction: (chatId: string, messageId: string) => {
        const { currentUser } = useAuthStore.getState();
        if (!currentUser) return;

        set(state => {
          const messages = state.messages[chatId] || [];
          const message = messages.find(m => m.id === messageId);
          if (!message) return state;

          const newReactions = message.reactions.filter(r => r.userId !== currentUser.id);

          if (network.isOnline()) {
            fetch(`${API_URL}/api/messages/${messageId}`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ reactions: newReactions }),
            }).catch(console.error);
          }

          return {
            messages: {
              ...state.messages,
              [chatId]: messages.map(m => 
                m.id === messageId ? { ...m, reactions: newReactions } : m
              ),
            },
          };
        });
      },

      setTyping: (chatId: string, userId: string, isTyping: boolean) => {
        set(state => ({
          typingIndicators: isTyping
            ? [...state.typingIndicators.filter(t => !(t.chatId === chatId && t.userId === userId)), { chatId, userId, isTyping }]
            : state.typingIndicators.filter(t => !(t.chatId === chatId && t.userId === userId)),
        }));
      },

      markAsRead: (chatId: string) => {
        set(state => ({
          chats: state.chats.map(c => 
            c.id === chatId ? { ...c, unreadCount: 0 } : c
          ),
          messages: {
            ...state.messages,
            [chatId]: state.messages[chatId]?.map(m => 
              m.status !== 'read' ? { ...m, status: 'read' } : m
            ) || [],
          },
        }));
      },

      muteChat: (chatId: string, hours?: number) => {
        set(state => ({
          chats: state.chats.map(c => 
            c.id === chatId 
              ? { 
                  ...c, 
                  isMuted: true, 
                  muteUntil: hours ? new Date(Date.now() + hours * 60 * 60 * 1000) : undefined 
                } 
              : c
          ),
        }));
      },

      unmuteChat: (chatId: string) => {
        set(state => ({
          chats: state.chats.map(c => 
            c.id === chatId ? { ...c, isMuted: false, muteUntil: undefined } : c
          ),
        }));
      },

      archiveChat: (chatId: string) => {
        // TODO: Implement
      },

      deleteChat: async (chatId: string) => {
        set(state => ({
          chats: state.chats.filter(c => c.id !== chatId),
          messages: Object.fromEntries(
            Object.entries(state.messages).filter(([key]) => key !== chatId)
          ),
        }));

        if (!network.isOnline()) return;

        try {
          await fetch(`${API_URL}/api/chats/${chatId}`, { method: 'DELETE' });
        } catch (error) {
          console.error('Failed to delete chat:', error);
        }
      },

      addToGroup: (chatId: string, userId: string) => {
        set(state => ({
          chats: state.chats.map(c => 
            c.id === chatId && c.type === 'group' && !c.participants.includes(userId)
              ? { ...c, participants: [...c.participants, userId] }
              : c
          ),
        }));
      },

      removeFromGroup: (chatId: string, userId: string) => {
        set(state => ({
          chats: state.chats.map(c => 
            c.id === chatId && c.type === 'group'
              ? { ...c, participants: c.participants.filter(id => id !== userId) }
              : c
          ),
        }));
      },

      makeAdmin: (chatId: string, userId: string) => {
        set(state => ({
          chats: state.chats.map(c => 
            c.id === chatId && c.type === 'group' && !c.adminIds?.includes(userId)
              ? { ...c, adminIds: [...(c.adminIds || []), userId] }
              : c
          ),
        }));
      },

      searchChats: (query: string) => {
        const { users } = useAuthStore.getState();
        return get().chats.filter(c => {
          if (c.type === 'group') {
            return c.name?.toLowerCase().includes(query.toLowerCase());
          } else {
            const otherUserId = c.participants.find(id => id !== useAuthStore.getState().currentUser?.id);
            const otherUser = users.find(u => u.id === otherUserId);
            return otherUser?.displayName.toLowerCase().includes(query.toLowerCase()) ||
                   otherUser?.username.toLowerCase().includes(query.toLowerCase());
          }
        });
      },

      getChatMessages: (chatId: string) => get().messages[chatId] || [],
      
      getUnreadCount: () => get().chats.reduce((acc, c) => acc + c.unreadCount, 0),
    }),
    {
      name: 'chatflow-chats',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        chats: state.chats,
        messages: state.messages,
        pendingMessages: state.pendingMessages,
      }),
    }
  )
);

// Sync pending messages when back online
window.addEventListener('online', () => {
  setTimeout(() => {
    useChatStore.getState().syncPendingMessages();
  }, 2000);
});

// =============================================================================
// Status Store (API + Local Cache)
// =============================================================================

interface StatusState {
  statuses: Status[];
  isLoading: boolean;
  isOnline: boolean;
  addStatus: (userId: string, text: string) => Promise<void>;
  deleteStatus: (statusId: string) => Promise<void>;
  fetchStatuses: () => Promise<void>;
  getUserStatuses: (userId: string) => Status[];
  getRecentStatuses: () => Status[];
  clearLocalData: () => void;
}

export const useStatusStore = create<StatusState>()(
  persist(
    (set, get) => ({
      statuses: [],
      isLoading: false,
      isOnline: navigator.onLine,

      clearLocalData: () => set({ statuses: [] }),

      fetchStatuses: async () => {
        if (!network.isOnline()) {
          set({ isOnline: false });
          return;
        }

        try {
          const response = await fetch(`${API_URL}/api/statuses`);
          if (response.ok) {
            const statuses = await response.json();
            set({ statuses, isOnline: true });
          }
        } catch (error) {
          console.error('Failed to fetch statuses:', error);
          set({ isOnline: false });
        }
      },

      addStatus: async (userId: string, text: string) => {
        const newStatus: Status = {
          id: crypto.randomUUID(),
          userId,
          text,
          createdAt: new Date(),
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        };

        // Optimistic
        set(state => ({
          statuses: [...state.statuses.filter(s => s.userId !== userId), newStatus],
        }));

        if (!network.isOnline()) {
          queueAction('addStatus', { userId, text });
          return;
        }

        try {
          const response = await fetch(`${API_URL}/api/statuses`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId, text }),
          });
          
          if (!response.ok) throw new Error('Failed to save');
        } catch (error) {
          console.error('Failed to add status:', error);
          queueAction('addStatus', { userId, text });
          set({ isOnline: false });
        }
      },

      deleteStatus: async (statusId: string) => {
        set(state => ({
          statuses: state.statuses.filter(s => s.id !== statusId),
        }));

        if (!network.isOnline()) return;

        try {
          await fetch(`${API_URL}/api/statuses/${statusId}`, { method: 'DELETE' });
        } catch (error) {
          console.error('Failed to delete status:', error);
        }
      },

      getUserStatuses: (userId: string) => 
        get().statuses.filter(s => s.userId === userId && new Date(s.expiresAt) > new Date()),

      getRecentStatuses: () => 
        get().statuses
          .filter(s => new Date(s.expiresAt) > new Date())
          .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
    }),
    {
      name: 'chatflow-statuses',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ statuses: state.statuses }),
    }
  )
);

// =============================================================================
// AI Store (API + Local Cache with Memory)
// =============================================================================

const KIMI_API_URL = 'https://api.moonshot.cn/v1/chat/completions';
const KIMI_API_KEY = import.meta.env.VITE_KIMI_API_KEY || '';

interface AIState {
  conversations: AIConversation[];
  currentConversationId: string | null;
  isLoading: boolean;
  isOnline: boolean;
  sendMessage: (content: string) => Promise<void>;
  fetchConversation: (userId: string) => Promise<void>;
  clearConversation: (userId: string) => Promise<void>;
  clearLocalData: () => void;
}

export const useAIStore = create<AIState>()(
  persist(
    (set, get) => ({
      conversations: [],
      currentConversationId: null,
      isLoading: false,
      isOnline: navigator.onLine,

      clearLocalData: () => set({ conversations: [], currentConversationId: null }),

      fetchConversation: async (userId: string) => {
        if (!network.isOnline()) {
          set({ isOnline: false });
          return; // Use cached
        }

        try {
          const response = await fetch(`${API_URL}/api/ai-conversations/${userId}`);
          if (response.ok) {
            const conv = await response.json();
            set(state => ({
              conversations: [
                ...state.conversations.filter(c => c.userId !== userId),
                conv
              ],
              currentConversationId: conv.id,
              isOnline: true,
            }));
          }
        } catch (error) {
          console.error('Failed to fetch AI conversation:', error);
          set({ isOnline: false });
        }
      },

      sendMessage: async (content: string) => {
        const { currentUser } = useAuthStore.getState();
        if (!currentUser) return;

        // Ensure conversation loaded
        const existing = get().conversations.find(c => c.userId === currentUser.id);
        if (!existing) {
          await get().fetchConversation(currentUser.id);
        }
        
        const conversation = get().conversations.find(c => c.userId === currentUser.id);
        if (!conversation) return;

        const userMessage: AIMessage = {
          id: crypto.randomUUID(),
          role: 'user',
          content,
          createdAt: new Date(),
        };

        const updatedMessages = [...conversation.messages, userMessage];
        
        // Optimistic
        set(state => ({
          conversations: state.conversations.map(c => 
            c.id === conversation.id 
              ? { ...c, messages: updatedMessages, updatedAt: new Date() }
              : c
          ),
          isLoading: true,
        }));

        // Get AI response (works offline with fallback)
        const aiContent = await callKimiAPI(updatedMessages);
        
        const aiResponse: AIMessage = {
          id: crypto.randomUUID(),
          role: 'assistant',
          content: aiContent,
          createdAt: new Date(),
        };

        const finalMessages = [...updatedMessages, aiResponse];
        
        // Update local
        set(state => ({
          conversations: state.conversations.map(c => 
            c.id === conversation.id 
              ? { ...c, messages: finalMessages, updatedAt: new Date() }
              : c
          ),
          isLoading: false,
        }));

        // Sync to API if online
        if (network.isOnline()) {
          try {
            await fetch(`${API_URL}/api/ai-conversations/${currentUser.id}`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ messages: finalMessages }),
            });
          } catch (error) {
            console.error('Failed to save AI conversation:', error);
          }
        }
      },

      clearConversation: async (userId: string) => {
        set(state => ({
          conversations: state.conversations.map(c => 
            c.userId === userId ? { ...c, messages: [], updatedAt: new Date() } : c
          ),
        }));

        if (!network.isOnline()) return;

        try {
          await fetch(`${API_URL}/api/ai-conversations/${userId}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ messages: [] }),
          });
        } catch (error) {
          console.error('Failed to clear conversation:', error);
        }
      },
    }),
    {
      name: 'chatflow-ai',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ conversations: state.conversations }),
    }
  )
);

async function callKimiAPI(messages: AIMessage[]): Promise<string> {
  if (!KIMI_API_KEY || !navigator.onLine) {
    return generateFallbackResponse(messages[messages.length - 1]?.content || '');
  }

  try {
    const response = await fetch(KIMI_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${KIMI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'moonshot-v1-8k',
        messages: [
          {
            role: 'system',
            content: 'You are ChatFlow AI, a helpful assistant in a chat application. Keep responses friendly, concise, and engaging. Remember the conversation context and refer to previous messages when relevant.'
          },
          ...messages.slice(-10).map(m => ({
            role: m.role,
            content: m.content,
          })),
        ],
        temperature: 0.7,
        max_tokens: 500,
      }),
    });

    if (!response.ok) throw new Error('Kimi API error');
    
    const data = await response.json();
    return data.choices[0]?.message?.content || generateFallbackResponse(messages[messages.length - 1]?.content || '');
  } catch (error) {
    console.error('Kimi API error:', error);
    return generateFallbackResponse(messages[messages.length - 1]?.content || '');
  }
}

function generateFallbackResponse(input: string): string {
  const lowerInput = input.toLowerCase();
  
  if (lowerInput.includes('hello') || lowerInput.includes('hi')) {
    return "Hello there! 👋 I'm ChatFlow AI (offline mode). I can still chat using my local responses. How can I help you today?";
  }
  if (lowerInput.includes('help')) {
    return "I'm currently in offline mode, but I can help with:\n• Basic questions\n• Games (type /game)\n• Casual chat\n• Jokes and fun facts\n\nWhat would you like to do?";
  }
  if (lowerInput.includes('game') || lowerInput.includes('play')) {
    return "I love games! 🎮 You can play Tic-Tac-Toe, Rock Paper Scissors, Word Chain, Trivia, or Hangman in any chat. Just type /game to start!";
  }
  if (lowerInput.includes('weather')) {
    return "I'm offline right now, so I can't check real-time weather. Try a weather app or website! ☀️";
  }
  if (lowerInput.includes('time')) {
    return `The current time is ${new Date().toLocaleTimeString()}. 📅`;
  }
  if (lowerInput.includes('joke')) {
    const jokes = [
      "Why don't scientists trust atoms? Because they make up everything! 😄",
      "Why did the scarecrow win an award? He was outstanding in his field! 🌾",
      "Why don't eggs tell jokes? They'd crack each other up! 🥚",
    ];
    return jokes[Math.floor(Math.random() * jokes.length)];
  }
  if (lowerInput.includes('thank')) {
    return "You're welcome! 😊 I'm always here to help, even in offline mode!";
  }
  if (lowerInput.includes('offline') || lowerInput.includes('internet')) {
    return "Yes, I'm currently running in offline mode! Your messages will sync when you're back online. I can still chat with you using my local brain. 🧠";
  }
  
  return "That's interesting! I'm in offline mode right now, but I can still chat. Tell me more, or ask me anything! 🎯";
}

// =============================================================================
// Game Store (API + Local Cache)
// =============================================================================

interface GameState {
  activeGames: Record<string, GameData>;
  isLoading: boolean;
  isOnline: boolean;
  startGame: (chatId: string, gameType: GameType, players: string[]) => Promise<void>;
  makeMove: (chatId: string, playerId: string, move: any) => Promise<void>;
  endGame: (chatId: string) => Promise<void>;
  fetchGame: (chatId: string) => Promise<void>;
  getGame: (chatId: string) => GameData | undefined;
  clearLocalData: () => void;
}

export const useGameStore = create<GameState>()(
  persist(
    (set, get) => ({
      activeGames: {},
      isLoading: false,
      isOnline: navigator.onLine,

      clearLocalData: () => set({ activeGames: {} }),

      fetchGame: async (chatId: string) => {
        if (!network.isOnline()) {
          set({ isOnline: false });
          return;
        }

        try {
          const response = await fetch(`${API_URL}/api/games?chatId=${chatId}`);
          if (response.ok) {
            const game = await response.json();
            if (game) {
              set(state => ({
                activeGames: { ...state.activeGames, [chatId]: game },
                isOnline: true,
              }));
            }
          }
        } catch (error) {
          console.error('Failed to fetch game:', error);
          set({ isOnline: false });
        }
      },

      startGame: async (chatId: string, gameType: GameType, players: string[]) => {
        let initialState: any = {};
        
        switch (gameType) {
          case 'tic-tac-toe':
            initialState = { board: Array(9).fill(null), currentPlayer: 0 };
            break;
          case 'rock-paper-scissors':
            initialState = { player1Move: null, player2Move: null, round: 1, scores: { player1: 0, player2: 0 } };
            break;
          case 'word-chain':
            initialState = { words: [], currentPlayer: 0, lastLetter: '' };
            break;
          case 'trivia':
            initialState = { currentQuestion: 0, scores: players.reduce((acc, p) => ({ ...acc, [p]: 0 }), {}), answered: [] };
            break;
          case 'hangman':
            initialState = { word: '', guessedLetters: [], wrongGuesses: 0, maxWrongGuesses: 6 };
            break;
        }

        const gameData: GameData = {
          gameType,
          gameState: initialState,
          currentPlayer: players[0],
        };

        set(state => ({
          activeGames: { ...state.activeGames, [chatId]: gameData },
        }));

        if (!network.isOnline()) {
          // Store locally, sync later
          return;
        }

        try {
          await fetch(`${API_URL}/api/games`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chatId,
              gameType,
              gameState: initialState,
              currentPlayer: players[0],
              players
            }),
          });
        } catch (error) {
          console.error('Failed to start game:', error);
          set({ isOnline: false });
        }
      },

      makeMove: async (chatId: string, playerId: string, move: any) => {
        const game = get().activeGames[chatId];
        if (!game || game.currentPlayer !== playerId) return;

        const newGameState = { ...game.gameState, ...move };
        
        // Optimistic
        set(state => ({
          activeGames: {
            ...state.activeGames,
            [chatId]: { ...game, gameState: newGameState }
          }
        }));

        if (!network.isOnline()) {
          queueAction('makeMove', { gameId: chatId, gameState: newGameState });
          return;
        }

        try {
          await fetch(`${API_URL}/api/games/${chatId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ gameState: newGameState }),
          });
        } catch (error) {
          console.error('Failed to save move:', error);
          queueAction('makeMove', { gameId: chatId, gameState: newGameState });
          set({ isOnline: false });
        }
      },

      endGame: async (chatId: string) => {
        set(state => {
          const { [chatId]: _, ...rest } = state.activeGames;
          return { activeGames: rest };
        });

        if (!network.isOnline()) return;

        try {
          await fetch(`${API_URL}/api/games/${chatId}`, { method: 'DELETE' });
        } catch (error) {
          console.error('Failed to end game:', error);
        }
      },

      getGame: (chatId: string) => get().activeGames[chatId],
    }),
    {
      name: 'chatflow-games',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ activeGames: state.activeGames }),
    }
  )
);

// =============================================================================
// Settings Store (Local only - personal preferences)
// =============================================================================

interface SettingsState {
  settings: AppSettings;
  updateSettings: (updates: Partial<AppSettings>) => void;
  toggleTheme: () => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set, get) => ({
      settings: {
        theme: 'system',
        fontSize: 'medium',
        notifications: true,
        notificationSound: true,
        soundName: 'default',
        vibration: true,
        showPreview: true,
        readReceipts: true,
        lastSeenVisibility: 'everyone',
        profilePhotoVisibility: 'everyone',
      },

      updateSettings: (updates: Partial<AppSettings>) => {
        set(state => ({
          settings: { ...state.settings, ...updates },
        }));
      },

      toggleTheme: () => {
        const themes: ('light' | 'dark' | 'system')[] = ['light', 'dark', 'system'];
        const currentIndex = themes.indexOf(get().settings.theme);
        const nextTheme = themes[(currentIndex + 1) % themes.length];
        set(state => ({
          settings: { ...state.settings, theme: nextTheme },
        }));
      },
    }),
    {
      name: 'chatflow-settings',
      storage: createJSONStorage(() => localStorage),
    }
  )
);

// =============================================================================
// UI Store (Local only - temporary UI state)
// =============================================================================

interface UIState {
  isSidebarOpen: boolean;
  showEmojiPicker: boolean;
  replyToMessage: Message | null;
  editingMessage: Message | null;
  showGameMenu: boolean;
  activeGame: GameType | null;
  
  toggleSidebar: () => void;
  setShowEmojiPicker: (show: boolean) => void;
  setReplyToMessage: (message: Message | null) => void;
  setEditingMessage: (message: Message | null) => void;
  setShowGameMenu: (show: boolean) => void;
  setActiveGame: (game: GameType | null) => void;
}

export const useUIStore = create<UIState>()((set) => ({
  isSidebarOpen: true,
  showEmojiPicker: false,
  replyToMessage: null,
  editingMessage: null,
  showGameMenu: false,
  activeGame: null,

  toggleSidebar: () => set(state => ({ isSidebarOpen: !state.isSidebarOpen })),
  setShowEmojiPicker: (show: boolean) => set({ showEmojiPicker: show }),
  setReplyToMessage: (message: Message | null) => set({ replyToMessage: message }),
  setEditingMessage: (message: Message | null) => set({ editingMessage: message }),
  setShowGameMenu: (show: boolean) => set({ showGameMenu: show }),
  setActiveGame: (game: GameType | null) => set({ activeGame: game }),
}));
