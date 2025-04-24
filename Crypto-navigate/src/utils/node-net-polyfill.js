// Polyfill para o módulo 'node:net' usado pela CCXT
export function isIP() {
  // Implementação dummy que sempre retorna 0 (não é um IP válido)
  return 0;
}

export function isIPv6() {
  // Implementação dummy que sempre retorna false
  return false;
}

export function connect() {
  // Implementação dummy
  console.warn("Chamada para 'connect' de node:net no navegador");
  return null;
}

export class Socket {
  constructor() {
    console.warn("Criação de Socket do Node.js no navegador");
  }
  
  connect() {
    return null;
  }
  
  on() {
    return this;
  }
  
  setTimeout() {
    return this;
  }
  
  end() {
    return this;
  }
}

// Exportação padrão
export default {
  isIP,
  isIPv6,
  connect,
  Socket
}; 