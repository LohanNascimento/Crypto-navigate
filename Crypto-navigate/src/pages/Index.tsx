import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { isCCXTAvailable, getCCXTLoadError } from '../services/ccxtWrapper';

const Index: React.FC = () => {
  const [ccxtStatus, setCcxtStatus] = useState<string>('Verificando...');
  const [debug, setDebug] = useState<{[key: string]: any}>({});

  useEffect(() => {
    // Verificar status do CCXT
    const ccxtGlobal = typeof window !== 'undefined' && 'ccxt' in window;
    const ccxtWrapper = isCCXTAvailable();
    const error = getCCXTLoadError();

    setCcxtStatus(
      ccxtGlobal 
        ? 'CCXT disponível globalmente via CDN' 
        : ccxtWrapper 
          ? 'CCXT disponível via wrapper' 
          : 'CCXT não disponível'
    );

    // Coletar informações de depuração
    setDebug({
      ccxtGlobal,
      ccxtWrapper,
      error: error ? error.message : null,
      userAgent: navigator.userAgent,
      windowSize: `${window.innerWidth}x${window.innerHeight}`,
      url: window.location.href,
      rootElement: document.getElementById('root') ? 'Encontrado' : 'Não encontrado'
    });
  }, []);

  return (
    <div style={{ 
      maxWidth: '800px', 
      margin: '0 auto', 
      padding: '2rem', 
      fontFamily: 'system-ui, sans-serif',
      textAlign: 'center' 
    }}>
      <h1>Crypto Navigation Suite</h1>
      <p>Bem-vindo à aplicação de navegação de criptomoedas.</p>
      
      <div style={{ margin: '2rem 0' }}>
        <Link 
          to="/login" 
          style={{ 
            padding: '0.75rem 1.5rem', 
            background: '#3b82f6', 
            color: 'white', 
            borderRadius: '0.375rem',
            textDecoration: 'none',
            marginRight: '1rem'
          }}
        >
          Login
        </Link>
        
        <Link 
          to="/register" 
          style={{ 
            padding: '0.75rem 1.5rem', 
            background: '#4ade80', 
            color: 'white', 
            borderRadius: '0.375rem',
            textDecoration: 'none'
          }}
        >
          Registrar
        </Link>
      </div>
      
      <div style={{ margin: '2rem 0', textAlign: 'left', padding: '1rem', background: '#f3f4f6', borderRadius: '0.5rem' }}>
        <h2>Diagnóstico da Aplicação</h2>
        <p><strong>Status CCXT:</strong> {ccxtStatus}</p>
        
        <h3>Informações de Depuração:</h3>
        <pre style={{ background: '#e5e7eb', padding: '1rem', borderRadius: '0.25rem', overflow: 'auto' }}>
          {JSON.stringify(debug, null, 2)}
        </pre>
      </div>
    </div>
  );
};

export default Index;
