use std::env;

pub struct AppConfig {
    pub database_url: String,
    pub jwt_secret: String,
    pub storage_region: String,
    pub storage_access_key: String,
    pub storage_secret_key: String,
    pub storage_bucket: String,
    pub port: u16,
}

impl AppConfig {
    pub fn from_env() -> Self {
        dotenv::dotenv().ok();

        let database_url = env::var("DATABASE_URL").expect("DATABASE_URL must be set");
        let jwt_secret = env::var("JWT_SECRET").expect("JWT_SECRET must be set");
        let storage_region = env::var("STORAGE_REGION").unwrap_or_else(|_| "auto".to_string());
        let storage_access_key = env::var("STORAGE_ACCESS_KEY").expect("STORAGE_ACCESS_KEY must be set");
        let storage_secret_key = env::var("STORAGE_SECRET_KEY").expect("STORAGE_SECRET_KEY must be set");
        let storage_bucket = env::var("STORAGE_BUCKET").expect("STORAGE_BUCKET must be set");
        let port = env::var("PORT")
            .unwrap_or_else(|_| "3000".to_string())
            .parse::<u16>()
            .expect("PORT must be a valid number");

        Self {
            database_url,
            jwt_secret,
            storage_region,
            storage_access_key,
            storage_secret_key,
            storage_bucket,
            port,
        }
    }
}
