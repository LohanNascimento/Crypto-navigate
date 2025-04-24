/**
 * Este arquivo fornece polyfills para módulos Node.js usados pela CCXT
 * no contexto do navegador.
 */

// Polyfill para isIP do node:net (usado em node-fetch/utils/referrer.js)
export const isIP = () => 0;
export const isIPv6 = () => false;
export const connect = () => null;

// Classe Socket usada em vários lugares
export class Socket {
  constructor() {}
  connect() { return this; }
  on() { return this; }
  setTimeout() { return this; }
  end() {}
}

// Polyfill para o referrer.js
export const stripURLForUseAsAReferrer = (referrer) => {
  return typeof referrer === 'string' ? referrer : 'about:client';
};

export const validateReferrerPolicy = (referrerPolicy) => {
  return referrerPolicy || 'strict-origin-when-cross-origin';
};

export const determineRequestsReferrer = () => {
  return 'about:client';
};

// Exportação padrão que pode ser importada como um módulo completo
export default {
  isIP,
  isIPv6,
  connect,
  Socket,
  stripURLForUseAsAReferrer,
  validateReferrerPolicy,
  determineRequestsReferrer
}; 