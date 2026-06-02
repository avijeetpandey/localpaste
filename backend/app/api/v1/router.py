from fastapi import APIRouter
from backend.app.api.v1.endpoints import health, auth, pastes, webhooks, workspaces, collab

api_router = APIRouter(prefix="/api/v1")
api_router.include_router(health.router, tags=["health"])
api_router.include_router(auth.router, prefix="/auth", tags=["auth"])
api_router.include_router(pastes.router, prefix="/pastes", tags=["pastes"])
api_router.include_router(webhooks.router, prefix="/webhooks", tags=["webhooks"])
api_router.include_router(workspaces.router, prefix="/workspaces", tags=["workspaces"])
api_router.include_router(collab.router, prefix="/collab", tags=["collab"])
