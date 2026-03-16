import { useState, useRef, useEffect } from 'react';
import { useAuthStore, useAIStore } from '@/store';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Send, Bot, ArrowLeft, Sparkles, Lightbulb } from 'lucide-react';
import { getInitials, getAvatarColor } from '@/lib/utils';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';

interface AIChatProps {
  onBack: () => void;
}

const SUGGESTIONS = [
  'Tell me a joke',
  'Help me write a message',
  'What games can we play?',
  'Summarize my chats',
  'Give me advice',
  'Translate "hello" to Spanish',
];

export function AIChat({ onBack }: AIChatProps) {
  const { currentUser } = useAuthStore();
  const { getOrCreateConversation, sendMessage, isLoading } = useAIStore();
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const conversation = currentUser ? getOrCreateConversation(currentUser.id) : null;
  const messages = conversation?.messages || [];

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;
    await sendMessage(input.trim());
    setInput('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleSuggestion = (suggestion: string) => {
    setInput(suggestion);
  };

  return (
    <div className="flex flex-col h-full bg-[#f0f2f5] dark:bg-[#0b141a]">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 bg-[#f0f2f5] dark:bg-[#202c33] border-b border-gray-200 dark:border-gray-700">
        <Button variant="ghost" size="icon" onClick={onBack} className="md:hidden">
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#128C7E] to-[#075E54] flex items-center justify-center">
          <Bot className="w-6 h-6 text-white" />
        </div>
        <div>
          <h3 className="font-medium text-gray-900 dark:text-white">ChatFlow AI</h3>
          <p className="text-sm text-green-500">Online</p>
        </div>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 px-4 py-4">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center p-8">
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-[#128C7E] to-[#075E54] flex items-center justify-center mb-6">
              <Sparkles className="w-10 h-10 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              Chat with AI
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-8 max-w-md">
              Your personal assistant is here to help! Ask questions, get advice, 
              play games, or just have a conversation.
            </p>

            <div className="grid grid-cols-2 gap-3 w-full max-w-md">
              {SUGGESTIONS.map((suggestion) => (
                <button
                  key={suggestion}
                  onClick={() => handleSuggestion(suggestion)}
                  className="p-3 bg-white dark:bg-[#202c33] rounded-lg text-left hover:bg-[#128C7E]/10 dark:hover:bg-[#128C7E]/20 transition-colors"
                >
                  <Lightbulb className="w-4 h-4 text-[#128C7E] mb-1" />
                  <span className="text-sm text-gray-700 dark:text-gray-300">{suggestion}</span>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div className={`flex items-end gap-2 max-w-[80%] ${message.role === 'user' ? 'flex-row-reverse' : ''}`}>
                  {message.role === 'assistant' ? (
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#128C7E] to-[#075E54] flex items-center justify-center flex-shrink-0">
                      <Bot className="w-4 h-4 text-white" />
                    </div>
                  ) : (
                    <Avatar className="w-8 h-8 flex-shrink-0">
                      <AvatarFallback className={`${getAvatarColor(currentUser?.username || '')} text-white text-xs font-semibold`}>
                        {getInitials(currentUser?.displayName || currentUser?.username || 'U')}
                      </AvatarFallback>
                    </Avatar>
                  )}
                  
                  <div
                    className={`px-4 py-2 rounded-lg ${
                      message.role === 'user'
                        ? 'bg-[#dcf8c6] dark:bg-[#005c4b] text-gray-900 dark:text-white'
                        : 'bg-white dark:bg-[#202c33] text-gray-900 dark:text-white'
                    }`}
                  >
                    <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                  </div>
                </div>
              </div>
            ))}
            
            {isLoading && (
              <div className="flex justify-start">
                <div className="flex items-end gap-2">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#128C7E] to-[#075E54] flex items-center justify-center">
                    <Bot className="w-4 h-4 text-white" />
                  </div>
                  <div className="px-4 py-3 bg-white dark:bg-[#202c33] rounded-lg">
                    <div className="flex gap-1">
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        )}
      </ScrollArea>

      {/* Input */}
      <div className="px-4 py-3 bg-[#f0f2f5] dark:bg-[#202c33]">
        <div className="flex items-center gap-2">
          <div className="flex-1 bg-white dark:bg-[#2a3942] rounded-full px-4 py-2">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask me anything..."
              className="border-0 bg-transparent focus-visible:ring-0 px-0 py-0 h-auto"
              disabled={isLoading}
            />
          </div>
          <Button
            onClick={handleSend}
            disabled={!input.trim() || isLoading}
            className="bg-[#128C7E] hover:bg-[#075E54] text-white rounded-full w-10 h-10 p-0"
          >
            <Send className="w-5 h-5" />
          </Button>
        </div>
      </div>
    </div>
  );
}
