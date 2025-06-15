use firebase_admin_sdk::{
    auth::{Auth, FirebaseError, FirebaseToken},
    storage::Storage,
    app::App as FirebaseApp,
    credentials::{Credential, ServiceAccountCredential},
};
use serde::{Deserialize, Serialize};
use std::env;
use std::io::Cursor;
use std::sync::OnceLock;
use bytes::Bytes;
use mime::Mime;
use tokio::io::AsyncReadExt;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FirebaseUser {
    pub uid: String,
    pub email: Option<String>,
    pub email_verified: bool,
    pub name: Option<String>,
    pub picture: Option<String>,
}

// Initialize Firebase Admin once
static FIREBASE_APP: OnceLock<FirebaseApp> = OnceLock::new();
static FIREBASE_AUTH: OnceLock<Auth> = OnceLock::new();
static FIREBASE_STORAGE: OnceLock<Storage> = OnceLock::new();

pub fn get_firebase_admin() -> &'static FirebaseApp {
    FIREBASE_APP.get_or_init(|| {
        let project_id = env::var("FIREBASE_PROJECT_ID").expect("FIREBASE_PROJECT_ID must be set");
        let client_email = env::var("FIREBASE_CLIENT_EMAIL").expect("FIREBASE_CLIENT_EMAIL must be set");
        let private_key = env::var("FIREBASE_PRIVATE_KEY").expect("FIREBASE_PRIVATE_KEY must be set");
        
        // Create a service account credential
        let credential = ServiceAccountCredential::new(client_email, private_key);
        
        // Initialize Firebase Admin with the credential
        FirebaseApp::new(
            project_id,
            Credential::ServiceAccount(credential),
        )
        .expect("Failed to initialize Firebase Admin")
    })
}

pub fn get_firebase_auth() -> &'static Auth {
    FIREBASE_AUTH.get_or_init(|| {
        Auth::new(get_firebase_admin())
    })
}

pub fn get_firebase_storage() -> &'static Storage {
    FIREBASE_STORAGE.get_or_init(|| {
        let bucket = env::var("FIREBASE_STORAGE_BUCKET").expect("FIREBASE_STORAGE_BUCKET must be set");
        Storage::new(get_firebase_admin(), bucket)
    })
}

pub async fn verify_firebase_token(token: &str) -> Result<FirebaseToken, FirebaseError> {
    let auth = get_firebase_auth();
    auth.verify_id_token(token).await
}

pub async fn get_user_from_token(token: &str) -> Result<FirebaseUser, FirebaseError> {
    let token_data = verify_firebase_token(token).await?;
    let uid = token_data.uid.to_string();
    
    let auth = get_firebase_auth();
    let user = auth.get_user(&uid).await?;
    
    Ok(FirebaseUser {
        uid,
        email: user.email,
        email_verified: user.email_verified,
        name: user.display_name,
        picture: user.photo_url,
    })
}

pub async fn upload_file(
    file_path: &str,
    data: Bytes,
    content_type: Option<Mime>,
) -> Result<String, Box<dyn std::error::Error>> {
    let storage = get_firebase_storage();
    
    let file = storage.bucket().object(file_path);
    
    let upload_result = match content_type {
        Some(mime_type) => {
            file.upload_bytes(data, Some(mime_type.to_string())).await?
        },
        None => {
            file.upload_bytes(data, None).await?
        }
    };
    
    Ok(upload_result.name)
}

pub async fn get_file_url(file_path: &str) -> Result<String, Box<dyn std::error::Error>> {
    let storage = get_firebase_storage();
    let file = storage.bucket().object(file_path);
    
    // Generate a signed URL for temporary access
    let url = file.download_url(Some(chrono::Duration::hours(1))).await?;
    
    Ok(url)
}

pub async fn delete_file(file_path: &str) -> Result<(), Box<dyn std::error::Error>> {
    let storage = get_firebase_storage();
    let file = storage.bucket().object(file_path);
    
    file.delete().await?;
    
    Ok(())
}
