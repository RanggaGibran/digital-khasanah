// Import Firebase modules
import { 
  auth, 
  storage,
  storageRef,
  uploadBytes,
  getDownloadURL,
  deleteObject
} from './firebase-config.js';

// File utilities for working with Firebase Storage
const fileUtils = {
  /**
   * Upload a file to Firebase Storage
   * @param {File} file - The file to upload
   * @param {string} folder - The folder path within the user's storage
   * @returns {Promise<{path: string, url: string}>} The storage path and download URL
   */
  uploadFile: async function(file, folder = 'files') {
    try {
      // Make sure user is authenticated
      const user = auth.currentUser;
      if (!user) {
        throw new Error('User not authenticated');
      }
      
      // Generate a unique file name
      const timestamp = new Date().getTime();
      const fileName = `${timestamp}_${file.name}`;
      
      // Create file path in the user's folder
      const filePath = `users/${user.uid}/${folder}/${fileName}`;
      const fileRef = storageRef(storage, filePath);
      
      // Upload the file
      await uploadBytes(fileRef, file);
      
      // Get the download URL
      const downloadURL = await getDownloadURL(fileRef);
      
      return {
        path: filePath,
        url: downloadURL
      };
    } catch (error) {
      console.error('Error uploading file:', error);
      throw error;
    }
  },
  
  /**
   * Generate a download URL for a file
   * @param {string} filePath - The path of the file in storage
   * @returns {Promise<string>} The download URL
   */
  getFileURL: async function(filePath) {
    try {
      const fileRef = storageRef(storage, filePath);
      return await getDownloadURL(fileRef);
    } catch (error) {
      console.error('Error getting file URL:', error);
      throw error;
    }
  },
  
  /**
   * Delete a file from Firebase Storage
   * @param {string} filePath - The path of the file to delete
   * @returns {Promise<void>}
   */
  deleteFile: async function(filePath) {
    try {
      const fileRef = storageRef(storage, filePath);
      await deleteObject(fileRef);
    } catch (error) {
      console.error('Error deleting file:', error);
      throw error;
    }
  },
  
  /**
   * Get a human-readable file size string
   * @param {number} bytes - The file size in bytes
   * @returns {string} The formatted file size
   */
  formatFileSize: function(bytes) {
    if (bytes === 0) return '0 Bytes';
    
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    
    return parseFloat((bytes / Math.pow(1024, i)).toFixed(2)) + ' ' + sizes[i];
  },
  
  /**
   * Get a file icon based on file type
   * @param {string} fileName - The name of the file
   * @returns {string} The CSS class for the icon
   */
  getFileIconClass: function(fileName) {
    const extension = fileName.split('.').pop().toLowerCase();
    
    const iconMap = {
      // Documents
      'pdf': 'file-pdf',
      'doc': 'file-word',
      'docx': 'file-word',
      'xls': 'file-excel',
      'xlsx': 'file-excel',
      'ppt': 'file-powerpoint',
      'pptx': 'file-powerpoint',
      'txt': 'file-text',
      
      // Images
      'jpg': 'file-image',
      'jpeg': 'file-image',
      'png': 'file-image',
      'gif': 'file-image',
      'svg': 'file-image',
      'webp': 'file-image',
      
      // Audio
      'mp3': 'file-audio',
      'wav': 'file-audio',
      'ogg': 'file-audio',
      
      // Video
      'mp4': 'file-video',
      'webm': 'file-video',
      'avi': 'file-video',
      'mov': 'file-video',
      
      // Archives
      'zip': 'file-archive',
      'rar': 'file-archive',
      '7z': 'file-archive',
      'tar': 'file-archive',
      'gz': 'file-archive',
      
      // Code
      'html': 'file-code',
      'css': 'file-code',
      'js': 'file-code',
      'json': 'file-code',
      'xml': 'file-code',
      'py': 'file-code',
      'java': 'file-code',
      'cpp': 'file-code',
      'c': 'file-code',
      'cs': 'file-code',
      'php': 'file-code',
      'rb': 'file-code',
      'go': 'file-code',
      'rs': 'file-code',
      'ts': 'file-code',
    };
    
    return iconMap[extension] || 'file';
  },
    /**
   * Generate encryption key from password
   * @param {string} password - The password to derive the key from
   * @returns {Promise<CryptoKey>} The derived encryption key
   */
  deriveKey: async function(password) {
    // Convert password string to a buffer
    const encoder = new TextEncoder();
    const passwordData = encoder.encode(password);
    
    // Create a key from the password
    const passwordKey = await crypto.subtle.importKey(
      "raw", 
      passwordData, 
      { name: "PBKDF2" }, 
      false, 
      ["deriveKey"]
    );
    
    // Use a static salt for simplicity (in production, this should be randomly generated and stored)
    const salt = encoder.encode("DigitalKhasanahSaltValue");
    
    // Derive a key using PBKDF2
    const key = await crypto.subtle.deriveKey(
      {
        name: "PBKDF2",
        salt: salt,
        iterations: 100000,
        hash: "SHA-256"
      },
      passwordKey,
      { name: "AES-GCM", length: 256 },
      false,
      ["encrypt", "decrypt"]
    );
    
    return key;
  },
  
  /**
   * Encrypt a file before uploading (client-side encryption)
   * @param {File} file - The file to encrypt
   * @param {string} password - The encryption password
   * @returns {Promise<Object>} Object containing encrypted file blob and metadata
   */
  encryptFile: async function(file, password) {
    try {
      // Step 1: Convert the file to ArrayBuffer
      const fileBuffer = await file.arrayBuffer();
      
      // Step 2: Generate a key from the password
      const key = await this.deriveKey(password);
      
      // Step 3: Generate a random IV (Initialization Vector)
      const iv = crypto.getRandomValues(new Uint8Array(12)); // 12 bytes for AES-GCM
      
      // Step 4: Encrypt the file data
      const encryptedData = await crypto.subtle.encrypt(
        {
          name: "AES-GCM",
          iv: iv
        },
        key,
        fileBuffer
      );
      
      // Step 5: Combine the IV and encrypted data into one ArrayBuffer
      const combinedBuffer = new Uint8Array(iv.length + encryptedData.byteLength);
      combinedBuffer.set(iv, 0);
      combinedBuffer.set(new Uint8Array(encryptedData), iv.length);
      
      // Step 6: Create a new Blob from the combined buffer
      const encryptedBlob = new Blob([combinedBuffer], { type: 'application/encrypted-file' });
      
      // Step 7: Create a metadata object with necessary info for decryption
      const metadata = {
        originalType: file.type,
        originalName: file.name,
        originalSize: file.size,
        encryptionMethod: 'AES-GCM-256',
        // We don't need to include IV as it's prepended to the encrypted data
      };
      
      return {
        encryptedBlob,
        metadata
      };
    } catch (error) {
      console.error('Error encrypting file:', error);
      throw new Error('File encryption failed: ' + error.message);
    }
  },
  
  /**
   * Decrypt a file after downloading (client-side decryption)
   * @param {Blob} encryptedBlob - The encrypted file blob
   * @param {string} password - The decryption password
   * @param {Object} metadata - Metadata about the original file
   * @returns {Promise<Blob>} The decrypted file blob
   */
  decryptFile: async function(encryptedBlob, password, metadata) {
    try {
      // Step 1: Convert the encrypted blob to ArrayBuffer
      const encryptedBuffer = await encryptedBlob.arrayBuffer();
      const encryptedData = new Uint8Array(encryptedBuffer);
      
      // Step 2: Extract the IV (first 12 bytes) and actual encrypted data
      const iv = encryptedData.slice(0, 12);
      const actualEncryptedData = encryptedData.slice(12);
      
      // Step 3: Generate a key from the password
      const key = await this.deriveKey(password);
      
      // Step 4: Decrypt the data
      const decryptedData = await crypto.subtle.decrypt(
        {
          name: "AES-GCM",
          iv: iv
        },
        key,
        actualEncryptedData
      );
      
      // Step 5: Create a Blob with the original type if available
      const originalType = metadata?.originalType || 'application/octet-stream';
      const decryptedBlob = new Blob([decryptedData], { type: originalType });
      
      return decryptedBlob;
    } catch (error) {
      console.error('Error decrypting file:', error);
      throw new Error('File decryption failed. This could be due to an incorrect password or corrupted file.');
    }
  }
};

export default fileUtils;
