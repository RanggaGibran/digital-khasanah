declare module 'khasanah-crypto' {
  export function encrypt_data(data: Uint8Array, password: string): any;
  export function decrypt_data(encryptedData: Uint8Array, metadataStr: string, password: string): Uint8Array;
  export function hash_password(password: string): string;
  export function generate_secure_password(length: number): string;
  export function encrypt_and_upload_file(data: Uint8Array, fileName: string, password: string): Promise<any>;
  export function get_file_extension(filename: string): string;
  export function init(): Promise<void>;
}

// Define the global KhasanahCrypto object
interface Window {
  KhasanahCrypto: {
    encrypt_data: (data: Uint8Array, password: string) => any;
    decrypt_data: (encryptedData: Uint8Array, metadataStr: string, password: string) => Uint8Array;
    hash_password: (password: string) => string;
    generate_secure_password: (length: number) => string;
    encrypt_and_upload_file: (data: Uint8Array, fileName: string, password: string) => Promise<any>;
    download_and_decrypt_file: (fileName: string, password: string) => Promise<Uint8Array>;
    get_file_extension: (filename: string) => string;
  };
  firebaseAuth: any;
  firebaseFunctions: any;
  httpsCallable: any;
  useHttpFunctions: boolean;
  uploadEncryptedFile: (fileName: string, data: Uint8Array, metadata: any) => Promise<any>;
  downloadEncryptedFile: (fileName: string) => Promise<{data: Uint8Array, metadata: any}>;
}
