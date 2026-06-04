import os
import uuid
from datetime import date
from typing import List, Optional
from dotenv import load_dotenv
from sqlmodel import SQLModel, Field, Session, create_engine, Column, JSON, String

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    raise ValueError("Missing DATABASE_URL in .env")

# Create the DB Engine
engine = create_engine(DATABASE_URL, echo=False)

def get_session():
    """Dependency provider for FastAPI routes"""
    with Session(engine) as session:
        yield session

# --- DATABASE TABLES ---

class Member(SQLModel, table=True):
    id: str = Field(primary_key=True)
    full_name: str
    join_date: date

class ClaimRecord(SQLModel, table=True):
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    member_id: str = Field(foreign_key="member.id")
    treatment_date: date
    submission_date: date
    status: str
    raw_claim_amount: float
    approved_amount: float
    rejection_reasons: List[str] = Field(default_factory=list, sa_column=Column(JSON))
    llm_raw_extraction: dict = Field(default_factory=dict, sa_column=Column(JSON))
    # ── Admin Dashboard fields ──
    notes: Optional[str] = Field(default=None, sa_column=Column(String, nullable=True))
    flags: List[str] = Field(default_factory=list, sa_column=Column("flags", JSON))
    confidence_score: Optional[float] = Field(default=None)
    uploaded_documents: List[dict] = Field(
        default_factory=list,
        sa_column=Column("uploaded_documents", JSON),
        description="List of {filename, content_type, data_b64} for admin document review",
    )