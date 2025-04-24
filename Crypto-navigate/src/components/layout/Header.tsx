
import React, { useState } from 'react';
import { Bell, Settings, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import ThemeToggle from '../shared/ThemeToggle';
import { useNavigate } from 'react-router-dom';
import NotificationsDialog from '../shared/NotificationsDialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

const Header: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  
  const handleProfileClick = () => {
    navigate('/profile');
  };
  
  const handleSettingsClick = () => {
    navigate('/settings');
  };
  
  return (
    <header className="h-16 border-b flex items-center justify-between px-4 md:px-6 bg-background">
      <div className="flex items-center space-x-2">
        <h2 className="text-xl font-semibold hidden md:block">
          Crypto Trading Suite
        </h2>
      </div>
      
      <div className="flex items-center space-x-4">
        <ThemeToggle />
        
        <Button 
          variant="ghost" 
          size="icon" 
          className="relative"
          onClick={() => setNotificationsOpen(true)}
        >
          <Bell size={20} />
          <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
        </Button>
        
        <NotificationsDialog 
          open={notificationsOpen}
          onOpenChange={setNotificationsOpen}
        />
        
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="rounded-full border">
              <User size={18} />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>{user?.email || 'User'}</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleProfileClick}>
              <User className="mr-2 h-4 w-4" />
              <span>Profile</span>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleSettingsClick}>
              <Settings className="mr-2 h-4 w-4" />
              <span>Settings</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => logout()}>
              Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
};

export default Header;
