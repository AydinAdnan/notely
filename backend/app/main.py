from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .config import settings
from .routers import auth, notes, share, public, search, ai, history

app = FastAPI(
    title="Notes.app API",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        settings.FRONTEND_URL,
        "http://localhost:5173",
        "http://localhost:4173",
        "http://localhost:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routers — order matters: fixed paths before parameterised ones
app.include_router(auth.router)
app.include_router(share.router)      # /shared-with-me, /notes/{id}/share, /notes/{id}/shares
app.include_router(public.router)     # /share/{token}, /notes/{id}/generate-link
app.include_router(history.router)    # /notes/{id}/history, /notes/{id}/restore/{vid}
app.include_router(ai.router)         # /ai/rewrite
app.include_router(search.router)     # /search
app.include_router(notes.router)      # /notes/{id}  — last so fixed paths above win


@app.get("/health", tags=["health"])
def health():
    return {"status": "ok"}
