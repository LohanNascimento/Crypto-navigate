import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  AreaChart, 
  Activity,
  Layers,
  History,
  Settings,
  Gauge,
  FileText,
  BellRing,
  Menu,
  X,
  CandlestickChart,
  HelpCircle
} from 'lucide-react';

const Sidebar: React.FC = () => {
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  
  const toggleMobileMenu = () => {
    setMobileOpen(prev => !prev);
  };
  
  const navItems = [
    { name: 'Dashboard', path: '/dashboard', icon: <Gauge size={20} /> },
    { name: 'Strategies', path: '/strategies', icon: <Activity size={20} /> },
    { name: 'Trading History', path: '/history', icon: <History size={20} /> },
    { name: 'Alerts', path: '/alerts', icon: <BellRing size={20} /> },
    { name: 'Settings', path: '/settings', icon: <Settings size={20} /> },
    { name: 'About', path: '/about', icon: <HelpCircle size={20} /> },
  ];
  
  return (
    <>
      {/* Mobile menu button */}
      <div className="md:hidden fixed top-0 left-0 z-30 p-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleMobileMenu}
          className="bg-background/80 backdrop-blur-sm"
        >
          {mobileOpen ? <X size={20} /> : <Menu size={20} />}
        </Button>
      </div>
      
      {/* Sidebar for both mobile and desktop */}
      <div
        className={cn(
          "bg-sidebar text-sidebar-foreground fixed inset-y-0 left-0 z-20 w-64 flex-col border-r border-sidebar-border transition-transform duration-300 md:translate-x-0 md:relative",
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex h-16 items-center border-b border-sidebar-border px-6">
          <Link to="/dashboard" className="flex items-center space-x-2" onClick={() => setMobileOpen(false)}>
            <AreaChart className="h-6 w-6 text-cryptoBlue" />
            <span className="font-bold text-lg">CryptoSuite</span>
          </Link>
        </div>
        
        <nav className="flex-1 overflow-auto p-4">
          <ul className="space-y-1">
            {navItems.map((item) => (
              <li key={item.path}>
                <Link
                  to={item.path}
                  onClick={() => setMobileOpen(false)}
                  className={cn(
                    "flex items-center space-x-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                    location.pathname === item.path
                      ? "bg-sidebar-accent text-sidebar-accent-foreground"
                      : "hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground"
                  )}
                >
                  {item.icon}
                  <span>{item.name}</span>
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        
        <div className="border-t border-sidebar-border p-4">
          <div className="rounded-md bg-sidebar-accent/50 p-3">
            <div className="flex items-center space-x-3 mb-2">
              <Layers size={18} />
              <span className="font-medium">Account Status</span>
            </div>
            <div className="text-xs opacity-90">
              <p>Connected to Binance</p>
              <p>5 Active Strategies</p>
              <p>2 Open Positions</p>
            </div>
          </div>
        </div>
      </div>
      
      {/* Overlay for mobile */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-10 bg-black/50 md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}
    </>
  );
};

export default Sidebar;
