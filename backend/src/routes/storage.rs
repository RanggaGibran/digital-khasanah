use axum::{
    extract::{Multipart, Path, Query},
    http::StatusCode,
    routing::{get, post, delete},
    Json, Router,
};
use serde::{Deserialize, Serialize};
use serde_json::json;
use std::collections::HashMap;

use crate::{
    middlewares::FirebaseAuthUser,
    services::{upload_file, get_file_url, delete_file},
};

#[derive(Debug, Deserialize)]
struct GetFileUrlQuery {
    expires: Option<u64>,
}

#[derive(Debug, Serialize)]
struct FileUploadResponse {
    file_path: String,
    download_url: String,
}

#[derive(Debug, Serialize)]
struct FileUrlResponse {
    download_url: String,
}

pub fn create_storage_routes() -> Router {
    Router::new()
        .route("/upload", post(upload_file_handler))
        .route("/files/:file_path", get(get_file_url_handler))
        .route("/files/:file_path", delete(delete_file_handler))
}

async fn upload_file_handler(
    FirebaseAuthUser(user): FirebaseAuthUser,
    mut multipart: Multipart,
) -> Result<Json<serde_json::Value>, (StatusCode, Json<serde_json::Value>)> {
    // Process multipart form data
    let mut file_data = Vec::new();
    let mut file_name = String::new();
    let mut content_type = String::new();
    
    while let Some(field) = multipart.next_field().await.map_err(|e| {
        (
            StatusCode::BAD_REQUEST,
            Json(json!({
                "status": "error",
                "message": format!("Invalid form data: {}", e)
            })),
        )
    })? {
        let name = field.name().unwrap_or("").to_string();
        
        if name == "file" {
            file_name = field.file_name().unwrap_or("file.dat").to_string();
            content_type = field.content_type().unwrap_or("application/octet-stream").to_string();
            file_data = field.bytes().await.map_err(|e| {
                (
                    StatusCode::BAD_REQUEST,
                    Json(json!({
                        "status": "error",
                        "message": format!("Failed to read file: {}", e)
                    })),
                )
            })?.to_vec();
        }
    }
    
    if file_data.is_empty() {
        return Err((
            StatusCode::BAD_REQUEST,
            Json(json!({
                "status": "error",
                "message": "No file provided"
            })),
        ));
    }
    
    // Upload the file to Firebase Storage
    let file_path = upload_file(&user.uid, &file_name, file_data, &content_type)
        .await
        .map_err(|e| {
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(json!({
                    "status": "error",
                    "message": format!("Failed to upload file: {}", e)
                })),
            )
        })?;
    
    // Get a download URL for the file (valid for 1 hour)
    let download_url = get_file_url(&file_path, 60 * 60).await.map_err(|e| {
        (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(json!({
                "status": "error",
                "message": format!("Failed to get file URL: {}", e)
            })),
        )
    })?;
    
    Ok(Json(json!({
        "status": "success",
        "data": {
            "file_path": file_path,
            "download_url": download_url
        }
    })))
}

async fn get_file_url_handler(
    FirebaseAuthUser(_): FirebaseAuthUser,
    Path(file_path): Path<String>,
    Query(query): Query<GetFileUrlQuery>,
) -> Result<Json<serde_json::Value>, (StatusCode, Json<serde_json::Value>)> {
    // Default expiration is 1 hour
    let expires = query.expires.unwrap_or(60 * 60);
    
    // Get a signed URL for the file
    let download_url = get_file_url(&file_path, expires).await.map_err(|e| {
        (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(json!({
                "status": "error",
                "message": format!("Failed to get file URL: {}", e)
            })),
        )
    })?;
    
    Ok(Json(json!({
        "status": "success",
        "data": {
            "download_url": download_url
        }
    })))
}

async fn delete_file_handler(
    FirebaseAuthUser(_): FirebaseAuthUser,
    Path(file_path): Path<String>,
) -> Result<Json<serde_json::Value>, (StatusCode, Json<serde_json::Value>)> {
    // Delete the file
    delete_file(&file_path).await.map_err(|e| {
        (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(json!({
                "status": "error",
                "message": format!("Failed to delete file: {}", e)
            })),
        )
    })?;
    
    Ok(Json(json!({
        "status": "success",
        "message": "File deleted successfully"
    })))
}
