
import React from 'react';
import { Moon, Sun } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTheme } from '@/contexts/ThemeContext';

const ThemeToggle: React.FC = () => {
  const { theme, setTheme } = useTheme();
  
  const toggleTheme = () => {
    setTheme(theme === 'light' ? 'dark' : 'light');
  };
  
  return (
    <Button variant="ghost" size="icon" onClick={toggleTheme}>
      {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
    </Button>
  );
};

export default ThemeToggle;
