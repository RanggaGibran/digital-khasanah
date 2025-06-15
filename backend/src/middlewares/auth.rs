use axum::{
    async_trait,
    extract::{FromRequest, RequestParts, TypedHeader},
    headers::{authorization::Bearer, Authorization},
    http::StatusCode,
    response::{IntoResponse, Response},
    Json,
};
use serde_json::json;

use crate::services::{verify_token, Claims};

pub struct AuthenticatedUser(pub Claims);

#[async_trait]
impl<B> FromRequest<B> for AuthenticatedUser
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

        // Verify the token
        let token_data = verify_token(bearer.token()).map_err(|_| {
            let json = json!({
                "status": "error",
                "message": "Invalid token"
            });
            (StatusCode::UNAUTHORIZED, Json(json)).into_response()
        })?;

        Ok(AuthenticatedUser(token_data))
    }
}
