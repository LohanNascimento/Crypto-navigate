import React, { useEffect, useState } from 'react';
import Sidebar from './Sidebar';
import Header from './Header';
import { Outlet, useNavigate } from 'react-router-dom';
import { useTheme } from '../../contexts/ThemeContext';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { AlertTriangle } from 'lucide-react';
import AuthService from '@/services/authService';

const AppLayout: React.FC = () => {
  const { theme } = useTheme();
  const navigate = useNavigate();
  const [showApiAlert, setShowApiAlert] = useState(false);
  
  useEffect(() => {
    const authService = AuthService.getInstance();
    // Verificar se o usuário tem credenciais API salvas
    const hasCredentials = authService.hasApiCredentials();
    setShowApiAlert(!hasCredentials);
  }, []);
  
  const handleGoToSettings = () => {
    navigate('/settings');
    setShowApiAlert(false);
  };
  
  return (
    <div className={`min-h-screen flex flex-col md:flex-row bg-background text-foreground`}>
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Header />
        <main className="flex-1 overflow-auto p-4 md:p-6">
          {showApiAlert && (
            <Alert variant="destructive" className="mb-4">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Credenciais da API não encontradas</AlertTitle>
              <AlertDescription className="flex flex-col gap-2">
                <p>Você precisa configurar suas credenciais da API Binance Testnet para usar todas as funcionalidades do aplicativo.</p>
                <div>
                  <Button variant="outline" size="sm" onClick={handleGoToSettings}>
                    Configurar API
                  </Button>
                </div>
              </AlertDescription>
            </Alert>
          )}
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default AppLayout;
