// Substituição para o módulo referrer.js do node-fetch
// Este arquivo tem as mesmas exportações do original, mas sem dependências do Node.js

/**
 * @typedef {import('url').URL} URL
 */

/**
 * @param {string|URL} referrer
 * @returns {string}
 */
export function stripURLForUseAsAReferrer(referrer) {
  // URL é um objeto no navegador
  if (referrer instanceof URL) {
    const { protocol, username, password, host, port, pathname, search, hash } = referrer;
    
    // Garantir que seja http/https
    if (protocol !== 'http:' && protocol !== 'https:') {
      return 'no-referrer';
    }

    // Remover credenciais
    return `${protocol}//${host}${port ? `:${port}` : ''}${pathname}${search}${hash}`;
  }

  // Se for uma string, assumir que já está em formato adequado
  return referrer.toString();
}

/**
 * @param {string} referrer
 * @param {string} destination
 * @returns {string}
 */
export function validateReferrerPolicy(referrerPolicy) {
  // Lista de políticas válidas
  const policies = new Set([
    '',
    'no-referrer',
    'no-referrer-when-downgrade',
    'same-origin',
    'origin',
    'strict-origin',
    'origin-when-cross-origin',
    'strict-origin-when-cross-origin',
    'unsafe-url'
  ]);

  // Retornar política padrão se a fornecida não for válida
  if (!policies.has(referrerPolicy)) {
    return 'strict-origin-when-cross-origin';
  }

  return referrerPolicy;
}

/**
 * @param {string} referrer
 * @param {string} destination
 * @returns {string}
 */
export function determineRequestsReferrer(request, { referrerPolicy, referrerOrigin, referrer }) {
  // Política de referenciador vazia
  if (referrerPolicy === '' || referrerPolicy === 'no-referrer') {
    return 'no-referrer';
  }

  // Verificações simplificadas para ambiente de navegador
  const origin = new URL(request.url).origin;
  const referrerIsOrigin = referrer === referrerOrigin;

  // Usar a política do navegador por padrão
  return referrer;
} 