// =============================================================================
// ChatFlow State Management (Zustand)
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

// =============================================================================
// Auth Store
// =============================================================================

interface AuthState {
  currentUser: User | null;
  isAuthenticated: boolean;
  users: User[];
  login: (username: string, password: string) => boolean;
  register: (username: string, password: string, displayName: string) => boolean;
  logout: () => void;
  updateUser: (updates: Partial<User>) => void;
  setUserStatus: (statusText: string) => void;
  getUserById: (userId: string) => User | undefined;
  getUserByUsername: (username: string) => User | undefined;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      currentUser: null,
      isAuthenticated: false,
      users: [],

      login: (username: string, password: string) => {
        const user = get().users.find(u => u.username === username && u.password === password);
        if (user) {
          set({ 
            currentUser: { ...user, isOnline: true }, 
            isAuthenticated: true 
          });
          return true;
        }
        return false;
      },

      register: (username: string, password: string, displayName: string) => {
        const existingUser = get().users.find(u => u.username === username);
        if (existingUser) return false;

        const newUser: User = {
          id: crypto.randomUUID(),
          username,
          password,
          displayName: displayName || username,
          bio: '',
          isOnline: true,
          lastSeen: new Date(),
          createdAt: new Date(),
        };

        set(state => ({
          users: [...state.users, newUser],
          currentUser: newUser,
          isAuthenticated: true,
        }));
        return true;
      },

      logout: () => {
        const { currentUser } = get();
        if (currentUser) {
          set(state => ({
            currentUser: null,
            isAuthenticated: false,
            users: state.users.map(u => 
              u.id === currentUser.id 
                ? { ...u, isOnline: false, lastSeen: new Date() } 
                : u
            ),
          }));
        }
      },
      clearVideoStats: () => {
  // Clear old entries (optional cleanup)
      },

      updateUser: (updates: Partial<User>) => {
        const { currentUser } = get();
        if (!currentUser) return;

        const updatedUser = { ...currentUser, ...updates };
        set(state => ({
          currentUser: updatedUser,
          users: state.users.map(u => 
            u.id === currentUser.id ? updatedUser : u
          ),
        }));
      },

      setUserStatus: (statusText: string) => {
        const { currentUser } = get();
        if (!currentUser) return;

        const newStatus: Status = {
          id: crypto.randomUUID(),
          userId: currentUser.id,
          text: statusText,
          createdAt: new Date(),
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        };

        set(state => ({
          currentUser: { ...currentUser, status: newStatus },
          users: state.users.map(u => 
            u.id === currentUser.id ? { ...u, status: newStatus } : u
          ),
        }));
      },

      getUserById: (userId: string) => get().users.find(u => u.id === userId),
      getUserByUsername: (username: string) => get().users.find(u => u.username === username),
    }),
    {
      name: 'chatflow-auth',
      storage: createJSONStorage(() => localStorage),
    }
  )
);

// =============================================================================
// Chat Store
// =============================================================================

interface ChatState {
  chats: Chat[];
  messages: Record<string, Message[]>;
  typingIndicators: TypingIndicator[];
  selectedChatId: string | null;
  searchQuery: string;
  
  // Actions
  createPrivateChat: (userId: string, otherUserId: string) => Chat;
  createGroupChat: (name: string, participantIds: string[], adminId: string) => Chat;
  selectChat: (chatId: string | null) => void;
  sendMessage: (chatId: string, content: string, type?: Message['type'], fileData?: any) => Message;
  deleteMessage: (chatId: string, messageId: string, forEveryone?: boolean) => void;
  editMessage: (chatId: string, messageId: string, newContent: string) => void;
  addReaction: (chatId: string, messageId: string, emoji: string) => void;
  removeReaction: (chatId: string, messageId: string) => void;
  setTyping: (chatId: string, userId: string, isTyping: boolean) => void;
  markAsRead: (chatId: string) => void;
  muteChat: (chatId: string, hours?: number) => void;
  unmuteChat: (chatId: string) => void;
  archiveChat: (chatId: string) => void;
  deleteChat: (chatId: string) => void;
  addToGroup: (chatId: string, userId: string) => void;
  removeFromGroup: (chatId: string, userId: string) => void;
  makeAdmin: (chatId: string, userId: string) => void;
  searchChats: (query: string) => Chat[];
  getChatMessages: (chatId: string) => Message[];
  getUnreadCount: () => number;
}

export const useChatStore = create<ChatState>()(
  persist(
    (set, get) => ({
      chats: [],
      messages: {},
      typingIndicators: [],
      selectedChatId: null,
      searchQuery: '',

      createPrivateChat: (userId: string, otherUserId: string) => {
        const existingChat = get().chats.find(c => 
          c.type === 'private' && 
          c.participants.includes(userId) && 
          c.participants.includes(otherUserId)
        );
        if (existingChat) return existingChat;

        const newChat: Chat = {
          id: crypto.randomUUID(),
          type: 'private',
          participants: [userId, otherUserId],
          unreadCount: 0,
          isMuted: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        set(state => ({
          chats: [...state.chats, newChat],
          messages: { ...state.messages, [newChat.id]: [] },
        }));
        return newChat;
      },

      createGroupChat: (name: string, participantIds: string[], adminId: string) => {
        const newChat: Chat = {
          id: crypto.randomUUID(),
          type: 'group',
          name,
          participants: participantIds,
          adminIds: [adminId],
          unreadCount: 0,
          isMuted: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        set(state => ({
          chats: [...state.chats, newChat],
          messages: { ...state.messages, [newChat.id]: [] },
        }));
        return newChat;
      },

      selectChat: (chatId: string | null) => {
        set({ selectedChatId: chatId });
        if (chatId) {
          get().markAsRead(chatId);
        }
      },

      sendMessage: (chatId: string, content: string, type: Message['type'] = 'text', fileData?: any) => {
        const { currentUser } = useAuthStore.getState();
        if (!currentUser) throw new Error('Not authenticated');

        const newMessage: Message = {
          id: crypto.randomUUID(),
          chatId,
          senderId: currentUser.id,
          type,
          content,
          ...fileData,
          reactions: [],
          status: 'sent',
          isEdited: false,
          isDeleted: false,
          createdAt: new Date(),
        };

        set(state => ({
          messages: {
            ...state.messages,
            [chatId]: [...(state.messages[chatId] || []), newMessage],
          },
          chats: state.chats.map(c => 
            c.id === chatId 
              ? { ...c, lastMessage: newMessage, updatedAt: new Date() } 
              : c
          ),
        }));

        // Simulate message delivery and read
        setTimeout(() => {
          set(state => ({
            messages: {
              ...state.messages,
              [chatId]: state.messages[chatId]?.map(m => 
                m.id === newMessage.id ? { ...m, status: 'delivered' } : m
              ) || [],
            },
          }));
        }, 1000);

        return newMessage;
      },

      deleteMessage: (chatId: string, messageId: string, forEveryone = false) => {
        set(state => ({
          messages: {
            ...state.messages,
            [chatId]: state.messages[chatId]?.map(m => 
              m.id === messageId 
                ? forEveryone ? { ...m, isDeleted: true, content: 'This message was deleted' } : m
                : m
            ) || [],
          },
        }));
      },

      editMessage: (chatId: string, messageId: string, newContent: string) => {
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
      },

      addReaction: (chatId: string, messageId: string, emoji: string) => {
        const { currentUser } = useAuthStore.getState();
        if (!currentUser) return;

        set(state => ({
          messages: {
            ...state.messages,
            [chatId]: state.messages[chatId]?.map(m => 
              m.id === messageId 
                ? { 
                    ...m, 
                    reactions: [...m.reactions.filter(r => r.userId !== currentUser.id), { userId: currentUser.id, emoji }] 
                  } 
                : m
            ) || [],
          },
        }));
      },

      removeReaction: (chatId: string, messageId: string) => {
        const { currentUser } = useAuthStore.getState();
        if (!currentUser) return;

        set(state => ({
          messages: {
            ...state.messages,
            [chatId]: state.messages[chatId]?.map(m => 
              m.id === messageId 
                ? { ...m, reactions: m.reactions.filter(r => r.userId !== currentUser.id) } 
                : m
            ) || [],
          },
        }));
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

      archiveChat: (_chatId: string) => {
        // Implementation for archiving - prefixed with _ to indicate unused
      },

      deleteChat: (chatId: string) => {
        set(state => ({
          chats: state.chats.filter(c => c.id !== chatId),
          messages: Object.fromEntries(
            Object.entries(state.messages).filter(([key]) => key !== chatId)
          ),
        }));
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
    }
  )
);

// =============================================================================
// Status Store
// =============================================================================

interface StatusState {
  statuses: Status[];
  addStatus: (userId: string, text: string) => void;
  deleteStatus: (statusId: string) => void;
  getUserStatuses: (userId: string) => Status[];
  getRecentStatuses: () => Status[];
}

export const useStatusStore = create<StatusState>()(
  persist(
    (set, get) => ({
      statuses: [],

      addStatus: (userId: string, text: string) => {
        const newStatus: Status = {
          id: crypto.randomUUID(),
          userId,
          text,
          createdAt: new Date(),
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        };

        set(state => ({
          statuses: [...state.statuses.filter(s => s.userId !== userId), newStatus],
        }));
      },

      deleteStatus: (statusId: string) => {
        set(state => ({
          statuses: state.statuses.filter(s => s.id !== statusId),
        }));
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
    }
  )
);

// =============================================================================
// AI Store
// =============================================================================

interface AIState {
  conversations: AIConversation[];
  currentConversationId: string | null;
  isLoading: boolean;
  sendMessage: (content: string) => Promise<void>;
  getOrCreateConversation: (userId: string) => AIConversation;
  getConversation: (userId: string) => AIConversation | undefined;
}

export const useAIStore = create<AIState>()(
  persist(
    (set, get) => ({
      conversations: [],
      currentConversationId: null,
      isLoading: false,

      getOrCreateConversation: (userId: string) => {
        let conversation = get().conversations.find(c => c.userId === userId);
        if (!conversation) {
          conversation = {
            id: crypto.randomUUID(),
            userId,
            messages: [],
            createdAt: new Date(),
            updatedAt: new Date(),
          };
          set(state => ({
            conversations: [...state.conversations, conversation!],
            currentConversationId: conversation!.id,
          }));
        }
        return conversation;
      },

      getConversation: (userId: string) => 
        get().conversations.find(c => c.userId === userId),

      sendMessage: async (content: string) => {
        const { currentUser } = useAuthStore.getState();
        if (!currentUser) return;

        const conversation = get().getOrCreateConversation(currentUser.id);
        
        const userMessage: AIMessage = {
          id: crypto.randomUUID(),
          role: 'user',
          content,
          createdAt: new Date(),
        };

        set(state => ({
          conversations: state.conversations.map(c => 
            c.id === conversation.id 
              ? { 
                  ...c, 
                  messages: [...c.messages, userMessage],
                  updatedAt: new Date(),
                } 
              : c
          ),
          isLoading: true,
        }));

        // Simulate AI response
        setTimeout(() => {
          const aiResponse: AIMessage = {
            id: crypto.randomUUID(),
            role: 'assistant',
            content: generateAIResponse(content),
            createdAt: new Date(),
          };

          set(state => ({
            conversations: state.conversations.map(c => 
              c.id === conversation.id 
                ? { 
                    ...c, 
                    messages: [...c.messages, aiResponse],
                    updatedAt: new Date(),
                  } 
                : c
            ),
            isLoading: false,
          }));
        }, 1500);
      },
    }),
    {
      name: 'chatflow-ai',
      storage: createJSONStorage(() => localStorage),
    }
  )
);

// Simple AI response generator
function generateAIResponse(input: string): string {
  const lowerInput = input.toLowerCase();
  
  if (lowerInput.includes('hello') || lowerInput.includes('hi')) {
    return "Hello there! 👋 I'm ChatFlow AI, your personal assistant. How can I help you today?";
  }
  if (lowerInput.includes('help')) {
    return "I can help you with:\n• Answering questions\n• Summarizing conversations\n• Playing games\n• Giving advice\n• And much more!\n\nWhat would you like to do?";
  }
  if (lowerInput.includes('game') || lowerInput.includes('play')) {
    return "I love games! 🎮 You can play Tic-Tac-Toe, Rock Paper Scissors, Word Chain, Trivia, or Hangman in any chat. Just type /game to start!";
  }
  if (lowerInput.includes('weather')) {
    return "I don't have access to real-time weather data, but I can help you find weather websites or apps! ☀️";
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
    return "You're welcome! 😊 I'm always here to help. Is there anything else I can assist you with?";
  }
  
  return "That's interesting! Tell me more, or ask me anything you'd like to know. I'm here to chat, help with information, or even play games with you! 🎯";
}

// =============================================================================
// Game Store
// =============================================================================

interface GameState {
  activeGames: Record<string, GameData>;
  startGame: (chatId: string, gameType: GameType, players: string[]) => void;
  makeMove: (chatId: string, playerId: string, move: any) => void;
  endGame: (chatId: string) => void;
  getGame: (chatId: string) => GameData | undefined;
}

export const useGameStore = create<GameState>()(
  persist(
    (set, get) => ({
      activeGames: {},

      startGame: (chatId: string, gameType: GameType, players: string[]) => {
        let initialState: any = {};
        
        switch (gameType) {
          case 'tic-tac-toe':
            initialState = {
              board: Array(9).fill(null),
              currentPlayer: 0,
            };
            break;
          case 'rock-paper-scissors':
            initialState = {
              player1Move: null,
              player2Move: null,
              round: 1,
              scores: { player1: 0, player2: 0 },
            };
            break;
          case 'word-chain':
            initialState = {
              words: [],
              currentPlayer: 0,
              lastLetter: '',
            };
            break;
          case 'trivia':
            initialState = {
              currentQuestion: 0,
              scores: players.reduce((acc, p) => ({ ...acc, [p]: 0 }), {}),
              answered: [],
            };
            break;
          case 'hangman':
            initialState = {
              word: '',
              guessedLetters: [],
              wrongGuesses: 0,
              maxWrongGuesses: 6,
            };
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
      },

      makeMove: (chatId: string, playerId: string, move: any) => {
        const game = get().activeGames[chatId];
        if (!game || game.currentPlayer !== playerId) return;

        // Game-specific move logic handled in components
        set(state => ({
          activeGames: {
            ...state.activeGames,
            [chatId]: { ...game, gameState: { ...game.gameState, ...move } },
          },
        }));
      },

      endGame: (chatId: string) => {
        set(state => {
          const { [chatId]: _, ...rest } = state.activeGames;
          return { activeGames: rest };
        });
      },

      getGame: (chatId: string) => get().activeGames[chatId],
    }),
    {
      name: 'chatflow-games',
      storage: createJSONStorage(() => localStorage),
    }
  )
);

// =============================================================================
// Settings Store
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
// UI Store (for temporary UI state)
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
