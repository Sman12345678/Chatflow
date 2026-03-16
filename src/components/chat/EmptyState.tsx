import { MessageCircle, Lock, Shield, Zap, Gamepad2, Bot } from 'lucide-react';

export function EmptyState() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center bg-[#f0f2f5] dark:bg-[#0b141a] p-8">
      <div className="text-center max-w-md">
        {/* Logo */}
        <div className="mb-8">
          <div className="w-32 h-32 mx-auto bg-gradient-to-br from-[#128C7E] to-[#075E54] rounded-3xl flex items-center justify-center shadow-2xl">
            <MessageCircle className="w-16 h-16 text-white" />
          </div>
        </div>

        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
          ChatFlow
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mb-8">
          Connect with friends, play games, and chat with AI - all in one place.
        </p>

        {/* Features */}
        <div className="grid grid-cols-2 gap-4 mb-8">
          <div className="p-4 bg-white dark:bg-[#202c33] rounded-xl">
            <div className="w-10 h-10 bg-[#128C7E]/10 rounded-lg flex items-center justify-center mb-2 mx-auto">
              <Bot className="w-5 h-5 text-[#128C7E]" />
            </div>
            <p className="text-sm font-medium text-gray-900 dark:text-white">AI Assistant</p>
            <p className="text-xs text-gray-500">Get help anytime</p>
          </div>
          <div className="p-4 bg-white dark:bg-[#202c33] rounded-xl">
            <div className="w-10 h-10 bg-[#128C7E]/10 rounded-lg flex items-center justify-center mb-2 mx-auto">
              <Gamepad2 className="w-5 h-5 text-[#128C7E]" />
            </div>
            <p className="text-sm font-medium text-gray-900 dark:text-white">In-Chat Games</p>
            <p className="text-xs text-gray-500">Play while chatting</p>
          </div>
          <div className="p-4 bg-white dark:bg-[#202c33] rounded-xl">
            <div className="w-10 h-10 bg-[#128C7E]/10 rounded-lg flex items-center justify-center mb-2 mx-auto">
              <Shield className="w-5 h-5 text-[#128C7E]" />
            </div>
            <p className="text-sm font-medium text-gray-900 dark:text-white">Secure</p>
            <p className="text-xs text-gray-500">Private messaging</p>
          </div>
          <div className="p-4 bg-white dark:bg-[#202c33] rounded-xl">
            <div className="w-10 h-10 bg-[#128C7E]/10 rounded-lg flex items-center justify-center mb-2 mx-auto">
              <Zap className="w-5 h-5 text-[#128C7E]" />
            </div>
            <p className="text-sm font-medium text-gray-900 dark:text-white">Fast</p>
            <p className="text-xs text-gray-500">Instant delivery</p>
          </div>
        </div>

        <div className="flex items-center justify-center gap-2 text-sm text-gray-500">
          <Lock className="w-4 h-4" />
          <span>End-to-end encrypted (simulated)</span>
        </div>
      </div>
    </div>
  );
}
