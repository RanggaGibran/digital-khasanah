use firebase_admin_rs::*;
use std::env;
use std::sync::OnceLock;

static FIREBASE_ADMIN: OnceLock<App> = OnceLock::new();

pub fn get_firebase_admin() -> &'static App {
    FIREBASE_ADMIN.get_or_init(|| {
        // Load Firebase credentials from environment variables
        let project_id = env::var("FIREBASE_PROJECT_ID").expect("FIREBASE_PROJECT_ID must be set");
        let client_email = env::var("FIREBASE_CLIENT_EMAIL").expect("FIREBASE_CLIENT_EMAIL must be set");
        let private_key = env::var("FIREBASE_PRIVATE_KEY").expect("FIREBASE_PRIVATE_KEY must be set");
        let database_url = env::var("FIREBASE_DATABASE_URL").ok();
        let storage_bucket = env::var("FIREBASE_STORAGE_BUCKET").expect("FIREBASE_STORAGE_BUCKET must be set");

        // Build credentials
        let mut credentials = Credentials::new(
            project_id,
            client_email,
            private_key,
        );

        if let Some(db_url) = database_url {
            credentials = credentials.with_database_url(db_url);
        }
        
        credentials = credentials.with_storage_bucket(storage_bucket);

        // Initialize Firebase Admin
        App::new(credentials).expect("Failed to initialize Firebase Admin SDK")
    })
}
