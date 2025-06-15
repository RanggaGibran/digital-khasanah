import * as functions from "firebase-functions";
import { getStorage } from "firebase-admin/storage";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import * as admin from "firebase-admin";
import * as cors from 'cors';

// Initialize CORS middleware with allowed origins
const corsHandler = cors({
  origin: true, // Allow requests from any origin during development
  // In production, you might want to restrict this to specific origins:
  // origin: ['https://your-production-domain.com', 'http://localhost:5000']
});

// Initialize Firebase Admin
if (process.env.FUNCTIONS_EMULATOR === 'true') {
  console.log('🔧 Initializing Firebase Admin for emulator environment');
  // Initialize admin for emulator
  admin.initializeApp({
    projectId: process.env.GCLOUD_PROJECT || 'digitalkhasanah-3bcbb',
    storageBucket: process.env.FIREBASE_STORAGE_EMULATOR_HOST 
      ? `${process.env.GCLOUD_PROJECT || 'digitalkhasanah-3bcbb'}.appspot.com`
      : undefined
  });
} else {
  console.log('🔧 Initializing Firebase Admin for production environment');
  admin.initializeApp();
}

const firestore = getFirestore();

// Helper function to check if we're running in emulator
function isEmulator(): boolean {
  return process.env.FUNCTIONS_EMULATOR === 'true' || 
         process.env.FIREBASE_CONFIG?.includes('localhost') ||
         !process.env.GCLOUD_PROJECT;
}

// Function to generate a signed URL for file uploads
exports.getUploadUrl = functions.https.onCall(async (data, context) => {
  console.log('getUploadUrl called with data:', data);
  try {
    // Ensure user is authenticated
    if (!context.auth) {
      throw new functions.https.HttpsError(
        "unauthenticated", 
        "Authentication required."
      );
    }
    
    const userId = context.auth.uid;
    const fileName = data.fileName;
    
    console.log(`Processing upload URL request for user: ${userId}, file: ${fileName}`);
    
    if (!fileName) {
      throw new functions.https.HttpsError(
        "invalid-argument", 
        "File name is required."
      );
    }

    // Path to the file in Cloud Storage
    const filePath = `${userId}/${fileName}`;
    console.log(`Generating signed URL for path: ${filePath}`);

    const bucket = getStorage().bucket();
    const file = bucket.file(filePath);    // Check if running in emulator
    if (isEmulator()) {
      console.log('Running in emulator mode - using direct upload approach');
      
      // For emulator mode, we use direct upload through the uploadFile function
      // instead of trying to generate signed URLs (which requires service account credentials)
      return { 
        uploadUrl: null,
        useDirectUpload: true,
        isEmulator: true,
        filePath: filePath,
        bucketName: bucket.name
      };
    }

    // Create a signed URL valid for 5 minutes (production mode)
    const [url] = await file.getSignedUrl({
      action: "write",
      expires: Date.now() + 5 * 60 * 1000, // 5 minutes
      contentType: "application/octet-stream",
    });

    console.log(`Signed URL generated successfully for ${filePath}`);
    
    // Return the URL to the frontend
    return { uploadUrl: url, useDirectUpload: false };
  } catch (error: any) {
    console.error('Error in getUploadUrl:', error);
    throw new functions.https.HttpsError(
      "internal", 
      `Failed to generate upload URL: ${error.message || error}`
    );
  }
});

// Function to list files for a user
exports.listFiles = functions.https.onCall(async (data, context) => {
  // Ensure user is authenticated
  if (!context.auth) {
    throw new functions.https.HttpsError(
      "unauthenticated", 
      "Authentication required."
    );
  }
  
  const userId = context.auth.uid;

  // Get files from Firestore
  const filesSnapshot = await firestore
    .collection("files")
    .where("userId", "==", userId)
    .get();
  
  const files = filesSnapshot.docs.map(doc => {
    const data = doc.data();
    
    // Ensure uploadDate is properly formatted for the client
    if (data.uploadDate && data.uploadDate.toDate) {
      // Convert Firestore Timestamp to a plain object with seconds and nanoseconds
      data.uploadDate = {
        seconds: data.uploadDate.seconds,
        nanoseconds: data.uploadDate.nanoseconds
      };
    }
    
    return {
      id: doc.id,
      ...data
    };
  });
  
  return { files };
});

// Function to generate a signed URL for file downloads
exports.getDownloadUrl = functions.https.onCall(async (data, context) => {
  // Ensure user is authenticated
  if (!context.auth) {
    throw new functions.https.HttpsError(
      "unauthenticated", 
      "Authentication required."
    );
  }
  
  const userId = context.auth.uid;
  const fileName = data.fileName;
  
  if (!fileName) {
    throw new functions.https.HttpsError(
      "invalid-argument", 
      "File name is required."
    );
  }

  // Check if this file belongs to the user
  const fileQuery = await firestore
    .collection("files")
    .where("fileName", "==", fileName)
    .where("userId", "==", userId)
    .limit(1)
    .get();
    
  if (fileQuery.empty) {
    throw new functions.https.HttpsError(
      "not-found", 
      "File not found or you don't have permission to access it."
    );
  }

  // Path to the file in Cloud Storage
  const filePath = `${userId}/${fileName}`;
  const bucket = getStorage().bucket();
  const file = bucket.file(filePath);

  // Check if file exists
  const [exists] = await file.exists();
  if (!exists) {
    throw new functions.https.HttpsError(
      "not-found", 
      "File not found in storage."
    );
  }

  // Check if running in emulator
  if (isEmulator()) {
    console.log('Running in emulator mode - using direct download approach');
    try {
      // Download the file content directly
      const [fileBuffer] = await file.download();
      const fileData = fileBuffer.toString('base64');
      
      return { 
        downloadUrl: null, 
        useDirectDownload: true,
        fileData: fileData,
        fileName: fileName
      };
    } catch (error: any) {
      console.error('Error downloading file in emulator:', error);
      throw new functions.https.HttpsError(
        "internal", 
        `Failed to download file: ${error.message}`
      );
    }
  }

  // Create a signed URL valid for 5 minutes (production mode)
  const [url] = await file.getSignedUrl({
    action: "read",
    expires: Date.now() + 5 * 60 * 1000, // 5 minutes
  });

  // Return the URL to the frontend
  return { downloadUrl: url, useDirectDownload: false };
});

// Function to delete a file
exports.deleteFile = functions.https.onCall(async (data, context) => {
  // Ensure user is authenticated
  if (!context.auth) {
    throw new functions.https.HttpsError(
      "unauthenticated", 
      "Authentication required."
    );
  }
  
  const userId = context.auth.uid;
  const fileName = data.fileName;
  const fileId = data.fileId; // Database document ID
  
  if (!fileName || !fileId) {
    throw new functions.https.HttpsError(
      "invalid-argument", 
      "File name and ID are required."
    );
  }

  // Check if this file belongs to the user
  const fileRef = firestore.collection("files").doc(fileId);
  const fileDoc = await fileRef.get();
    
  if (!fileDoc.exists || fileDoc.data()?.userId !== userId) {
    throw new functions.https.HttpsError(
      "not-found", 
      "File not found or you don't have permission to delete it."
    );
  }

  // Path to the file in Cloud Storage
  const filePath = `${userId}/${fileName}`;
  const bucket = getStorage().bucket();
  const file = bucket.file(filePath);

  // Transaction to delete both file and metadata
  try {
    await admin.firestore().runTransaction(async (transaction) => {
      // Delete metadata from Firestore
      transaction.delete(fileRef);
      
      // Delete file from Storage
      await file.delete().catch((err: any) => {
        if (err.code !== 404) {
          throw err;
        }
        // Ignore 404 errors (file not found)
      });
    });
    
    return { success: true };
  } catch (error) {
    console.error("Error deleting file:", error);
    throw new functions.https.HttpsError(
      "internal", 
      "Failed to delete file."
    );
  }
});

// Function to store file metadata after upload
exports.saveFileMetadata = functions.https.onCall(async (data, context) => {
  // Ensure user is authenticated
  if (!context.auth) {
    throw new functions.https.HttpsError(
      "unauthenticated", 
      "Authentication required."
    );
  }
  
  const userId = context.auth.uid;
  const { fileName, fileSize, encryptionInfo } = data;
  
  if (!fileName) {
    throw new functions.https.HttpsError(
      "invalid-argument", 
      "File name is required."
    );
  }

  // Create metadata in Firestore
  try {
    const fileRef = await firestore.collection("files").add({      userId,
      fileName,
      fileSize: fileSize || 0,
      encryptionInfo: encryptionInfo || {},
      uploadDate: FieldValue.serverTimestamp()
    });
    
    return { success: true, fileId: fileRef.id };
  } catch (error) {
    console.error("Error saving file metadata:", error);
    throw new functions.https.HttpsError(
      "internal", 
      "Failed to save file metadata."
    );
  }
});

// HTTP endpoints with CORS support for development
exports.listFilesHttp = functions.https.onRequest((req, res) => {
  corsHandler(req, res, async () => {
    try {
      // Check authentication via Firebase Auth token
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const idToken = authHeader.split('Bearer ')[1];
      
      try {
        // Verify the Firebase ID token
        const decodedToken = await admin.auth().verifyIdToken(idToken);
        const userId = decodedToken.uid;
        
        // Get files from Firestore
        const filesSnapshot = await firestore
          .collection("files")
          .where("userId", "==", userId)
          .get();
          const files = filesSnapshot.docs.map(doc => {
          const data = doc.data();
          
          // Ensure uploadDate is properly formatted for the client
          if (data.uploadDate && data.uploadDate.toDate) {
            // Convert Firestore Timestamp to a plain object with seconds and nanoseconds
            data.uploadDate = {
              seconds: data.uploadDate.seconds,
              nanoseconds: data.uploadDate.nanoseconds
            };
          }
          
          return {
            id: doc.id,
            ...data
          };
        });
        
        res.status(200).json({ files });
      } catch (error) {
        console.error('Error verifying token:', error);
        res.status(401).json({ error: 'Invalid authentication token' });
      }
    } catch (error) {
      console.error('Error in listFilesHttp:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });
});

exports.getUploadUrlHttp = functions.https.onRequest((req, res) => {
  corsHandler(req, res, async () => {
    try {
      // Only allow POST requests
      if (req.method !== 'POST') {
        res.status(405).send('Method Not Allowed');
        return;
      }

      // Check authentication via Firebase Auth token
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const idToken = authHeader.split('Bearer ')[1];
      
      try {
        // Verify the Firebase ID token
        const decodedToken = await admin.auth().verifyIdToken(idToken);
        const userId = decodedToken.uid;
        
        const fileName = req.body.fileName;
        
        if (!fileName) {
          res.status(400).json({ error: 'File name is required' });
          return;
        }

        // Path to the file in Cloud Storage
        const filePath = `${userId}/${fileName}`;

        const bucket = getStorage().bucket();
        const file = bucket.file(filePath);

        // Create a signed URL valid for 5 minutes
        const [url] = await file.getSignedUrl({
          action: "write",
          expires: Date.now() + 5 * 60 * 1000, // 5 minutes
          contentType: "application/octet-stream",
        });

        res.status(200).json({ uploadUrl: url });
      } catch (error) {
        console.error('Error verifying token:', error);
        res.status(401).json({ error: 'Invalid authentication token' });
      }
    } catch (error) {
      console.error('Error in getUploadUrlHttp:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });
});

exports.getDownloadUrlHttp = functions.https.onRequest((req, res) => {
  corsHandler(req, res, async () => {
    try {
      // Only allow POST requests
      if (req.method !== 'POST') {
        res.status(405).send('Method Not Allowed');
        return;
      }

      // Check authentication via Firebase Auth token
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const idToken = authHeader.split('Bearer ')[1];
      
      try {
        // Verify the Firebase ID token
        const decodedToken = await admin.auth().verifyIdToken(idToken);
        const userId = decodedToken.uid;
        
        const fileName = req.body.fileName;
        
        if (!fileName) {
          res.status(400).json({ error: 'File name is required' });
          return;
        }

        // Check if this file belongs to the user
        const fileQuery = await firestore
          .collection("files")
          .where("fileName", "==", fileName)
          .where("userId", "==", userId)
          .limit(1)
          .get();
          
        if (fileQuery.empty) {
          res.status(404).json({
            error: 'File not found or you don\'t have permission to access it.'
          });
          return;
        }

        // Path to the file in Cloud Storage
        const filePath = `${userId}/${fileName}`;

        const bucket = getStorage().bucket();
        const file = bucket.file(filePath);

        // Check if file exists
        const [exists] = await file.exists();
        if (!exists) {
          res.status(404).json({ error: 'File not found in storage.' });
          return;
        }

        // Create a signed URL valid for 5 minutes
        const [url] = await file.getSignedUrl({
          action: "read",
          expires: Date.now() + 5 * 60 * 1000, // 5 minutes
        });

        res.status(200).json({ downloadUrl: url });
      } catch (error) {
        console.error('Error verifying token:', error);
        res.status(401).json({ error: 'Invalid authentication token' });
      }
    } catch (error) {
      console.error('Error in getDownloadUrlHttp:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });
});

exports.saveFileMetadataHttp = functions.https.onRequest((req, res) => {
  corsHandler(req, res, async () => {
    try {
      // Only allow POST requests
      if (req.method !== 'POST') {
        res.status(405).send('Method Not Allowed');
        return;
      }

      // Check authentication via Firebase Auth token
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const idToken = authHeader.split('Bearer ')[1];
      
      try {
        // Verify the Firebase ID token
        const decodedToken = await admin.auth().verifyIdToken(idToken);
        const userId = decodedToken.uid;
        
        const { fileName, fileSize, encryptionInfo } = req.body;
        
        if (!fileName) {
          res.status(400).json({ error: 'File name is required' });
          return;
        }

        // Create metadata in Firestore
        try {          const fileRef = await firestore.collection("files").add({
            userId,
            fileName,
            fileSize: fileSize || 0,
            encryptionInfo: encryptionInfo || {},
            uploadDate: FieldValue.serverTimestamp()
          });
          
          res.status(200).json({ success: true, fileId: fileRef.id });
        } catch (error) {
          console.error("Error saving file metadata:", error);
          res.status(500).json({ error: 'Failed to save file metadata' });
        }
      } catch (error) {
        console.error('Error verifying token:', error);
        res.status(401).json({ error: 'Invalid authentication token' });
      }
    } catch (error) {
      console.error('Error in saveFileMetadataHttp:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });
});

exports.deleteFileHttp = functions.https.onRequest((req, res) => {
  corsHandler(req, res, async () => {
    try {
      // Only allow POST requests
      if (req.method !== 'POST') {
        res.status(405).send('Method Not Allowed');
        return;
      }

      // Check authentication via Firebase Auth token
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const idToken = authHeader.split('Bearer ')[1];
      
      try {
        // Verify the Firebase ID token
        const decodedToken = await admin.auth().verifyIdToken(idToken);
        const userId = decodedToken.uid;
        
        const { fileName, fileId } = req.body;
        
        if (!fileName || !fileId) {
          res.status(400).json({ error: 'File name and ID are required' });
          return;
        }

        // Check if this file belongs to the user
        const fileRef = firestore.collection("files").doc(fileId);
        const fileDoc = await fileRef.get();
          
        if (!fileDoc.exists || fileDoc.data()?.userId !== userId) {
          res.status(404).json({ 
            error: 'File not found or you don\'t have permission to delete it.'
          });
          return;
        }

        // Path to the file in Cloud Storage
        const filePath = `${userId}/${fileName}`;
        const bucket = getStorage().bucket();
        const file = bucket.file(filePath);

        // Transaction to delete both file and metadata
        try {
          await admin.firestore().runTransaction(async (transaction) => {
            // Delete metadata from Firestore
            transaction.delete(fileRef);
            
            // Delete file from Storage
            await file.delete().catch((err: any) => {
              if (err.code !== 404) {
                throw err;
              }
              // Ignore 404 errors (file not found)
            });
          });
          
          res.status(200).json({ success: true });
        } catch (error) {
          console.error("Error deleting file:", error);
          res.status(500).json({ error: 'Failed to delete file' });
        }
      } catch (error) {
        console.error('Error verifying token:', error);
        res.status(401).json({ error: 'Invalid authentication token' });
      }
    } catch (error) {
      console.error('Error in deleteFileHttp:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });
});

// Function for direct file upload (emulator mode)
exports.uploadFile = functions.https.onCall(async (data, context) => {
  console.log('uploadFile called with data keys:', Object.keys(data));
  try {
    // Ensure user is authenticated
    if (!context.auth) {
      throw new functions.https.HttpsError(
        "unauthenticated", 
        "Authentication required."
      );
    }
    
    const userId = context.auth.uid;
    const { fileName, fileData, fileSize, encryptionInfo } = data;
    
    if (!fileName || !fileData) {
      throw new functions.https.HttpsError(
        "invalid-argument", 
        "File name and data are required."
      );
    }

    console.log(`Direct upload for user: ${userId}, file: ${fileName}, size: ${fileSize}`);

    // Path to the file in Cloud Storage
    const filePath = `${userId}/${fileName}`;
    const bucket = getStorage().bucket();
    const file = bucket.file(filePath);

    // Convert base64 data to buffer
    const fileBuffer = Buffer.from(fileData, 'base64');
    
    // Upload the file
    await file.save(fileBuffer, {
      metadata: {
        contentType: 'application/octet-stream',
        cacheControl: 'no-cache',
      }
    });    console.log(`File uploaded successfully: ${filePath}`);

    // Save metadata to Firestore
    const fileDoc = await firestore.collection("files").add({
      fileName,
      fileSize: fileSize || fileBuffer.length,
      userId,
      uploadDate: FieldValue.serverTimestamp(),
      encryptionInfo: encryptionInfo || null,
    });

    console.log(`File metadata saved with ID: ${fileDoc.id}`);

    return { 
      success: true, 
      fileId: fileDoc.id,
      message: "File uploaded successfully" 
    };
  } catch (error: any) {
    console.error('Error in uploadFile:', error);
    throw new functions.https.HttpsError(
      "internal", 
      `Failed to upload file: ${error.message || error}`
    );
  }
});
