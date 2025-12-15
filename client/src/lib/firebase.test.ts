import { describe, it, expect } from 'vitest';
import { initializeApp } from 'firebase/app';

describe('Firebase Configuration', () => {
  it('should have valid configuration variables', () => {
    const config = {
      apiKey: process.env.VITE_FIREBASE_API_KEY,
      authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
      projectId: process.env.VITE_FIREBASE_PROJECT_ID,
    };

    // Verifica se as variáveis não são undefined ou vazias
    expect(config.apiKey).toBeDefined();
    expect(config.apiKey).not.toBe('');
    expect(config.apiKey).not.toBe('PLACEHOLDER_API_KEY');
    
    expect(config.authDomain).toBeDefined();
    expect(config.projectId).toBeDefined();
  });

  it('should initialize Firebase app without errors', () => {
    const config = {
      apiKey: process.env.VITE_FIREBASE_API_KEY || 'mock-key',
      authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN || 'mock-domain',
      projectId: process.env.VITE_FIREBASE_PROJECT_ID || 'mock-project',
    };

    // Tenta inicializar (isso não testa a conexão real, apenas a estrutura)
    // Em um ambiente de teste real, faríamos mock, mas aqui queremos garantir que as vars estão lá
    const app = initializeApp(config, 'test-app');
    expect(app).toBeDefined();
  });
});
