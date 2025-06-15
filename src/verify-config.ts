// Script to verify Firebase configuration
console.log("Verifying Firebase Configuration:");
console.log(`API Key: ${import.meta.env.VITE_FIREBASE_API_KEY ? "✅ Set" : "❌ Missing"}`);
console.log(`Auth Domain: ${import.meta.env.VITE_FIREBASE_AUTH_DOMAIN ? "✅ Set" : "❌ Missing"}`);
console.log(`Project ID: ${import.meta.env.VITE_FIREBASE_PROJECT_ID ? "✅ Set" : "❌ Missing"}`);
console.log(`Storage Bucket: ${import.meta.env.VITE_FIREBASE_STORAGE_BUCKET ? "✅ Set" : "❌ Missing"}`);
console.log(`Messaging Sender ID: ${import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID ? "✅ Set" : "❌ Missing"}`);
console.log(`App ID: ${import.meta.env.VITE_FIREBASE_APP_ID ? "✅ Set" : "❌ Missing"}`);
