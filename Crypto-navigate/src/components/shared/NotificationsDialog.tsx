
import React from 'react';
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription
} from "@/components/ui/dialog";
import { Bell, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';

type Notification = {
  id: string;
  title: string;
  description: string;
  type: 'info' | 'success' | 'warning' | 'error';
  read: boolean;
  timestamp: Date;
};

// Mock notifications for demo
const mockNotifications: Notification[] = [
  {
    id: '1',
    title: 'Trade executed',
    description: 'Your BTC/USDT buy order has been executed successfully.',
    type: 'success',
    read: false,
    timestamp: new Date(Date.now() - 15 * 60000), // 15 minutes ago
  },
  {
    id: '2',
    title: 'Price alert',
    description: 'ETH/USDT has dropped below your alert threshold of $2,800.',
    type: 'warning',
    read: false,
    timestamp: new Date(Date.now() - 45 * 60000), // 45 minutes ago
  },
  {
    id: '3',
    title: 'Strategy activated',
    description: 'Your "BTC Momentum" strategy has been activated.',
    type: 'info',
    read: true,
    timestamp: new Date(Date.now() - 120 * 60000), // 2 hours ago
  },
  {
    id: '4',
    title: 'API connection issue',
    description: 'There was a problem connecting to the exchange API.',
    type: 'error',
    read: true,
    timestamp: new Date(Date.now() - 240 * 60000), // 4 hours ago
  },
];

interface NotificationsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const NotificationsDialog: React.FC<NotificationsDialogProps> = ({
  open,
  onOpenChange
}) => {
  const [notifications, setNotifications] = React.useState<Notification[]>(mockNotifications);
  
  const getIcon = (type: Notification['type']) => {
    switch(type) {
      case 'success':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'warning':
        return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
      case 'error':
        return <XCircle className="h-5 w-5 text-red-500" />;
      default:
        return <Bell className="h-5 w-5 text-blue-500" />;
    }
  };
  
  const formatTime = (date: Date) => {
    const hours = date.getHours();
    const minutes = date.getMinutes();
    return `${hours}:${minutes < 10 ? '0' + minutes : minutes}`;
  };
  
  const markAllAsRead = () => {
    setNotifications(notifications.map(notification => ({
      ...notification,
      read: true
    })));
  };
  
  const unreadCount = notifications.filter(notification => !notification.read).length;
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Notifications</DialogTitle>
          <DialogDescription>
            You have {unreadCount} unread notification{unreadCount !== 1 ? 's' : ''}
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex justify-end mb-2">
          <Button variant="outline" size="sm" onClick={markAllAsRead}>
            Mark all as read
          </Button>
        </div>
        
        <ScrollArea className="max-h-[60vh]">
          <div className="space-y-2">
            {notifications.length > 0 ? (
              notifications.map((notification) => (
                <div 
                  key={notification.id} 
                  className={`p-3 border rounded-md ${notification.read ? 'bg-background' : 'bg-muted/30'}`}
                >
                  <div className="flex items-start gap-3">
                    {getIcon(notification.type)}
                    <div className="flex-1">
                      <div className="flex justify-between items-center mb-1">
                        <h4 className="font-medium">{notification.title}</h4>
                        <span className="text-xs text-muted-foreground">{formatTime(notification.timestamp)}</span>
                      </div>
                      <p className="text-sm text-muted-foreground">{notification.description}</p>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-6 text-muted-foreground">
                No notifications
              </div>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};

export default NotificationsDialog;
