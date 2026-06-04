"""Add admin dashboard columns to claimrecord table."""
from database.db import engine
from sqlalchemy import text

def run_migration():
    with engine.connect() as conn:
        stmts = [
            "ALTER TABLE claimrecord ADD COLUMN IF NOT EXISTS notes TEXT",
            "ALTER TABLE claimrecord ADD COLUMN IF NOT EXISTS flags JSON DEFAULT '[]'::json",
            "ALTER TABLE claimrecord ADD COLUMN IF NOT EXISTS confidence_score FLOAT",
            "ALTER TABLE claimrecord ADD COLUMN IF NOT EXISTS uploaded_documents JSON DEFAULT '[]'::json",
        ]
        for stmt in stmts:
            conn.execute(text(stmt))
        conn.commit()
        print("Migration complete: admin dashboard columns added.")

if __name__ == "__main__":
    run_migration()
