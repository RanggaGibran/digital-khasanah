use super::get_firebase_admin;
use axum::http::StatusCode;
use reqwest::Url;
use std::fmt;
use std::io::Read;
use std::path::Path;
use uuid::Uuid;

#[derive(Debug)]
pub enum FirebaseStorageError {
    UploadFailed,
    FileNotFound,
    InvalidUrl,
    InternalError,
}

impl fmt::Display for FirebaseStorageError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            FirebaseStorageError::UploadFailed => write!(f, "Failed to upload file to Firebase Storage"),
            FirebaseStorageError::FileNotFound => write!(f, "File not found in Firebase Storage"),
            FirebaseStorageError::InvalidUrl => write!(f, "Invalid Firebase Storage URL"),
            FirebaseStorageError::InternalError => write!(f, "Internal Firebase Storage error"),
        }
    }
}

impl std::error::Error for FirebaseStorageError {}

impl From<FirebaseStorageError> for StatusCode {
    fn from(error: FirebaseStorageError) -> Self {
        match error {
            FirebaseStorageError::UploadFailed => StatusCode::BAD_REQUEST,
            FirebaseStorageError::FileNotFound => StatusCode::NOT_FOUND,
            FirebaseStorageError::InvalidUrl => StatusCode::BAD_REQUEST,
            FirebaseStorageError::InternalError => StatusCode::INTERNAL_SERVER_ERROR,
        }
    }
}

// Upload a file to Firebase Storage
pub async fn upload_file(user_id: &str, file_name: &str, data: Vec<u8>, content_type: &str) -> Result<String, FirebaseStorageError> {
    let admin = get_firebase_admin();
    
    // Generate a unique file path for the user
    let file_path = format!("users/{}/files/{}-{}", user_id, Uuid::new_v4(), sanitize_filename(file_name));
    
    // Upload the file
    admin.storage()
        .bucket()
        .object(&file_path)
        .upload(data, content_type)
        .await
        .map_err(|_| FirebaseStorageError::UploadFailed)?;
    
    // Return the file path
    Ok(file_path)
}

// Get a signed URL for a file
pub async fn get_file_url(file_path: &str, expires_in_seconds: u64) -> Result<String, FirebaseStorageError> {
    let admin = get_firebase_admin();
    
    admin.storage()
        .bucket()
        .object(file_path)
        .get_signed_url(expires_in_seconds)
        .await
        .map_err(|_| FirebaseStorageError::FileNotFound)
}

// Delete a file
pub async fn delete_file(file_path: &str) -> Result<(), FirebaseStorageError> {
    let admin = get_firebase_admin();
    
    admin.storage()
        .bucket()
        .object(file_path)
        .delete()
        .await
        .map_err(|_| FirebaseStorageError::FileNotFound)
}

// Helper function to sanitize file names
fn sanitize_filename(filename: &str) -> String {
    // Get the filename without path
    let filename = Path::new(filename).file_name()
        .map(|name| name.to_string_lossy().to_string())
        .unwrap_or_else(|| Uuid::new_v4().to_string());
    
    // Replace any characters that might cause issues
    filename
        .replace(" ", "_")
        .replace("/", "_")
        .replace("\\", "_")
        .replace("?", "_")
        .replace("#", "_")
        .replace("&", "_")
}
