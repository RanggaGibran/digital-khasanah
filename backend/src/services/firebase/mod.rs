mod admin;
mod auth;
mod storage;

pub use admin::get_firebase_admin;
pub use auth::{verify_firebase_token, get_user_from_token};
pub use storage::{upload_file, get_file_url, delete_file};

use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct FirebaseUser {
    pub uid: String,
    pub email: String,
    pub email_verified: bool,
    pub display_name: Option<String>,
    pub photo_url: Option<String>,
    pub disabled: bool,
}
