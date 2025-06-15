// wasm-bridge.ts
// This file provides JavaScript wrapper functions for the Rust WASM module

// Utility function for password generation when WASM module is not available
function generateFallbackPassword(length: number): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()';
  let result = '';
  const array = new Uint8Array(length);
  window.crypto.getRandomValues(array);
  for (let i = 0; i < length; i++) {
    result += chars.charAt(array[i] % chars.length);
  }
  return result;
}

// When the WASM module is initialized, create a wrapper object with additional functions
export function enhanceWasmModule(wasmModule: any) {
  // Create a new object instead of modifying the original module
  const enhancedModule = {
    // Copy original methods from the WASM module (with safety checks)
    encrypt_data: typeof wasmModule.encrypt_data === 'function' 
      ? wasmModule.encrypt_data.bind(wasmModule) 
      : (_data: Uint8Array, _password: string) => { 
          throw new Error('encrypt_data not available in WASM module') 
        },
    decrypt_data: typeof wasmModule.decrypt_data === 'function' 
      ? wasmModule.decrypt_data.bind(wasmModule) 
      : (_data: Uint8Array, _metadataStr: string, _password: string) => { 
          throw new Error('decrypt_data not available in WASM module') 
        },
    hash_password: typeof wasmModule.hash_password === 'function' 
      ? wasmModule.hash_password.bind(wasmModule) 
      : (_password: string) => { 
          throw new Error('hash_password not available in WASM module') 
        },
    generate_secure_password: typeof wasmModule.generate_secure_password === 'function' 
      ? wasmModule.generate_secure_password.bind(wasmModule) 
      : (length: number) => { 
          console.warn('Using JS fallback for secure password generation');
          return generateFallbackPassword(length || 16);
        },
    get_file_extension: typeof wasmModule.get_file_extension === 'function' 
      ? wasmModule.get_file_extension.bind(wasmModule) 
      : (filename: string) => filename.split('.').pop() || '',
    
    // Add new methods that use the original WASM functions
    encrypt_and_upload_file: async (data: Uint8Array, fileName: string, password: string) => {
      console.log('Encrypting file:', fileName);
      
      try {
        // Use the Rust encryption implementation
        const result = wasmModule.encrypt_data(data, password);
        const encryptedData = result.data;
        const metadata = result.metadata;
        
        console.log('File encrypted successfully, starting upload...');
        
        // Use the bridge function in firebase.ts to upload
        return await window.uploadEncryptedFile(fileName, encryptedData, metadata);
      } catch (error) {
        console.error('Error in encrypt_and_upload_file:', error);
        throw error;
      }
    },

    // Add a method to download and decrypt files
    download_and_decrypt_file: async (fileName: string, password: string) => {
      try {
        // Download the encrypted file using the Firebase bridge
        const { data: encryptedData, metadata } = await window.downloadEncryptedFile(fileName);
        
        console.log('Retrieved metadata:', metadata, 'Type:', typeof metadata);

        // Handle metadata properly - ensure it's a proper object before converting to JSON string
        let parsedMetadata;
        if (typeof metadata === 'string') {
          // If it's already a string, try to parse it to ensure it's valid JSON
          try {
            parsedMetadata = JSON.parse(metadata);
          } catch (e) {
            console.error('Failed to parse metadata string:', metadata);
            throw new Error('Invalid metadata format');
          }
        } else if (metadata && typeof metadata === 'object') {
          // If it's an object, use it directly
          parsedMetadata = metadata;
        } else {
          throw new Error('Invalid metadata type: ' + typeof metadata);
        }
        
        // Convert the parsed object to a JSON string for the Rust WASM module
        const metadataStr = JSON.stringify(parsedMetadata);
        console.log('Sending metadata to WASM:', metadataStr);
        
        // Use the Rust decryption method
        return wasmModule.decrypt_data(encryptedData, metadataStr, password);
      } catch (error) {
        console.error('Error in download_and_decrypt_file:', error);
        throw error;
      }
    }
  };
  
  return enhancedModule;
}
