// This file helps with loading the WASM module
import { enhanceWasmModule } from './wasm-bridge';

// Initialize the WASM module
async function initWasm() {
  try {
    console.log('Initializing WASM module...');
    
    // Dynamically import the WASM module to prevent immediate loading issues
    const wasmImport = await import('../rust-crypto/pkg/khasanah_crypto');
    const { default: init, ...wasmModuleExports } = wasmImport;
    
    // Initialize the WASM module
    await init();
    console.log('WASM module initialized, enhancing with JS bridge...');
    
    // Create a copy of the module exports to avoid modifying read-only properties
    const wasmModule = { ...wasmModuleExports };
    
    // Create an enhanced module with additional functions
    const enhancedModule = enhanceWasmModule(wasmModule);
    
    // Set the global KhasanahCrypto object
    window.KhasanahCrypto = enhancedModule;
    
    return enhancedModule;
  } catch (error) {
    console.error('Failed to initialize WASM module:', error);
    
    // Make sure we keep the fallback module active
    console.warn('Using fallback JavaScript implementations');
    
    throw error;
  }
}

export default initWasm;
