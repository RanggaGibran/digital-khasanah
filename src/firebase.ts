import { initializeApp } from "firebase/app";
import { 
  getAuth, 
  connectAuthEmulator
} from "firebase/auth";
import { getFunctions, httpsCallable, connectFunctionsEmulator } from "firebase/functions";

// Your web app's Firebase configuration
// Using environment variables from .env file
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const functions = getFunctions(app);

// Define the base URL for HTTP functions
// This way we can handle both local development and production
// const getFirebaseFunctionUrl = (functionName: string) => {
//   // Use local emulators when available
//   if (import.meta.env.DEV || import.meta.env.MODE === 'development') {
//     return `http://localhost:5001/${import.meta.env.VITE_FIREBASE_PROJECT_ID}/us-central1/${functionName}${functionName.includes('Http') ? '' : 'Http'}`;
//   }
//   
//   // Production URL
//   const region = 'us-central1'; // Update this if your functions are in a different region
//   const projectId = import.meta.env.VITE_FIREBASE_PROJECT_ID;
//   return `https://${region}-${projectId}.cloudfunctions.net/${functionName}${functionName.includes('Http') ? '' : 'Http'}`;
// };

// Set to false to use emulator callable functions in development, true for HTTP endpoints
// const useHttpFunctions = false;

// Connect to Firebase emulators in development mode
if (import.meta.env.DEV) {
  console.log('Using Firebase emulators for development');
  try {
    // Note: add { disableWarnings: true } to remove browser warnings
    connectAuthEmulator(auth, "http://localhost:9099", { disableWarnings: true });
    connectFunctionsEmulator(functions, "localhost", 5001);
    
    // For development testing only: Create a test user
    /*
    setTimeout(async () => {
      try {
        // This is just for development testing - don't use in production
        if (!auth.currentUser) {
          const testEmail = "test@example.com";
          const testPassword = "password123";
          await signInWithEmailAndPassword(auth, testEmail, testPassword)
            .catch((error) => {
              console.log("Creating test user for development...");
              return createUserWithEmailAndPassword(auth, testEmail, testPassword);
            });
        }
      } catch (error) {
        console.warn("Could not set up test auth user:", error);
      }
    }, 1000);
    */
  } catch (err) {
    console.warn("Could not connect to Firebase emulators:", err);
  }
}

// Make Firebase services globally available
window.firebaseAuth = auth;
window.firebaseFunctions = functions;
window.httpsCallable = httpsCallable;
// window.useHttpFunctions = useHttpFunctions;

// Helper function to get auth token
// async function getAuthToken(): Promise<string> {
//   const user = auth.currentUser;
//   if (!user) {
//     throw new Error('User not authenticated');
//   }
//   try {
//     return await getIdToken(user, true); // Force refresh token
//   } catch (error) {
//     console.error('Error getting auth token:', error);
//     throw new Error('Could not get authentication token. Please try logging out and back in.');
//   }
// }

// Debug function to log API interactions
// function logApiCall(method: string, url: string, status: number, data?: any) {
//   console.log(`[API ${method}] ${url} -> ${status}`, data ? data : '');
// }

// Bridge functions for Rust/WASM interaction
async function uploadEncryptedFile(fileName: string, data: Uint8Array, metadata: any): Promise<any> {
  try {
    console.log('Starting upload for file:', fileName);
    
    // Use Firebase callable function (works with emulator)
    const getUploadUrl = httpsCallable(functions, 'getUploadUrl');
    const result = await getUploadUrl({ fileName });
    const uploadResult = result.data as { 
      uploadUrl: string | null; 
      useDirectUpload: boolean;
      filePath?: string;
      bucketName?: string;
    };
    
    console.log('Upload method result:', uploadResult);
    
    if (uploadResult.useDirectUpload) {
      // Direct upload for emulator mode
      console.log('Using direct upload for emulator');
      
      const uploadFile = httpsCallable(functions, 'uploadFile');
      
      // Convert Uint8Array to base64
      const base64Data = btoa(String.fromCharCode(...data));
      
      const directResult = await uploadFile({
        fileName,
        fileData: base64Data,
        fileSize: data.length,
        encryptionInfo: JSON.parse(JSON.stringify(metadata))
      });
      
      console.log('Direct upload completed:', directResult.data);
      return directResult.data;
    } else {
      // Signed URL upload for production mode
      const uploadUrl = uploadResult.uploadUrl;
      if (!uploadUrl) {
        throw new Error('No upload URL provided');
      }
      
      console.log(`Uploading data to signed URL: ${uploadUrl.substring(0, 50)}...`);
      const uploadResponse = await fetch(uploadUrl, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/octet-stream',
          'Content-Length': data.length.toString()
        },
        body: data
      });
      
      if (!uploadResponse.ok) {
        const errorText = await uploadResponse.text().catch(() => 'No response text');
        console.error('Upload response error:', errorText);
        throw new Error(`Upload failed with status: ${uploadResponse.status} - ${errorText}`);
      }
      
      // Save metadata in Firestore
      console.log('Upload completed, saving metadata');
      const saveMetadata = httpsCallable(functions, 'saveFileMetadata');
      const metadataResult = await saveMetadata({ 
        fileName, 
        fileSize: data.length,
        encryptionInfo: JSON.parse(JSON.stringify(metadata))
      });
      
      console.log('Metadata saved successfully:', metadataResult);
      return metadataResult.data;
    }
  } catch (error) {
    console.error('Upload failed:', error);
    return Promise.reject(error);
  }
}

async function downloadEncryptedFile(fileName: string): Promise<{data: Uint8Array, metadata: any}> {
  try {
    console.log('Starting download for file:', fileName);
    
    // Use Firebase callable function (works with emulator)
    const getDownloadUrl = httpsCallable(functions, 'getDownloadUrl');
    const result = await getDownloadUrl({ fileName });
    const downloadResult = result.data as { 
      downloadUrl: string | null; 
      useDirectDownload: boolean;
      fileData?: string;
      fileName?: string;
    };
    
    console.log('Download method result:', downloadResult);
    
    // Get file metadata
    const listFiles = httpsCallable(functions, 'listFiles');
    const filesResult = await listFiles({});
    const responseData = filesResult.data as { files: Array<{ fileName: string; encryptionInfo: any }> };
    const fileInfo = responseData.files.find(f => f.fileName === fileName);
    
    if (!fileInfo) {
      throw new Error('File metadata not found');
    }
    
    if (downloadResult.useDirectDownload) {
      // Direct download for emulator mode
      console.log('Using direct download for emulator');
      
      if (!downloadResult.fileData) {
        throw new Error('No file data provided for direct download');
      }
      
      // Convert base64 data back to Uint8Array
      const binaryString = atob(downloadResult.fileData);
      const data = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        data[i] = binaryString.charCodeAt(i);
      }
      
      console.log('Direct download completed, data length:', data.length);
      
      return {
        data: data,
        metadata: fileInfo.encryptionInfo
      };
    } else {
      // Signed URL download for production mode
      const downloadUrl = downloadResult.downloadUrl;
      if (!downloadUrl) {
        throw new Error('No download URL provided');
      }
      
      console.log(`Downloading from signed URL: ${downloadUrl.substring(0, 50)}...`);
      
      const response = await fetch(downloadUrl);
      if (!response.ok) {
        throw new Error(`Download failed with status: ${response.status}`);
      }
      
      const data = await response.arrayBuffer();
      
      console.log('Signed URL download completed, data length:', data.byteLength);
      
      return {
        data: new Uint8Array(data),
        metadata: fileInfo.encryptionInfo
      };
    }
  } catch (error) {
    console.error('Download failed:', error);
    return Promise.reject(error);
  }
}

// Expose the functions globally
window.uploadEncryptedFile = uploadEncryptedFile;
window.downloadEncryptedFile = downloadEncryptedFile;

export { auth, functions };
