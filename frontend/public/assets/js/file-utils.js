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
   * Encrypt a file before uploading (client-side encryption)
   * @param {File} file - The file to encrypt
   * @param {string} password - The encryption password
   * @returns {Promise<Blob>} The encrypted file blob
   */
  encryptFile: async function(file, password) {
    // TODO: Implement client-side encryption
    // This is a placeholder for future implementation
    // For MVP, we'll use Firebase Storage security rules for access control
    
    console.warn('File encryption not yet implemented');
    return file;
  },
  
  /**
   * Decrypt a file after downloading (client-side decryption)
   * @param {Blob} encryptedBlob - The encrypted file blob
   * @param {string} password - The decryption password
   * @returns {Promise<Blob>} The decrypted file blob
   */
  decryptFile: async function(encryptedBlob, password) {
    // TODO: Implement client-side decryption
    // This is a placeholder for future implementation
    
    console.warn('File decryption not yet implemented');
    return encryptedBlob;
  }
};

export default fileUtils;
