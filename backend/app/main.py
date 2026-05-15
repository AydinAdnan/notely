from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .config import settings
from .routers import auth, notes, share, public, search, ai, history, workspaces

app = FastAPI(title="NoteZap API", version="1.0.0", docs_url="/docs", redoc_url="/redoc")

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

# Order matters: fixed paths before parameterised ones
app.include_router(auth.router)
app.include_router(workspaces.router)
app.include_router(share.router)
app.include_router(public.router)
app.include_router(history.router)
app.include_router(ai.router)
app.include_router(search.router)
app.include_router(notes.router)


@app.get("/health", tags=["health"])
def health():
    return {"status": "ok"}
