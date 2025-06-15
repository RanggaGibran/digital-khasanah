use axum::{
    async_trait,
    extract::{FromRequest, RequestParts, TypedHeader},
    headers::{authorization::Bearer, Authorization},
    http::StatusCode,
    response::{IntoResponse, Response},
    Json,
};
use serde_json::json;

use crate::services::{verify_firebase_token, FirebaseUser, get_user_from_token};

pub struct FirebaseAuthUser(pub FirebaseUser);

#[async_trait]
impl<B> FromRequest<B> for FirebaseAuthUser
where
    B: Send,
{
    type Rejection = Response;

    async fn from_request(req: &mut RequestParts<B>) -> Result<Self, Self::Rejection> {
        // Extract the token from the Authorization header
        let TypedHeader(Authorization(bearer)) =
            TypedHeader::<Authorization<Bearer>>::from_request(req)
                .await
                .map_err(|_| {
                    let json = json!({
                        "status": "error",
                        "message": "Missing or invalid authorization header"
                    });
                    (StatusCode::UNAUTHORIZED, Json(json)).into_response()
                })?;

        // Verify the Firebase token and get the user
        let user = get_user_from_token(bearer.token()).await
            .map_err(|e| {
                let json = json!({
                    "status": "error",
                    "message": e.to_string()
                });
                (StatusCode::UNAUTHORIZED, Json(json)).into_response()
            })?;

        Ok(FirebaseAuthUser(user))
    }
}
