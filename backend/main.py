from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from api.routes import router as claims_router

app = FastAPI(
    title="Plum OPD Claims Automation Suite",
    description="Engine handling AI-driven extraction and deterministic policy adjudication rules.",
    version="1.0.0"
)

# Apply CORS middleware so your Next.js frontend (localhost:3000) can make requests to FastAPI (localhost:8000)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, change this to your Vercel frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount our modular API routing tree
app.include_router(claims_router, prefix="/api/v1", tags=["Claims Adjudication Engine"])

@app.get("/health", tags=["Infrastructure Monitoring"])
def system_health_status():
    """Simple health check endpoint to verify server is running."""
    return {"status": "healthy", "engine_mode": "hybrid_deterministic"}