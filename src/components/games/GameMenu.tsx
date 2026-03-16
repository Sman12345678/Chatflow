import { useChatStore } from '@/store';
import { X, Gamepad2, Hand, Link2, HelpCircle, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { GameType } from '@/types';

interface GameMenuProps {
  chatId: string;
  onClose: () => void;
}

const GAMES: { type: GameType; name: string; description: string; icon: React.ReactNode }[] = [
  { 
    type: 'tic-tac-toe', 
    name: 'Tic-Tac-Toe', 
    description: 'Classic X and O game',
    icon: <div className="grid grid-cols-2 gap-0.5 w-5 h-5"><div className="border border-current" /><div className="border border-current" /><div className="border border-current" /><div className="border border-current" /></div>
  },
  { 
    type: 'rock-paper-scissors', 
    name: 'Rock Paper Scissors', 
    description: 'Quick hand game',
    icon: <Hand className="w-5 h-5" />
  },
  { 
    type: 'word-chain', 
    name: 'Word Chain', 
    description: 'Connect words together',
    icon: <Link2 className="w-5 h-5" />
  },
  { 
    type: 'trivia', 
    name: 'Trivia Quiz', 
    description: 'Test your knowledge',
    icon: <HelpCircle className="w-5 h-5" />
  },
  { 
    type: 'hangman', 
    name: 'Hangman', 
    description: 'Guess the word',
    icon: <User className="w-5 h-5" />
  },
];

export function GameMenu({ chatId, onClose }: GameMenuProps) {
  const { sendMessage } = useChatStore();

  const handleStartGame = (gameType: GameType) => {
    const game = GAMES.find(g => g.type === gameType);
    if (game) {
      sendMessage(
        chatId,
        `Let's play ${game.name}! 🎮`,
        'game',
        { gameData: { gameType, gameState: {}, currentPlayer: '' } }
      );
    }
    onClose();
  };

  return (
    <div className="px-4 py-3 bg-white dark:bg-[#202c33] border-t border-gray-200 dark:border-gray-700">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Gamepad2 className="w-5 h-5 text-[#128C7E]" />
          <span className="font-medium text-gray-900 dark:text-white">Play a Game</span>
        </div>
        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onClose}>
          <X className="w-4 h-4" />
        </Button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {GAMES.map((game) => (
          <button
            key={game.type}
            onClick={() => handleStartGame(game.type)}
            className="p-3 rounded-lg bg-gray-50 dark:bg-[#2a3942] hover:bg-[#128C7E]/10 dark:hover:bg-[#128C7E]/20 transition-colors text-left"
          >
            <div className="text-[#128C7E] mb-2">{game.icon}</div>
            <p className="font-medium text-sm text-gray-900 dark:text-white">{game.name}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">{game.description}</p>
          </button>
        ))}
      </div>
    </div>
  );
}
