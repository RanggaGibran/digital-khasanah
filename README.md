# Digital Khasanah

A secure digital storage application using Rust for cryptography, React for frontend, and Firebase for backend services.

## Project Setup

### Environment Variables

The project requires Firebase configuration. Create a `.env` file at the root of the project with the following variables:

```
VITE_FIREBASE_API_KEY=YOUR_API_KEY
VITE_FIREBASE_AUTH_DOMAIN=YOUR_PROJECT_ID.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=YOUR_PROJECT_ID
VITE_FIREBASE_STORAGE_BUCKET=YOUR_PROJECT_ID.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=YOUR_MESSAGING_SENDER_ID
VITE_FIREBASE_APP_ID=YOUR_APP_ID
```

Replace the placeholder values with your actual Firebase project configuration.

### Installation

1. Install dependencies:
   ```
   npm install
   ```

2. Build the Rust WASM module:
   ```
   cd rust-crypto
   wasm-pack build --target web
   cd ..
   ```

3. Start the development server:
   ```
   npm run dev
   ```

### Firebase Setup

1. Install Firebase CLI if not already installed:
   ```
   npm install -g firebase-tools
   ```

2. Login to Firebase:
   ```
   firebase login
   ```

3. Initialize the Firebase project:
   ```
   firebase init
   ```

4. Deploy Firebase functions:
   ```
   firebase deploy --only functions
   ```

## Project Structure

- `src/`: React frontend code
- `rust-crypto/`: Rust WebAssembly cryptography module
- `functions/`: Firebase Cloud Functions for backend logic
