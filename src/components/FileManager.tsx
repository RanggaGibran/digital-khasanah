import React, { useState, useEffect, useRef } from 'react';
import { User } from 'firebase/auth';
import { httpsCallable } from 'firebase/functions';

interface FileInfo {
  id: string;
  fileName: string;
  fileSize: number;
  uploadDate: any; // Can be Firestore Timestamp, Date, number, or string
  encryptionInfo: any;
}

interface FileManagerProps {
  user: User;
}

const FileManager: React.FC<FileManagerProps> = ({ user }) => {
  const [files, setFiles] = useState<FileInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [password, setPassword] = useState('');
  const [savePassword, setSavePassword] = useState(false);  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error' | 'warning', text: string } | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Load the file list on component mount
  useEffect(() => {
    loadFiles();
    
    // Check for saved password in localStorage
    const savedPassword = localStorage.getItem('khasanah_password');
    if (savedPassword) {
      setPassword(savedPassword);
      setSavePassword(true);
    }
  }, []);  const loadFiles = async () => {
    setLoading(true);
    try {
      // Since useHttpFunctions is false, use Firebase callable functions with emulator
      const listFiles = httpsCallable(window.firebaseFunctions, 'listFiles');
      const result = await listFiles({});
      const responseData = result.data as { files: FileInfo[] };
      
      setFiles(responseData.files || []);
    } catch (error) {
      console.error('Error loading files:', error);
      setStatusMessage({ type: 'error', text: 'Failed to load files.' });
    } finally {
      setLoading(false);
    }
  };
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0 || !password) {
      setStatusMessage({ type: 'error', text: 'Please select a file and enter a password.' });
      return;
    }
    
    const file = files[0];
    setUploading(true);
    setStatusMessage({ type: 'success', text: `Starting encryption of ${file.name}...` });

    try {
      // Save password if option is selected
      if (savePassword) {
        localStorage.setItem('khasanah_password', password);
      } else {
        localStorage.removeItem('khasanah_password');
      }      // Read file as ArrayBuffer
      const arrayBuffer = await file.arrayBuffer();
      const fileData = new Uint8Array(arrayBuffer);
      
      // Simulate progress steps
      setUploadProgress(20);
      setStatusMessage({ type: 'success', text: 'Preparing file for encryption...' });
      
      // Check if WASM is available
      if (!window.KhasanahCrypto || !window.KhasanahCrypto.encrypt_and_upload_file) {
        throw new Error('Encryption module is not properly initialized. Please refresh the page and try again.');
      }
      
      setUploadProgress(40);
      setStatusMessage({ type: 'success', text: '🔐 Encrypting file with Rust-powered security...' });
      
      // Simulate encryption progress
      await new Promise(resolve => setTimeout(resolve, 500));
      setUploadProgress(70);
      setStatusMessage({ type: 'success', text: '☁️ Uploading encrypted file to secure cloud...' });
      
      // Encrypt and upload the file using the enhanced WASM module
      console.log('Starting file encryption and upload...');
      await window.KhasanahCrypto.encrypt_and_upload_file(fileData, file.name, password);
      console.log('File encryption and upload completed.');
      
      setUploadProgress(100);
      setStatusMessage({ type: 'success', text: '✅ File uploaded successfully!' });
      
      // Reload the file list
      loadFiles();
      
      // Clear file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (error: any) {
      console.error('Error during file upload:', error);
      const errorMessage = error.message || 'Unknown error';
      setStatusMessage({ 
        type: 'error', 
        text: `Failed to upload file: ${errorMessage.includes('WASM') ? 
          'Encryption module not loaded. Please refresh the page.' : 
          errorMessage}`
      });    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const handleDownload = async (file: FileInfo) => {
    if (!password) {
      setStatusMessage({ type: 'error', text: 'Please enter your encryption password.' });
      return;
    }

    setStatusMessage({ type: 'success', text: `Downloading ${file.fileName}...` });
    
    try {
      // Download encrypted file
      const result = await window.downloadEncryptedFile(file.fileName);
      
      setStatusMessage({ type: 'success', text: 'Decrypting file...' });      // Decrypt the file
      const decryptedData = window.KhasanahCrypto.decrypt_data(
        result.data, 
        JSON.stringify(result.metadata),
        password      );
      
      // Create and download the file with proper MIME type
      const mimeType = getMimeType(file.fileName);
      const blob = new Blob([decryptedData], { type: mimeType });
      const downloadUrl = URL.createObjectURL(blob);
      
      // Use a more reliable download method to prevent underscore prefix
      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = file.fileName;
      a.style.display = 'none';
      
      // Ensure the download attribute is properly set
      a.setAttribute('download', file.fileName);
      
      document.body.appendChild(a);
      
      // Use a small delay to ensure the element is properly attached
      setTimeout(() => {
        a.click();
        
        // Clean up after a longer delay to ensure download starts
        setTimeout(() => {
          document.body.removeChild(a);
          URL.revokeObjectURL(downloadUrl);
        }, 1000);
      }, 100);
      
      setStatusMessage({ type: 'success', text: 'File downloaded and decrypted successfully!' });
    } catch (error) {
      console.error('Error downloading/decrypting file:', error);
      setStatusMessage({ 
        type: 'error', 
        text: 'Failed to download or decrypt file. Check your password and try again.'
      });
    }
  };
  const handleDelete = async (file: FileInfo) => {
    if (!confirm(`Are you sure you want to delete "${file.fileName}"?`)) {
      return;
    }
    
    try {
      if (window.useHttpFunctions) {
        // Use HTTP endpoint with CORS support
        const user = window.firebaseAuth.currentUser;
        if (!user) {
          throw new Error('User not authenticated');
        }
          const token = await user.getIdToken();
        const projectId = import.meta.env.VITE_FIREBASE_PROJECT_ID;
        const region = 'us-central1';
        
        // Use local emulator in development, production in production
        const baseUrl = import.meta.env.DEV 
          ? `http://localhost:5001/${projectId}/${region}`
          : `https://${region}-${projectId}.cloudfunctions.net`;
        
        const response = await fetch(`${baseUrl}/deleteFileHttp`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ fileName: file.fileName, fileId: file.id })
        });
        
        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Delete failed: ${response.status} ${errorText}`);
        }
      } else {
        // Use Firebase callable function
        const deleteFile = httpsCallable(window.firebaseFunctions, 'deleteFile');
        await deleteFile({ fileName: file.fileName, fileId: file.id });
      }
      
      // Update local list
      setFiles(files.filter(f => f.id !== file.id));
      setStatusMessage({ type: 'success', text: 'File deleted successfully.' });
    } catch (error) {
      console.error('Error deleting file:', error);
      setStatusMessage({ type: 'error', text: 'Failed to delete file.' });
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    
    return parseFloat((bytes / Math.pow(1024, i)).toFixed(2)) + ' ' + sizes[i];
  };
  const formatDate = (uploadDate: any): string => {
    try {
      // Handle different date formats that might come from Firestore
      let date: Date;
      
      if (!uploadDate) {
        return 'Unknown';
      }
      
      // If it's a Firestore Timestamp object with seconds
      if (uploadDate && typeof uploadDate === 'object' && uploadDate.seconds) {
        date = new Date(uploadDate.seconds * 1000);
      }
      // If it's already a Date object
      else if (uploadDate instanceof Date) {
        date = uploadDate;
      }
      // If it's a timestamp in milliseconds
      else if (typeof uploadDate === 'number') {
        date = new Date(uploadDate);
      }
      // If it's a string date
      else if (typeof uploadDate === 'string') {
        date = new Date(uploadDate);
      }
      // If it's a Firestore timestamp that hasn't been converted properly
      else if (uploadDate && typeof uploadDate === 'object' && uploadDate._seconds) {
        date = new Date(uploadDate._seconds * 1000);
      }
      // Fallback
      else {
        console.warn('Unknown date format:', uploadDate);
        return 'Unknown Date';
      }
      
      // Check if the date is valid
      if (isNaN(date.getTime())) {
        console.warn('Invalid date created from:', uploadDate);
        return 'Unknown Date';
      }
      
      return date.toLocaleString();
    } catch (error) {
      console.error('Error formatting date:', error, uploadDate);
      return 'Unknown Date';
    }
  };

  // Helper function to get MIME type based on file extension
  const getMimeType = (fileName: string): string => {
    const extension = fileName.split('.').pop()?.toLowerCase();
    const mimeTypes: { [key: string]: string } = {
      'txt': 'text/plain',
      'pdf': 'application/pdf',
      'jpg': 'image/jpeg',
      'jpeg': 'image/jpeg',
      'png': 'image/png',
      'gif': 'image/gif',
      'mp4': 'video/mp4',
      'mp3': 'audio/mpeg',
      'zip': 'application/zip',
      'doc': 'application/msword',
      'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'xls': 'application/vnd.ms-excel',
      'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'ppt': 'application/vnd.ms-powerpoint',
      'pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'json': 'application/json',
      'xml': 'application/xml',
      'csv': 'text/csv',
      'ini': 'text/plain',
      'log': 'text/plain'
    };
    return mimeTypes[extension || ''] || 'application/octet-stream';  };  // Helper function to get file icon based on extension
  const getFileIcon = (fileName: string) => {
    const extension = fileName.split('.').pop()?.toLowerCase();
    const iconStyle = { width: '32px', height: '32px', stroke: 'currentColor', strokeWidth: '1.5' };
    
    switch (extension) {
      case 'pdf':
        return (
          <svg {...iconStyle} viewBox="0 0 24 24" fill="none">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
            <polyline points="14,2 14,8 20,8"/>
            <line x1="16" y1="13" x2="8" y2="13"/>
            <line x1="16" y1="17" x2="8" y2="17"/>
            <polyline points="10,9 9,9 8,9"/>
          </svg>
        );
      case 'jpg':
      case 'jpeg':
      case 'png':
      case 'gif':
      case 'webp':
        return (
          <svg {...iconStyle} viewBox="0 0 24 24" fill="none">
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
            <circle cx="8.5" cy="8.5" r="1.5"/>
            <polyline points="21,15 16,10 5,21"/>
          </svg>
        );
      case 'mp4':
      case 'avi':
      case 'mov':
      case 'wmv':
        return (
          <svg {...iconStyle} viewBox="0 0 24 24" fill="none">
            <polygon points="23 7 16 12 23 17 23 7"/>
            <rect x="1" y="5" width="15" height="14" rx="2" ry="2"/>
          </svg>
        );
      case 'mp3':
      case 'wav':
      case 'flac':
        return (
          <svg {...iconStyle} viewBox="0 0 24 24" fill="none">
            <path d="M9 18V5l12-2v13"/>
            <circle cx="6" cy="18" r="3"/>
            <circle cx="18" cy="16" r="3"/>
          </svg>
        );
      case 'zip':
      case 'rar':
      case '7z':
        return (
          <svg {...iconStyle} viewBox="0 0 24 24" fill="none">
            <path d="M16 22h2a2 2 0 0 0 2-2V7.5L14.5 2H6a2 2 0 0 0-2 2v3"/>
            <polyline points="14,2 14,8 20,8"/>
            <path d="M10 20v-1a2 2 0 1 1 4 0v1a2 2 0 1 1-4 0Z"/>
            <path d="M10 7h4"/>
            <path d="M10 11h4"/>
          </svg>
        );
      case 'doc':
      case 'docx':
        return (
          <svg {...iconStyle} viewBox="0 0 24 24" fill="none">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
            <polyline points="14,2 14,8 20,8"/>
            <line x1="16" y1="13" x2="8" y2="13"/>
            <line x1="16" y1="17" x2="8" y2="17"/>
            <polyline points="10,9 9,9 8,9"/>
          </svg>
        );
      case 'xls':
      case 'xlsx':
        return (
          <svg {...iconStyle} viewBox="0 0 24 24" fill="none">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
            <polyline points="14,2 14,8 20,8"/>
            <path d="M8 13h8"/>
            <path d="M8 17h8"/>
            <path d="M8 9h2"/>
            <path d="M14 9h2"/>
          </svg>
        );
      default:
        return (
          <svg {...iconStyle} viewBox="0 0 24 24" fill="none">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
            <polyline points="14,2 14,8 20,8"/>
          </svg>
        );
    }
  };

  const handleGeneratePassword = () => {
    try {
      // Generalized function for password generation (can be used as fallback)
      const generatePassword = (length: number) => {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()';
        let result = '';
        const array = new Uint8Array(length);
        window.crypto.getRandomValues(array);
        for (let i = 0; i < length; i++) {
          result += chars.charAt(array[i] % chars.length);
        }
        return result;
      };
      
      // Try using WASM module first
      try {
        if (window.KhasanahCrypto && typeof window.KhasanahCrypto.generate_secure_password === 'function') {
          const generatedPassword = window.KhasanahCrypto.generate_secure_password(16);
          setPassword(generatedPassword);
          return;
        }
      } catch (wasmError) {
        console.warn('WASM generate_secure_password failed, using fallback:', wasmError);
      }
      
      // Fallback implementation if WASM module isn't ready or fails
      const fallbackPassword = generatePassword(16);
      setPassword(fallbackPassword);
      
    } catch (error) {
      console.error('Error generating password:', error);
      // Show error to user
      setStatusMessage({ type: 'error', text: 'Could not generate password. Please try again.' });
    }
  };

  // Drag and drop handlers
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDragIn = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(true);
  };

  const handleDragOut = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
  };
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      // Create a minimal event-like object
      const fileList = [file] as any;
      fileList.length = 1;
      
      const fakeEvent = {
        target: {
          files: fileList
        }
      } as unknown as React.ChangeEvent<HTMLInputElement>;
      
      handleFileUpload(fakeEvent);
    }
  };

  return (
    <div className="file-manager">
      {/* Password Section */}
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">🔐 Encryption Settings</h3>
          <p className="card-subtitle">Secure your files with end-to-end encryption</p>
        </div>
        <div className="card-body">
          <div className="password-input-group">
            <div className="input-with-icon">
              <svg className="input-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                <circle cx="12" cy="16" r="1"/>
                <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
              </svg>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your encryption password"
                className="password-input"
              />
            </div>
            <button 
              onClick={handleGeneratePassword} 
              className="btn-secondary btn-icon-text"
              title="Generate a secure random password"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 2L2 7l10 5 10-5-10-5z"/>
                <path d="M2 17l10 5 10-5"/>
                <path d="M2 12l10 5 10-5"/>
              </svg>
              Generate
            </button>
          </div>
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={savePassword}
              onChange={(e) => setSavePassword(e.target.checked)}
              className="checkbox-input"
            />
            <span className="checkbox-mark"></span>
            <span className="checkbox-text">Remember password in this browser</span>
            <span className="checkbox-warning">(not recommended for shared computers)</span>
          </label>
        </div>
      </div>

      {/* Status Message */}
      {statusMessage && (
        <div className={`status-message status-${statusMessage.type} animate-fade-in`}>
          <div className="status-icon">
            {statusMessage.type === 'success' && '✅'}
            {statusMessage.type === 'error' && '❌'}
            {statusMessage.type === 'warning' && '⚠️'}
          </div>
          <span>{statusMessage.text}</span>
        </div>
      )}

      {/* Upload Section */}
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">📤 Upload Files</h3>
          <p className="card-subtitle">Encrypt and store your files securely</p>
        </div>
        <div className="card-body">          <div className={`upload-area ${dragActive ? 'drag-active' : ''}`}
            onDragEnter={handleDragIn}
            onDragLeave={handleDragOut}
            onDragOver={handleDrag}
            onDrop={handleDrop}
          >
            <input
              type="file"
              onChange={handleFileUpload}
              disabled={uploading || !password}
              ref={fileInputRef}
              className="file-input"
              id="file-upload"
            />
            <label htmlFor="file-upload" className={`file-upload-label ${uploading || !password ? 'disabled' : ''}`}>
              <div className="upload-icon">
                {uploading ? (
                  <div className="spinner"></div>
                ) : (
                  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                    <polyline points="7,10 12,15 17,10"/>
                    <line x1="12" y1="15" x2="12" y2="3"/>
                  </svg>
                )}
              </div>              <div className="upload-text">
                <p className="upload-main-text">
                  {uploading ? 'Encrypting and uploading...' : 
                   dragActive ? '✨ Drop your file here!' :
                   '📎 Drop files here or click to browse'}
                </p>
                <p className="upload-sub-text">
                  {!password ? 'Please enter an encryption password first' : 
                   dragActive ? 'Release to start secure upload' :
                   '🔐 Your files will be encrypted with Rust-powered security'}
                </p>
              </div>
            </label>
            {dragActive && (
              <div className="drag-overlay">
                <div className="drag-message">
                  <p>Release to upload file</p>
                </div>
              </div>            )}
          </div>
          
          {/* Upload Progress Bar */}
          {uploading && (
            <div className="upload-progress">
              <div className="progress-bar">
                <div 
                  className="progress-fill" 
                  style={{ width: `${uploadProgress}%` }}
                ></div>
              </div>
              <p className="progress-text">{uploadProgress}% Complete</p>
            </div>
          )}
        </div>
      </div>

      {/* Files Section */}
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">📁 Your Encrypted Files</h3>
          <button onClick={loadFiles} className="btn-secondary btn-small" disabled={loading}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M1  17 1 17 1 17 6 17 1 17 z"/>
              <path d="M7 17L22 17"/>
              <path d="M17 13L21 17L17 21"/>
            </svg>
            {loading ? 'Loading...' : 'Refresh'}
          </button>
        </div>
        <div className="card-body">
          {loading ? (
            <div className="loading-state">
              <div className="spinner-large"></div>
              <p>Loading your files...</p>
            </div>
          ) : files.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">
                <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                  <polyline points="14,2 14,8 20,8"/>
                  <line x1="16" y1="13" x2="8" y2="13"/>
                  <line x1="16" y1="17" x2="8" y2="17"/>
                  <polyline points="10,9 9,9 8,9"/>
                </svg>
              </div>
              <h4>No files yet</h4>
              <p>Upload your first encrypted file to get started!</p>
            </div>
          ) : (
            <div className="files-grid">
              {files.map((file) => (
                <div key={file.id} className="file-card animate-scale-in">
                  <div className="file-icon">
                    {getFileIcon(file.fileName)}
                  </div>
                  <div className="file-info">
                    <h4 className="file-name">{file.fileName}</h4>
                    <div className="file-meta">
                      <span className="file-size">{formatFileSize(file.fileSize)}</span>
                      <span className="file-date">{formatDate(file.uploadDate)}</span>
                    </div>
                  </div>
                  <div className="file-actions">
                    <button
                      onClick={() => handleDownload(file)}
                      className="btn-success btn-small"
                      disabled={!password}
                      title={password ? "Download and decrypt" : "Enter password first"}
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-15"/>
                        <polyline points="7,10 12,15 17,10"/>
                        <line x1="12" y1="15" x2="12" y2="3"/>
                      </svg>
                      Download
                    </button>
                    <button
                      onClick={() => handleDelete(file)}
                      className="btn-danger btn-small"
                      title="Delete file permanently"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polyline points="3,6 5,6 21,6"/>
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                        <line x1="10" y1="11" x2="10" y2="17"/>
                        <line x1="14" y1="11" x2="14" y2="17"/>
                      </svg>
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default FileManager;
