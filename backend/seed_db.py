from datetime import date
from sqlmodel import Session, SQLModel
# Import from your new database folder structure
from database.db import engine, Member

def seed_database():
    print("⏳ Creating database tables...")
    SQLModel.metadata.create_all(engine)
    
    with Session(engine) as session:
        # Create all Members from the test_cases.json
        test_members = [
            ("EMP001", "Rajesh Kumar", date(2023, 1, 1)),
            ("EMP002", "Priya Singh", date(2023, 1, 1)),
            ("EMP003", "Amit Verma", date(2023, 1, 1)),
            ("EMP004", "Sneha Reddy", date(2023, 1, 1)),
            ("EMP005", "Vikram Joshi", date(2024, 9, 1)), # Has a specific waiting period!
            ("EMP006", "Kavita Nair", date(2023, 1, 1)),
            ("EMP007", "Suresh Patil", date(2023, 1, 1)),
            ("EMP008", "Ravi Menon", date(2023, 1, 1)),
            ("EMP009", "Anita Desai", date(2023, 1, 1)),
            ("EMP010", "Deepak Shah", date(2023, 1, 1))
        ]

        for m_id, name, join_date in test_members:
            if not session.get(Member, m_id):
                member = Member(id=m_id, full_name=name, join_date=join_date)
                session.add(member)
                print(f"Added member: {name} ({m_id})")
                
        session.commit()
        print("✅ Database Seeded Successfully!")

if __name__ == "__main__":
    seed_database()