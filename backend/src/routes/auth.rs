use axum::{
    extract::Json,
    http::StatusCode,
    routing::{get, post},
    Router,
};
use bcrypt::{hash, verify, DEFAULT_COST};
use serde_json::json;
use uuid::Uuid;

use crate::{
    middlewares::AuthenticatedUser,
    models::{User, UserLogin, UserRegistration, UserResponse},
    services::create_token,
};

// Dummy in-memory database for demonstration
// In production, use Supabase or another DB
// This will be lost on server restart
static mut USERS: Vec<User> = Vec::new();

fn get_users() -> &'static mut Vec<User> {
    unsafe { &mut USERS }
}

// Create routes for authentication
pub fn create_auth_routes() -> Router {
    Router::new()
        .route("/register", post(register))
        .route("/login", post(login))
        .route("/me", get(get_current_user))
}

// Register a new user
async fn register(Json(user_data): Json<UserRegistration>) -> (StatusCode, Json<serde_json::Value>) {
    let users = get_users();
    
    // Check if user already exists
    if users.iter().any(|u| u.email == user_data.email) {
        return (
            StatusCode::CONFLICT,
            Json(json!({
                "status": "error",
                "message": "User with this email already exists"
            })),
        );
    }
    
    // Hash the password
    let password_hash = match hash(&user_data.password, DEFAULT_COST) {
        Ok(hash) => hash,
        Err(_) => {
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(json!({
                    "status": "error",
                    "message": "Failed to hash password"
                })),
            );
        }
    };
    
    // Create the user
    let user = User::new(user_data.email, password_hash);
    let user_response: UserResponse = user.clone().into();
    
    // Generate JWT token
    let token = match create_token(&user) {
        Ok(token) => token,
        Err(_) => {
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(json!({
                    "status": "error",
                    "message": "Failed to generate token"
                })),
            );
        }
    };
    
    // Add user to in-memory database
    users.push(user);
    
    (
        StatusCode::CREATED,
        Json(json!({
            "status": "success",
            "data": {
                "user": user_response,
                "token": token
            }
        })),
    )
}

// Login an existing user
async fn login(Json(credentials): Json<UserLogin>) -> (StatusCode, Json<serde_json::Value>) {
    let users = get_users();
    
    // Find user by email
    let user = match users.iter().find(|u| u.email == credentials.email) {
        Some(user) => user,
        None => {
            return (
                StatusCode::UNAUTHORIZED,
                Json(json!({
                    "status": "error",
                    "message": "Invalid email or password"
                })),
            );
        }
    };
    
    // Verify password
    let is_password_valid = match verify(&credentials.password, &user.password_hash) {
        Ok(valid) => valid,
        Err(_) => {
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(json!({
                    "status": "error",
                    "message": "Failed to verify password"
                })),
            );
        }
    };
    
    if !is_password_valid {
        return (
            StatusCode::UNAUTHORIZED,
            Json(json!({
                "status": "error",
                "message": "Invalid email or password"
            })),
        );
    }
    
    // Generate JWT token
    let token = match create_token(&user) {
        Ok(token) => token,
        Err(_) => {
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(json!({
                    "status": "error",
                    "message": "Failed to generate token"
                })),
            );
        }
    };
    
    let user_response: UserResponse = user.clone().into();
    
    (
        StatusCode::OK,
        Json(json!({
            "status": "success",
            "data": {
                "user": user_response,
                "token": token
            }
        })),
    )
}

// Get current user information (requires authentication)
async fn get_current_user(
    AuthenticatedUser(claims): AuthenticatedUser,
) -> (StatusCode, Json<serde_json::Value>) {
    let users = get_users();
    
    // Find user by ID
    let user = match users.iter().find(|u| u.id == claims.sub) {
        Some(user) => user,
        None => {
            return (
                StatusCode::NOT_FOUND,
                Json(json!({
                    "status": "error",
                    "message": "User not found"
                })),
            );
        }
    };
    
    let user_response: UserResponse = user.clone().into();
    
    (
        StatusCode::OK,
        Json(json!({
            "status": "success",
            "data": {
                "user": user_response
            }
        })),
    )
}
