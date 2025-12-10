"""Script para criar admin usando bcrypt diretamente"""
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from database import SessionLocal, engine, Base
from models import User, UserRole
import bcrypt

# Criar tabelas
Base.metadata.create_all(bind=engine)

def create_admin():
    db = SessionLocal()
    try:
        # Verificar se já existe
        existing = db.query(User).filter(User.username == "admin").first()
        if existing:
            print("✅ Admin já existe!")
            print(f"   Username: {existing.username}")
            print(f"   Email: {existing.email}")
            return
        
        # Criar hash da senha usando bcrypt diretamente
        password = "admin123".encode('utf-8')
        hashed = bcrypt.hashpw(password, bcrypt.gensalt()).decode('utf-8')
        
        # Criar admin
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
        print("   Email: admin@example.com")
    except Exception as e:
        db.rollback()
        print(f"❌ Erro: {e}")
        import traceback
        traceback.print_exc()
    finally:
        db.close()

if __name__ == "__main__":
    create_admin()

