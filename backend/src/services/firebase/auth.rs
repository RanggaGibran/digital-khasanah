use super::{get_firebase_admin, FirebaseUser};
use axum::http::StatusCode;
use firebase_admin_rs::auth::{DecodeIdToken, DecodedIdToken};
use std::fmt;

#[derive(Debug)]
pub enum FirebaseAuthError {
    InvalidToken,
    UserNotFound,
    InternalError,
}

impl fmt::Display for FirebaseAuthError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            FirebaseAuthError::InvalidToken => write!(f, "Invalid Firebase token"),
            FirebaseAuthError::UserNotFound => write!(f, "User not found"),
            FirebaseAuthError::InternalError => write!(f, "Internal Firebase auth error"),
        }
    }
}

impl std::error::Error for FirebaseAuthError {}

impl From<FirebaseAuthError> for StatusCode {
    fn from(error: FirebaseAuthError) -> Self {
        match error {
            FirebaseAuthError::InvalidToken => StatusCode::UNAUTHORIZED,
            FirebaseAuthError::UserNotFound => StatusCode::NOT_FOUND,
            FirebaseAuthError::InternalError => StatusCode::INTERNAL_SERVER_ERROR,
        }
    }
}

pub async fn verify_firebase_token(token: &str) -> Result<DecodedIdToken, FirebaseAuthError> {
    let admin = get_firebase_admin();
    
    // Verify the Firebase ID token
    admin.auth()
        .decode_id_token(token)
        .await
        .map_err(|_| FirebaseAuthError::InvalidToken)
}

pub async fn get_user_from_token(token: &str) -> Result<FirebaseUser, FirebaseAuthError> {
    // First verify the token
    let decoded_token = verify_firebase_token(token).await?;
    
    // Get the user from Firebase Auth
    let admin = get_firebase_admin();
    let user = admin.auth()
        .get_user(decoded_token.uid())
        .await
        .map_err(|_| FirebaseAuthError::UserNotFound)?;
    
    // Convert to our FirebaseUser type
    Ok(FirebaseUser {
        uid: user.uid().to_string(),
        email: user.email().unwrap_or_default().to_string(),
        email_verified: user.email_verified().unwrap_or(false),
        display_name: user.display_name().map(|s| s.to_string()),
        photo_url: user.photo_url().map(|s| s.to_string()),
        disabled: user.disabled().unwrap_or(false),
    })
}
