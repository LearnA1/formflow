from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

from routers import agent, upload, session

load_dotenv()

app = FastAPI(
    title="FormFlow API",
    description="AI paperwork assistant — upload a form, answer questions, get a filled PDF.",
    version="0.1.0",
)

# Allow the React frontend (localhost:3000) to call this API during development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routers
app.include_router(agent.router)
app.include_router(upload.router)
app.include_router(session.router)


@app.get("/", tags=["Health"])
def root():
    return {
        "service": "FormFlow API",
        "status": "running",
        "docs": "http://127.0.0.1:8000/docs",
        "endpoints": {
            "recommend_forms":  "POST /agent/recommend-forms",
            "upload_pdf":       "POST /upload",
            "start_session":    "POST /session/start",
            "answer_question":  "POST /session/answer",
            "fill_pdf":         "POST /fill/{session_id}",
            "download_pdf":     "GET  /download/{session_id}",
        }
    }


@app.get("/health", tags=["Health"])
def health():
    return {"status": "ok"}