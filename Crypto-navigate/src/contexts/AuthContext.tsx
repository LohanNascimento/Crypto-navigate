import React, { createContext, useContext, useState, useEffect } from 'react';
import { toast } from 'sonner';
import { userSchema, loginSchema, credentialsSchema, User } from '@/lib/validations/auth';
import { logger } from '@/lib/logger';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  updateUser: (userData: Partial<User>) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Verificar se há dados de usuário no localStorage
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
    setIsLoading(false);
  }, []);

  const login = async (email: string, password: string) => {
    try {
      setIsLoading(true);
      
      // Validar dados de login
      const loginData = loginSchema.parse({ email, password });
      logger.info('Tentativa de login', { 
        module: 'auth',
        action: 'login',
        metadata: { email: loginData.email }
      });
      
      // Verificar se há credenciais salvas
      const savedCredentials = localStorage.getItem('credentials');
      if (savedCredentials) {
        const parsedCredentials = credentialsSchema.safeParse(JSON.parse(savedCredentials));
        if (parsedCredentials.success) {
          const { email: savedEmail, password: savedPassword } = parsedCredentials.data;
          if (loginData.email === savedEmail && loginData.password === savedPassword) {
            const userData = {
              id: Date.now().toString(),
              name: loginData.email.split('@')[0],
              email: loginData.email,
              avatar: 'https://github.com/shadcn.png'
            };
            
            const validatedUser = userSchema.parse(userData);
            setUser(validatedUser);
            localStorage.setItem('user', JSON.stringify(validatedUser));
            
            logger.info('Login realizado com sucesso', {
              module: 'auth',
              action: 'login_success',
              userId: validatedUser.id
            });
            
            toast.success('Login realizado com sucesso!');
            return;
          }
        }
      }
      
      // Se não houver credenciais salvas, verificar as credenciais de teste
      if (loginData.email === 'test@example.com' && loginData.password === 'password') {
        const mockUser = userSchema.parse({
          id: '1',
          name: 'Test User',
          email: 'test@example.com',
          avatar: 'https://github.com/shadcn.png'
        });
        
        setUser(mockUser);
        localStorage.setItem('user', JSON.stringify(mockUser));
        
        logger.info('Login de teste realizado com sucesso', {
          module: 'auth',
          action: 'test_login_success',
          userId: mockUser.id
        });
        
        toast.success('Login realizado com sucesso!');
      } else {
        logger.warn('Tentativa de login com credenciais inválidas', {
          module: 'auth',
          action: 'login_failed',
          metadata: { email: loginData.email }
        });
        throw new Error('Credenciais inválidas');
      }
    } catch (error) {
      logger.error('Erro durante o login', {
        module: 'auth',
        action: 'login_error',
        metadata: { error: error instanceof Error ? error.message : 'Erro desconhecido' }
      });
      toast.error('Falha no login. Verifique suas credenciais.');
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('user');
  };

  const updateUser = (userData: Partial<User>) => {
    if (user) {
      try {
        const updatedUser = userSchema.parse({ ...user, ...userData });
        setUser(updatedUser);
        localStorage.setItem('user', JSON.stringify(updatedUser));
        
        logger.info('Dados do usuário atualizados', {
          module: 'auth',
          action: 'update_user',
          userId: updatedUser.id,
          metadata: { updatedFields: Object.keys(userData) }
        });
      } catch (error) {
        logger.error('Erro ao atualizar dados do usuário', {
          module: 'auth',
          action: 'update_user_error',
          userId: user.id,
          metadata: { error: error instanceof Error ? error.message : 'Erro desconhecido' }
        });
        throw error;
      }
    }
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, login, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
