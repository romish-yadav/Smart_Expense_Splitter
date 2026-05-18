from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.database import Base, engine, SessionLocal
from app.routes import users, groups, expenses, ai
from app.seed import seed_database


@asynccontextmanager
async def lifespan(application: FastAPI):
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        seed_database(db)
    finally:
        db.close()
    yield


app = FastAPI(
    title="Smart Expense Splitter",
    description="A Splitwise-style app for tracking shared expenses with AI-powered entry",
    version="1.0.0",
    lifespan=lifespan,
)

# Disable CORS. Do not remove this for full-stack development.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allows all origins
    allow_credentials=True,
    allow_methods=["*"],  # Allows all methods
    allow_headers=["*"],  # Allows all headers
)

app.include_router(users.router)
app.include_router(groups.router)
app.include_router(expenses.router)
app.include_router(ai.router)


@app.get("/healthz")
async def healthz():
    return {"status": "ok"}
