import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import './components/components.css';
import './firebase'; // Import Firebase initialization
import './verify-config'; // Verify Firebase configuration

// Initialize the application
ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// Initialize WASM module
import initWasm from './wasm-loader';

// Initialize a fallback module if WASM fails
const fallbackModule = {
  encrypt_data: (_data: Uint8Array, _password: string) => {
    console.error('WASM module not initialized properly');
    throw new Error('Encryption unavailable: WASM module not loaded');
  },
  decrypt_data: (_encryptedData: Uint8Array, _metadataStr: string, _password: string) => {
    console.error('WASM module not initialized properly');
    throw new Error('Decryption unavailable: WASM module not loaded');
    return new Uint8Array(0); // Return empty array to satisfy TypeScript
  },
  hash_password: (_password: string) => {
    console.error('WASM module not initialized properly');
    throw new Error('Hash unavailable: WASM module not loaded');
    return '';
  },
  generate_secure_password: (length: number = 16) => {
    // Implement a simple JS fallback for password generation
    console.warn('Using JS fallback for password generation');
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()';
    let result = '';
    const array = new Uint8Array(length);
    window.crypto.getRandomValues(array);
    for (let i = 0; i < length; i++) {
      result += chars.charAt(array[i] % chars.length);
    }
    return result;
  },
  get_file_extension: (filename: string) => {
    // Simple fallback implementation
    const parts = filename.split('.');
    return parts.length > 1 ? parts[parts.length - 1] : '';
  },  encrypt_and_upload_file: async (_data: Uint8Array, _fileName: string, _password: string) => {
    console.error('WASM module not initialized properly');
    throw new Error('File encryption unavailable: WASM module not loaded');
  },
  download_and_decrypt_file: async (_fileName: string, _password: string) => {
    console.error('WASM module not initialized properly');
    throw new Error('File decryption unavailable: WASM module not loaded');
    return new Uint8Array();
  }
};

// Set the fallback first, so functions don't break if initialization fails
window.KhasanahCrypto = fallbackModule;

// Add a delay to ensure Firebase is initialized first
setTimeout(() => {  initWasm()
    .then((_module: any) => {
      console.log('WASM module initialized successfully');
      // The module is already set in the wasm-loader
    })
    .catch((error: unknown) => {
      console.error('Error initializing WASM module:', error);
      // Make sure fallback is properly set
      if (!window.KhasanahCrypto || !window.KhasanahCrypto.generate_secure_password) {
        window.KhasanahCrypto = fallbackModule;
      }
    });
}, 500);
