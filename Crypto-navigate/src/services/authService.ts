import type { ApiKeys } from '../types/index';
import CryptoJS from 'crypto-js';

// Chaves constantes para armazenamento local
const API_KEY_STORAGE = 'binance-api-key';
const API_SECRET_STORAGE = 'binance-api-secret';

/**
 * Serviço para gerenciar as credenciais da API da Binance
 */
class AuthService {
  private static instance: AuthService;

  private constructor() {}

  public static getInstance(): AuthService {
    if (!AuthService.instance) {
      AuthService.instance = new AuthService();
    }
    return AuthService.instance;
  }

  /**
   * Salva as credenciais da API da Binance no localStorage com criptografia
   */
  public saveApiCredentials(credentials: ApiKeys): void {
    const encryptedApiKey = CryptoJS.AES.encrypt(credentials.binanceApiKey, 'secret-key').toString();
    const encryptedSecretKey = CryptoJS.AES.encrypt(credentials.binanceSecretKey, 'secret-key').toString();
    localStorage.setItem(API_KEY_STORAGE, encryptedApiKey);
    localStorage.setItem(API_SECRET_STORAGE, encryptedSecretKey);
  }

  /**
   * Obtém as credenciais da API da Binance do localStorage com descriptografia
   */
  public getApiCredentials(): ApiKeys | null {
    const encryptedApiKey = localStorage.getItem(API_KEY_STORAGE);
    const encryptedSecretKey = localStorage.getItem(API_SECRET_STORAGE);

    if (!encryptedApiKey || !encryptedSecretKey) {
      return null;
    }

    const apiKey = CryptoJS.AES.decrypt(encryptedApiKey, 'secret-key').toString(CryptoJS.enc.Utf8);
    const secretKey = CryptoJS.AES.decrypt(encryptedSecretKey, 'secret-key').toString(CryptoJS.enc.Utf8);

    return {
      binanceApiKey: apiKey,
      binanceSecretKey: secretKey
    };
  }

  /**
   * Remove as credenciais da API da Binance do localStorage
   */
  public clearApiCredentials(): void {
    localStorage.removeItem(API_KEY_STORAGE);
    localStorage.removeItem(API_SECRET_STORAGE);
  }

  /**
   * Verifica se o usuário possui credenciais da API salvas
   */
  public hasApiCredentials(): boolean {
    return !!this.getApiCredentials();
  }
}

export default AuthService;