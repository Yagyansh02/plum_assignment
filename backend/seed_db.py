from datetime import date
from sqlmodel import Session, SQLModel

# Import from your actual database setup
from database.db import engine, Member

def seed_database():
    print("⏳ Creating database tables...")
    # This safely creates the tables if they don't exist yet
    SQLModel.metadata.create_all(engine)
    
    with Session(engine) as session:
        # 1. We include YOUR actual Clerk ID right at the top
        # 2. We keep the other test cases so you can still run eval_harness.py
        test_members = [
            ("user_3EgA50Avucu7ZqSV8NVW44eCe7o", "Plum Admin (Demo User)", date(2022, 1, 1)), 
            ("EMP001", "Rajesh Kumar", date(2023, 1, 1)),
            ("EMP002", "Priya Singh", date(2023, 1, 1)),
            ("EMP003", "Amit Verma", date(2023, 1, 1)),
            ("EMP004", "Sneha Reddy", date(2023, 1, 1)),
            ("EMP005", "Vikram Joshi", date(2024, 9, 1)), # Specifically tested for waiting periods
            ("EMP006", "Kavita Nair", date(2023, 1, 1)),
            ("EMP007", "Suresh Patil", date(2023, 1, 1)),
            ("EMP008", "Ravi Menon", date(2023, 1, 1)),
            ("EMP009", "Anita Desai", date(2023, 1, 1)),
            ("EMP010", "Deepak Shah", date(2023, 1, 1))
        ]

        for m_id, name, join_date in test_members:
            # Check if the member already exists to prevent duplicate key errors
            existing_member = session.get(Member, m_id)
            if not existing_member:
                member = Member(id=m_id, full_name=name, join_date=join_date)
                session.add(member)
                print(f"✅ Added member: {name} ({m_id})")
            else:
                print(f"⏩ Member already exists: {name} ({m_id})")
                
        # Save all changes to Supabase / Postgres
        session.commit()
        print("\n🎉 Database Seeded Successfully!")

if __name__ == "__main__":
    seed_database()