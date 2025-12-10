"""Script simplificado para criar admin"""
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from database import SessionLocal, engine, Base
from models import User, UserRole
from passlib.context import CryptContext

# Criar tabelas
Base.metadata.create_all(bind=engine)

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def create_admin():
    db = SessionLocal()
    try:
        # Verificar se já existe
        existing = db.query(User).filter(User.username == "admin").first()
        if existing:
            print("Admin já existe!")
            return
        
        # Criar admin
        hashed = pwd_context.hash("admin123")
        admin = User(
            username="admin",
            email="admin@example.com",
            hashed_password=hashed,
            role=UserRole.ADMIN,
            is_active=True
        )
        db.add(admin)
        db.commit()
        print("✅ Admin criado com sucesso!")
        print("   Username: admin")
        print("   Password: admin123")
    except Exception as e:
        db.rollback()
        print(f"❌ Erro: {e}")
        import traceback
        traceback.print_exc()
    finally:
        db.close()

if __name__ == "__main__":
    create_admin()

