use wasm_bindgen::prelude::*;
use js_sys::{Uint8Array, Promise, Object};
use aes_gcm::{
    aead::{Aead, KeyInit, OsRng},
    Aes256Gcm, Nonce
};
use sha2::{Sha256, Digest};
use pbkdf2::pbkdf2_hmac;
use rand::RngCore;
use base64::{Engine as _, engine::general_purpose::STANDARD as BASE64};
use serde::{Serialize, Deserialize};

// Salt size for key derivation
const SALT_SIZE: usize = 16;
// Nonce size for AES-GCM
const NONCE_SIZE: usize = 12;
// Number of PBKDF2 iterations
const PBKDF2_ITERATIONS: u32 = 100_000;

// Encryption metadata structure
#[derive(Serialize, Deserialize)]
pub struct EncryptionMetadata {
    salt: String, // base64 encoded
    nonce: String, // base64 encoded
    version: u8,
}

// Initialize the library
#[wasm_bindgen(start)]
pub fn init() {
    // Initialize panic hook for better error messages
    console_error_panic_hook::set_once();
}

// Generate a random encryption key from the password
fn derive_key(password: &str, salt: &[u8]) -> [u8; 32] {
    let mut key = [0u8; 32];
    pbkdf2_hmac::<Sha256>(
        password.as_bytes(),
        salt,
        PBKDF2_ITERATIONS,
        &mut key,
    );
    key
}

// Encrypt a file with AES-256-GCM
#[wasm_bindgen]
pub fn encrypt_data(data: &[u8], password: &str) -> Result<JsValue, JsValue> {
    // Generate a random salt
    let mut salt = [0u8; SALT_SIZE];
    OsRng.fill_bytes(&mut salt);

    // Generate a random nonce
    let mut nonce_bytes = [0u8; NONCE_SIZE];
    OsRng.fill_bytes(&mut nonce_bytes);
    let nonce = Nonce::from_slice(&nonce_bytes);

    // Derive the encryption key from the password and salt
    let key = derive_key(password, &salt);
    
    // Create the cipher
    let cipher = Aes256Gcm::new_from_slice(&key)
        .map_err(|e| JsValue::from_str(&format!("Error creating cipher: {}", e)))?;
    
    // Encrypt the data
    let ciphertext = cipher.encrypt(nonce, data)
        .map_err(|e| JsValue::from_str(&format!("Encryption failed: {}", e)))?;
    
    // Create the metadata
    let metadata = EncryptionMetadata {
        salt: BASE64.encode(salt),
        nonce: BASE64.encode(nonce_bytes),
        version: 1,
    };
    
    // Serialize the metadata to JSON
    let metadata_json = serde_wasm_bindgen::to_value(&metadata)
        .map_err(|e| JsValue::from_str(&format!("Error serializing metadata: {}", e)))?;
    
    // Create a result object with encrypted data and metadata
    let result = Object::new();
    js_sys::Reflect::set(&result, &JsValue::from_str("data"), &Uint8Array::from(ciphertext.as_slice()))
        .map_err(|_| JsValue::from_str("Failed to set data property"))?;
    js_sys::Reflect::set(&result, &JsValue::from_str("metadata"), &metadata_json)
        .map_err(|_| JsValue::from_str("Failed to set metadata property"))?;
    
    Ok(result.into())
}

// Decrypt a file with AES-256-GCM
#[wasm_bindgen]
pub fn decrypt_data(encrypted_data: &[u8], metadata_str: &str, password: &str) -> Result<Vec<u8>, JsValue> {
    // Parse the metadata from JSON string
    let metadata: EncryptionMetadata = serde_json::from_str(metadata_str)
        .map_err(|e| JsValue::from_str(&format!("Error parsing metadata: {}", e)))?;

    // Decode the salt and nonce
    let salt = BASE64.decode(&metadata.salt)
        .map_err(|e| JsValue::from_str(&format!("Error decoding salt: {}", e)))?;
    let nonce_bytes = BASE64.decode(&metadata.nonce)
        .map_err(|e| JsValue::from_str(&format!("Error decoding nonce: {}", e)))?;
    let nonce = Nonce::from_slice(&nonce_bytes);

    // Derive the encryption key from the password and salt
    let key = derive_key(password, &salt);
    
    // Create the cipher
    let cipher = Aes256Gcm::new_from_slice(&key)
        .map_err(|e| JsValue::from_str(&format!("Error creating cipher: {}", e)))?;
    
    // Decrypt the data
    let decrypted_data = cipher.decrypt(nonce, encrypted_data)
        .map_err(|_| JsValue::from_str("Decryption failed. Invalid password or corrupted data."))?;
    
    Ok(decrypted_data)
}

// Hash a password (for authentication, not for encryption)
#[wasm_bindgen]
pub fn hash_password(password: &str) -> String {
    let mut hasher = Sha256::new();
    hasher.update(password.as_bytes());
    let result = hasher.finalize();
    format!("{:x}", result)
}

// Generate a random password
#[wasm_bindgen]
pub fn generate_secure_password(length: u8) -> String {
    let chars: &[u8] = b"abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()-_=+[]{}|;:,.<>?";
    let mut rng = rand::thread_rng();
    let mut password = String::with_capacity(length as usize);
    
    for _ in 0..length {
        let idx = rng.next_u32() as usize % chars.len();
        password.push(chars[idx] as char);
    }
    
    password
}

// External JS functions
#[wasm_bindgen]
extern "C" {
    #[wasm_bindgen(js_namespace = console)]
    fn log(s: &str);

    #[wasm_bindgen(js_name = uploadEncryptedFile)]
    fn upload_encrypted_file(file_name: String, data: Vec<u8>, metadata: JsValue) -> Promise;

    #[wasm_bindgen(js_name = downloadEncryptedFile)]
    fn download_encrypted_file(file_name: String) -> Promise;
}

// Bridge function to upload an encrypted file
#[wasm_bindgen]
pub fn encrypt_and_upload_file(data: &[u8], file_name: &str, password: &str) -> Promise {
    match encrypt_data(data, password) {
        Ok(result) => {
            let data_array = js_sys::Reflect::get(&result, &JsValue::from_str("data")).unwrap();
            let metadata = js_sys::Reflect::get(&result, &JsValue::from_str("metadata")).unwrap();
            
            let uint8_array: Uint8Array = data_array.dyn_into().unwrap();
            let encrypted_data: Vec<u8> = uint8_array.to_vec();
            
            upload_encrypted_file(file_name.to_string(), encrypted_data, metadata)
        },
        Err(e) => {
            let promise = Promise::reject(&e);
            promise
        }
    }
}

// Get file extension from name
#[wasm_bindgen]
pub fn get_file_extension(filename: &str) -> String {
    if let Some(dot_pos) = filename.rfind('.') {
        filename[dot_pos + 1..].to_lowercase()
    } else {
        String::new()
    }
}
