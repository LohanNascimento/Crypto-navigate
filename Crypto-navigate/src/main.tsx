import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'

// Componente para capturar erros
const ErrorBoundary = ({ children }: { children: React.ReactNode }) => {
  try {
    return <>{children}</>;
  } catch (error) {
    console.error('Erro durante renderização:', error);
    return (
      <div style={{ padding: '20px', color: 'red', background: '#ffeeee', border: '1px solid red' }}>
        <h2>Erro ao renderizar aplicação</h2>
        <p>{error instanceof Error ? error.message : String(error)}</p>
      </div>
    );
  }
};

// Envolve a renderização com tratamento de erros
try {
  console.log('Iniciando renderização da aplicação');
  const rootElement = document.getElementById("root");
  
  if (!rootElement) {
    console.error('Elemento root não encontrado no DOM');
    document.body.innerHTML = '<div style="color:red">Elemento root não encontrado!</div>';
  } else {
    createRoot(rootElement).render(
      <ErrorBoundary>
        <App />
      </ErrorBoundary>
    );
    console.log('Renderização iniciada com sucesso');
  }
} catch (error) {
  console.error('Erro ao montar aplicação:', error);
  document.body.innerHTML = `<div style="color:red">Erro ao montar aplicação: ${error instanceof Error ? error.message : String(error)}</div>`;
}
