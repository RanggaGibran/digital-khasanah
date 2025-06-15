mod config;
mod middlewares;
mod models;
mod routes;
mod services;

use axum::{
    routing::get,
    Router,
    response::Json,
};
use serde_json::{json, Value};
use std::net::SocketAddr;
use tower_http::cors::{Any, CorsLayer};
use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt};

#[tokio::main]
async fn main() {
    // Initialize tracing
    tracing_subscriber::registry()
        .with(tracing_subscriber::EnvFilter::new(
            std::env::var("RUST_LOG").unwrap_or_else(|_| "info".into()),
        ))
        .with(tracing_subscriber::fmt::layer())
        .init();

    // Load environment variables
    dotenv::dotenv().ok();

    // Build our application with routes
    let app = Router::new()
        .route("/", get(health_check))
        .route("/api/health", get(health_check))
        .nest("/api/auth", routes::create_auth_routes())
        .nest("/api/storage", routes::create_storage_routes())
        // Add CORS middleware
        .layer(
            CorsLayer::new()
                .allow_origin(Any)
                .allow_methods(Any)
                .allow_headers(Any),
        );

    // Run the server
    let addr = SocketAddr::from(([127, 0, 0, 1], 3000));
    tracing::info!("Digital Khasanah API server started on {}", addr);
    
    axum::Server::bind(&addr)
        .serve(app.into_make_service())
        .await
        .unwrap();
}

// Handler for health check
async fn health_check() -> Json<Value> {
    Json(json!({
        "status": "success",
        "message": "Digital Khasanah API is running"
    }))
}
