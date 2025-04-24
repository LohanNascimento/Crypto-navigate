import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import { ThemeProvider } from "./contexts/ThemeContext";
import AppLayout from "./components/layout/AppLayout";
import Index from "./pages/Index";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import History from "./pages/History";
import Strategies from "./pages/Strategies";
import Alerts from "./pages/Alerts";
import Settings from "./pages/Settings";
import Profile from "./pages/Profile";
import About from "./pages/About";
import NotFound from "./pages/NotFound";
import ProtectedRoute from "./components/auth/ProtectedRoute";
import Register from "./pages/Register";
import { AIStrategyConfig } from '@/components/strategy/AIStrategyConfig';
//import { AIBacktestResults } from '@/components/strategy/AIBacktestResults';
import AIAnalysisCard from '@/components/dashboard/AIAnalysisCard';
import AIPerformanceCard from '@/components/dashboard/AIPerformanceCard';
import { useState, useEffect } from 'react';
const queryClient = new QueryClient();

const App = () => {
  const [error, setError] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    console.log('App component mounted');
    
    // Verificar se o script CCXT está causando problemas
    try {
      // Registrar tentativa de montar o componente
      setLoaded(true);
    } catch (err) {
      console.error('Erro ao carregar a aplicação:', err);
      setError(err instanceof Error ? err.message : 'Erro desconhecido');
    }
  }, []);

  // Renderiza apenas um elemento simples para testar se a aplicação consegue montar
  if (error) {
    return (
      <div style={{ margin: '2rem', padding: '1rem', border: '1px solid red', color: 'red' }}>
        <h1>Erro ao inicializar a aplicação</h1>
        <p>{error}</p>
      </div>
    );
  }

  // Para depuração: testar se pelo menos algo está sendo renderizado
  if (!loaded) {
    return <div>Carregando...</div>;
  }

  // Versão original da aplicação
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <ThemeProvider>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter>
              <Routes>
                <Route path="/" element={<Index />} />
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />
                
                <Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
                  <Route path="/dashboard" element={<Dashboard />} />
                  <Route path="/history" element={<History />} />
                  <Route path="/strategies" element={<Strategies />} />
                  <Route path="/alerts" element={<Alerts />} />
                  <Route path="/settings" element={<Settings />} />
                  <Route path="/profile" element={<Profile />} />
                  <Route path="/about" element={<About />} />
                  <Route path="/" element={<Navigate to="/dashboard" replace />} />
                </Route>
                
                <Route path="*" element={<NotFound />} />
              </Routes>
            </BrowserRouter>
          </TooltipProvider>
        </ThemeProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
};

export default App;
