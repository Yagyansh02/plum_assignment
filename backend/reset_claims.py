from sqlmodel import Session, select, delete
from database.db import engine, ClaimRecord, Member

def reset_claims(member_id: str = None):
    """
    Deletes claim records from the database.
    If member_id is provided, deletes only that member's claims.
    If member_id is None, wipes the entire ClaimRecord table.
    """
    with Session(engine) as session:
        if member_id:
            # Verify the member exists first
            member = session.get(Member, member_id)
            if not member:
                print(f"❌ Member with ID '{member_id}' not found in the database.")
                return
            
            print(f"🗑️  Locating claims for: {member.full_name} ({member_id})...")
            
            # Count before deleting for a better UI experience
            count_stmt = select(ClaimRecord).where(ClaimRecord.member_id == member_id)
            claims_to_delete = session.exec(count_stmt).all()
            
            if not claims_to_delete:
                print("ℹ️  No claims found for this member. You are already at a clean state!")
                return

            # Execute the deletion
            delete_stmt = delete(ClaimRecord).where(ClaimRecord.member_id == member_id)
            session.exec(delete_stmt)
            session.commit()
            
            print(f"✅ Successfully deleted {len(claims_to_delete)} claim(s) for {member_id}.")
            print("🔄 Limits and duplicate checks for this user have been reset.")
            
        else:
            print("⚠️  WARNING: Preparing to delete ALL claim records in the database...")
            
            count_stmt = select(ClaimRecord)
            all_claims = session.exec(count_stmt).all()
            
            if not all_claims:
                print("ℹ️  The claims table is already empty!")
                return
                
            delete_stmt = delete(ClaimRecord)
            session.exec(delete_stmt)
            session.commit()
            
            print(f"✅ Successfully purged all {len(all_claims)} claim(s).")
            print("🔄 Entire test environment reset.")

if __name__ == "__main__":
    print("\n--- Plum Claim Reset Utility ---")
    print("1. Reset claims for my Demo Account (user_3EgA50Avucu7ZqSV8NVW44eCe7o)")
    print("2. Reset claims for a specific Employee ID (e.g., EMP002)")
    print("3. Reset ALL claims in the database (Nuke everything)")
    print("4. Cancel")
    
    choice = input("\nEnter your choice (1-4): ").strip()
    
    if choice == '1':
        reset_claims("user_3EgA50Avucu7ZqSV8NVW44eCe7o")
    elif choice == '2':
        emp_id = input("Enter the Member ID to reset: ").strip()
        reset_claims(emp_id)
    elif choice == '3':
        confirm = input("Are you absolutely sure you want to delete ALL claims? (y/n): ").strip().lower()
        if confirm == 'y':
            reset_claims(None)
        else:
            print("Aborted.")
    else:
        print("Exiting utility.")