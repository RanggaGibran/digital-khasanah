// Import Firebase modules and utilities
import { firebaseAuth, firebaseStorage } from './firebase.js';
import fileUtils from './file-utils.js';

document.addEventListener('DOMContentLoaded', async () => {
    // Elements
    const userInfoEl = document.getElementById('user-info');
    const filesListEl = document.getElementById('files-list');
    const uploadBtn = document.getElementById('upload-btn');
    const uploadArea = document.getElementById('upload-area');
    const dropzone = document.getElementById('dropzone');
    const fileInput = document.getElementById('file-input');
    const uploadProgress = document.getElementById('upload-progress');
    const progressFill = document.getElementById('progress-fill');
    const progressText = document.getElementById('progress-text');
    const logoutBtn = document.getElementById('logout-btn');
    const encryptionPassword = document.getElementById('encryption-password');
    const savePasswordBtn = document.getElementById('save-password');
    const fileModal = document.getElementById('file-modal');
    const modalClose = document.getElementById('modal-close');
    const filePreview = document.getElementById('file-preview');
    const modalTitle = document.getElementById('modal-title');
    const decryptPassword = document.getElementById('decrypt-password');
    const decryptBtn = document.getElementById('decrypt-btn');
    
    // Used to store metadata about files
    const fileMetadataMap = new Map();
    
    // Check if user is authenticated
    const user = firebaseAuth.getCurrentUser();
    if (!user) {
        window.location.href = '/login.html';
        return;
    }
    
    // Display user info
    userInfoEl.querySelector('.user-email').textContent = user.email;
    
    // Load encryption password from session storage (not persistent storage for security)
    if (sessionStorage.getItem('encryptionPassword')) {
        encryptionPassword.value = sessionStorage.getItem('encryptionPassword');
    }
    
    // Save encryption password to session storage
    savePasswordBtn.addEventListener('click', () => {
        if (encryptionPassword.value.length < 8) {
            alert('Please enter a password with at least 8 characters.');
            return;
        }
        
        sessionStorage.setItem('encryptionPassword', encryptionPassword.value);
        alert('Encryption password saved for this session. Remember it as we don\'t store it anywhere!');
    });
    
    // Handle logout
    logoutBtn.addEventListener('click', async () => {
        try {
            await firebaseAuth.logout();
            // Clear session storage on logout
            sessionStorage.removeItem('encryptionPassword');
            window.location.href = '/login.html';
        } catch (error) {
            console.error('Error logging out:', error);
            alert('Failed to log out. Please try again.');
        }
    });
    
    // Show upload area
    uploadBtn.addEventListener('click', () => {
        if (!encryptionPassword.value) {
            alert('Please set an encryption password first.');
            encryptionPassword.focus();
            return;
        }
        
        uploadArea.classList.toggle('hidden');
    });
    
    // Handle file selection via button
    dropzone.addEventListener('click', () => {
        fileInput.click();
    });
    
    // Handle file selection
    fileInput.addEventListener('change', (e) => {
        if (e.target.files.length > 0) {
            handleFiles(e.target.files);
        }
    });
    
    // Handle drag and drop
    dropzone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropzone.classList.add('dragover');
    });
    
    dropzone.addEventListener('dragleave', () => {
        dropzone.classList.remove('dragover');
    });
    
    dropzone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropzone.classList.remove('dragover');
        
        if (e.dataTransfer.files.length > 0) {
            handleFiles(e.dataTransfer.files);
        }
    });
    
    // Handle file upload with encryption
    async function handleFiles(files) {
        if (!encryptionPassword.value) {
            alert('Please set an encryption password first.');
            encryptionPassword.focus();
            return;
        }
        
        uploadArea.classList.add('uploading');
        uploadProgress.classList.remove('hidden');
        
        try {
            for (let i = 0; i < files.length; i++) {
                const file = files[i];
                
                // Update progress
                const progress = Math.round((i / files.length) * 100);
                progressFill.style.width = `${progress}%`;
                progressText.textContent = `${progress}% (${i+1}/${files.length})`;
                
                // Encrypt the file
                const { encryptedBlob, metadata } = await fileUtils.encryptFile(file, encryptionPassword.value);
                
                // Create a new File object with encrypted data
                const encryptedFile = new File([encryptedBlob], `${file.name}.encrypted`, {
                    type: 'application/encrypted-file'
                });
                
                // Upload the encrypted file
                const uploadResult = await firebaseStorage.uploadFile(encryptedFile, `files/${file.name}.encrypted`);
                
                // Store metadata with the file path
                const storageMetadata = {
                    ...metadata,
                    encryptedPath: uploadResult.path,
                    uploadedAt: new Date().toISOString()
                };
                
                // Store file metadata in Firebase Storage metadata or database
                await storeFileMetadata(uploadResult.path, storageMetadata);
            }
            
            // Update progress to 100% when done
            progressFill.style.width = '100%';
            progressText.textContent = '100%';
            
            // Reset the upload area after a delay
            setTimeout(() => {
                uploadArea.classList.remove('uploading');
                uploadProgress.classList.add('hidden');
                uploadArea.classList.add('hidden');
                progressFill.style.width = '0%';
                progressText.textContent = '0%';
                
                // Reload file list
                loadFiles();
            }, 1000);
            
        } catch (error) {
            console.error('Error uploading files:', error);
            alert(`Error uploading files: ${error.message}`);
            
            uploadArea.classList.remove('uploading');
            uploadProgress.classList.add('hidden');
        }
    }
    
    // Store file metadata (simple implementation using localStorage for the MVP)
    // In a production app, this should be stored in a database or with the Firebase Storage object metadata
    async function storeFileMetadata(path, metadata) {
        try {
            // Get existing metadata from localStorage
            const existingMetadataStr = localStorage.getItem(`file_metadata_${user.uid}`) || '{}';
            const existingMetadata = JSON.parse(existingMetadataStr);
            
            // Add new metadata
            existingMetadata[path] = metadata;
            
            // Save updated metadata
            localStorage.setItem(`file_metadata_${user.uid}`, JSON.stringify(existingMetadata));
        } catch (error) {
            console.error('Error storing file metadata:', error);
        }
    }
    
    // Get file metadata
    function getFileMetadata(path) {
        try {
            const allMetadataStr = localStorage.getItem(`file_metadata_${user.uid}`) || '{}';
            const allMetadata = JSON.parse(allMetadataStr);
            return allMetadata[path] || null;
        } catch (error) {
            console.error('Error retrieving file metadata:', error);
            return null;
        }
    }
    
    // Load user's files
    async function loadFiles() {
        try {
            // In a real implementation, you would list files from Firebase Storage or your backend API
            // For the MVP, we'll use localStorage metadata
            const allMetadataStr = localStorage.getItem(`file_metadata_${user.uid}`) || '{}';
            const allMetadata = JSON.parse(allMetadataStr);
            
            const fileEntries = Object.entries(allMetadata).map(([path, metadata]) => ({
                path,
                metadata
            }));
            
            if (fileEntries.length === 0) {
                filesListEl.innerHTML = '<tr><td colspan="4" class="table-message">No files found. Upload files to get started.</td></tr>';
                return;
            }
            
            // Sort files by upload date (newest first)
            fileEntries.sort((a, b) => {
                return new Date(b.metadata.uploadedAt) - new Date(a.metadata.uploadedAt);
            });
            
            // Clear the files list
            filesListEl.innerHTML = '';
            
            // Add files to the list
            fileEntries.forEach(({ path, metadata }) => {
                // Extract filename from path (remove encryption extension for display)
                const displayName = path.split('/').pop().replace('.encrypted', '');
                
                // Create row element
                const row = document.createElement('tr');
                
                // Format date
                const uploadDate = new Date(metadata.uploadedAt);
                const formattedDate = uploadDate.toLocaleDateString() + ' ' + uploadDate.toLocaleTimeString();
                
                // Store metadata in the map for later use
                fileMetadataMap.set(path, metadata);
                
                row.innerHTML = `
                    <td>
                        <div class="file-name">
                            <i class="fas ${fileUtils.getFileIconClass(metadata.originalName)}"></i>
                            <span>${displayName}</span>
                        </div>
                    </td>
                    <td>${fileUtils.formatFileSize(metadata.originalSize)}</td>
                    <td>${formattedDate}</td>
                    <td>
                        <div class="file-actions">
                            <button class="btn btn--icon preview-btn" data-path="${path}" title="Preview">
                                <i class="fas fa-eye"></i>
                            </button>
                            <button class="btn btn--icon download-btn" data-path="${path}" title="Download">
                                <i class="fas fa-download"></i>
                            </button>
                            <button class="btn btn--icon delete-btn" data-path="${path}" title="Delete">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    </td>
                `;
                
                // Add row to the table
                filesListEl.appendChild(row);
            });
            
            // Update storage usage
            updateStorageUsage(fileEntries);
            
            // Add event listeners to the buttons
            attachFileActionListeners();
            
        } catch (error) {
            console.error('Error loading files:', error);
            filesListEl.innerHTML = '<tr><td colspan="4" class="table-message">Error loading files. Please try again.</td></tr>';
        }
    }
    
    // Attach event listeners to file action buttons
    function attachFileActionListeners() {
        // Preview buttons
        document.querySelectorAll('.preview-btn').forEach(button => {
            button.addEventListener('click', () => {
                const filePath = button.getAttribute('data-path');
                showFilePreview(filePath);
            });
        });
        
        // Download buttons
        document.querySelectorAll('.download-btn').forEach(button => {
            button.addEventListener('click', () => {
                const filePath = button.getAttribute('data-path');
                downloadFile(filePath);
            });
        });
        
        // Delete buttons
        document.querySelectorAll('.delete-btn').forEach(button => {
            button.addEventListener('click', () => {
                const filePath = button.getAttribute('data-path');
                deleteFile(filePath);
            });
        });
    }
    
    // Show file preview
    async function showFilePreview(path) {
        const metadata = fileMetadataMap.get(path);
        if (!metadata) {
            alert('Error: File metadata not found.');
            return;
        }
        
        // Set modal title
        const fileName = path.split('/').pop().replace('.encrypted', '');
        modalTitle.textContent = fileName;
        
        // Show modal
        fileModal.classList.add('open');
        filePreview.innerHTML = '<div class="file-preview__loading">Loading...</div>';
        
        try {
            // Get download URL
            const downloadURL = await firebaseStorage.getFileUrl(path);
            
            // For preview, we'll just show file info until they decrypt
            filePreview.innerHTML = `
                <div class="file-info">
                    <p><strong>File Type:</strong> ${metadata.originalType || 'Unknown'}</p>
                    <p><strong>Original Size:</strong> ${fileUtils.formatFileSize(metadata.originalSize)}</p>
                    <p><strong>Encrypted:</strong> Yes (AES-GCM-256)</p>
                    <p class="file-info__hint">Enter your encryption password to decrypt and download the file.</p>
                </div>
            `;
            
            // Set up decrypt button with the correct path
            decryptBtn.setAttribute('data-path', path);
            decryptBtn.setAttribute('data-url', downloadURL);
            
        } catch (error) {
            console.error('Error loading file preview:', error);
            filePreview.innerHTML = '<div class="file-preview__error">Error loading file. Please try again.</div>';
        }
    }
    
    // Close modal
    modalClose.addEventListener('click', () => {
        fileModal.classList.remove('open');
    });
    
    // Handle decryption and download
    decryptBtn.addEventListener('click', async () => {
        const path = decryptBtn.getAttribute('data-path');
        const url = decryptBtn.getAttribute('data-url');
        const password = decryptPassword.value;
        
        if (!password) {
            alert('Please enter your encryption password.');
            decryptPassword.focus();
            return;
        }
        
        const metadata = fileMetadataMap.get(path);
        if (!metadata) {
            alert('Error: File metadata not found.');
            return;
        }
        
        try {
            decryptBtn.textContent = 'Decrypting...';
            decryptBtn.disabled = true;
            
            // Download the encrypted file
            const response = await fetch(url);
            const encryptedBlob = await response.blob();
            
            // Decrypt the file
            const decryptedBlob = await fileUtils.decryptFile(encryptedBlob, password, metadata);
            
            // Create a download link
            const downloadLink = document.createElement('a');
            downloadLink.href = URL.createObjectURL(decryptedBlob);
            downloadLink.download = path.split('/').pop().replace('.encrypted', '');
            
            // Trigger download
            document.body.appendChild(downloadLink);
            downloadLink.click();
            document.body.removeChild(downloadLink);
            
            // Reset button
            decryptBtn.textContent = 'Decrypt & Download';
            decryptBtn.disabled = false;
            
            // Close modal after a short delay
            setTimeout(() => {
                fileModal.classList.remove('open');
            }, 1000);
            
        } catch (error) {
            console.error('Error decrypting file:', error);
            alert(`Error decrypting file: ${error.message}. Make sure you entered the correct password.`);
            
            decryptBtn.textContent = 'Decrypt & Download';
            decryptBtn.disabled = false;
        }
    });
    
    // Download encrypted file directly (without decryption)
    async function downloadFile(path) {
        const metadata = fileMetadataMap.get(path);
        if (!metadata) {
            alert('Error: File metadata not found.');
            return;
        }
        
        // Show file preview with download options
        showFilePreview(path);
    }
    
    // Delete file
    async function deleteFile(path) {
        if (!confirm('Are you sure you want to delete this file? This action cannot be undone.')) {
            return;
        }
        
        try {
            // Delete from Firebase Storage
            await firebaseStorage.deleteFile(path);
            
            // Remove metadata
            const allMetadataStr = localStorage.getItem(`file_metadata_${user.uid}`) || '{}';
            const allMetadata = JSON.parse(allMetadataStr);
            
            delete allMetadata[path];
            
            localStorage.setItem(`file_metadata_${user.uid}`, JSON.stringify(allMetadata));
            
            // Reload the file list
            loadFiles();
            
            alert('File deleted successfully.');
        } catch (error) {
            console.error('Error deleting file:', error);
            alert(`Error deleting file: ${error.message}`);
        }
    }
    
    // Update storage usage display
    function updateStorageUsage(fileEntries) {
        // Calculate total size
        let totalSize = 0;
        fileEntries.forEach(({ metadata }) => {
            totalSize += metadata.originalSize || 0;
        });
        
        // Free tier: 1GB
        const totalStorageMB = 1024;
        const usedStorageMB = Math.round(totalSize / (1024 * 1024) * 100) / 100;
        const usagePercent = Math.round((usedStorageMB / totalStorageMB) * 100);
        
        // Update UI
        document.getElementById('used-storage').textContent = `${usedStorageMB} MB`;
        document.getElementById('total-storage').textContent = `${totalStorageMB} MB`;
        document.getElementById('storage-percent').textContent = `${usagePercent}%`;
        document.getElementById('storage-fill').style.width = `${usagePercent}%`;
    }
    
    // Load files on page load
    loadFiles();
});
