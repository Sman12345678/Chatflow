import { useState, useEffect } from 'react';
import { useAuthStore, useSettingsStore } from '@/store';
import { Login } from '@/components/auth/Login';
import { Register } from '@/components/auth/Register';
import { ChatLayout } from '@/components/layout/ChatLayout';
import { applyTheme } from '@/lib/utils';
import { Toaster } from '@/components/ui/sonner';

function App() {
  const [isLoginMode, setIsLoginMode] = useState(true);
  const isAuthenticated = useAuthStore(state => state.isAuthenticated);
  const theme = useSettingsStore(state => state.settings.theme);

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  // Listen for system theme changes
  useEffect(() => {
    if (theme === 'system') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const handleChange = () => applyTheme('system');
      mediaQuery.addEventListener('change', handleChange);
      return () => mediaQuery.removeEventListener('change', handleChange);
    }
  }, [theme]);

  if (!isAuthenticated) {
    return (
      <>
        {isLoginMode ? (
          <Login onToggleMode={() => setIsLoginMode(false)} />
        ) : (
          <Register onToggleMode={() => setIsLoginMode(true)} />
        )}
        <Toaster />
      </>
    );
  }

  return (
    <>
      <ChatLayout />
      <Toaster />
    </>
  );
}

export default App;
