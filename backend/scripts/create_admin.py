"""
Script para criar usuário admin inicial
Execute: python scripts/create_admin.py
"""
import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy.orm import Session
from database import SessionLocal
from models import User, UserRole
from auth import get_password_hash

def create_admin(username: str, email: str, password: str):
    db: Session = SessionLocal()
    try:
        existing_user = db.query(User).filter(
            (User.username == username) | (User.email == email)
        ).first()
        
        if existing_user:
            print(f"Usuário {username} ou email {email} já existe!")
            return
        
        admin_user = User(
            username=username,
            email=email,
            hashed_password=get_password_hash(password),
            role=UserRole.ADMIN,
            is_active=True
        )
        
        db.add(admin_user)
        db.commit()
        print(f"Admin {username} criado com sucesso!")
    except Exception as e:
        db.rollback()
        print(f"Erro ao criar admin: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    import argparse
    
    parser = argparse.ArgumentParser(description='Criar usuário admin')
    parser.add_argument('--username', default='admin', help='Username do admin')
    parser.add_argument('--email', default='admin@example.com', help='Email do admin')
    parser.add_argument('--password', default='admin123', help='Senha do admin')
    
    args = parser.parse_args()
    create_admin(args.username, args.email, args.password)

