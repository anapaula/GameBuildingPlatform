import os
import secrets
import smtplib
import requests
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from typing import Optional
from datetime import datetime, timedelta

class EmailService:
    """Serviço para envio de e-mails de convite via SMTP"""
    
    @staticmethod
    def generate_invitation_token() -> str:
        """Gera um token único para convite"""
        return secrets.token_urlsafe(32)
    
    @staticmethod
    def get_invitation_expiry(days: int = 7) -> datetime:
        """Retorna data de expiração do convite (padrão 7 dias)"""
        return datetime.utcnow() + timedelta(days=days)
    
    @staticmethod
    def _send_smtp_email(
        to_email: str,
        subject: str,
        html_body: str,
        text_body: str
    ) -> bool:
        """Envia e-mail via SMTP"""
        # Configurações SMTP (podem ser definidas via variáveis de ambiente)
        smtp_host = os.getenv("SMTP_HOST", "smtp.gmail.com")
        smtp_port = int(os.getenv("SMTP_PORT", "587"))
        smtp_user = os.getenv("SMTP_USER", "")
        smtp_password = os.getenv("SMTP_PASSWORD", "")
        smtp_from_email = os.getenv("SMTP_FROM_EMAIL", smtp_user)
        smtp_from_name = os.getenv("SMTP_FROM_NAME", "Plataforma de Jogo Online")
        
        # Se não houver configuração SMTP, apenas logar
        if not smtp_user or not smtp_password:
            print(f"[EMAIL SERVICE] SMTP não configurado. E-mail não enviado.")
            print(f"[EMAIL SERVICE] Para: {to_email}")
            print(f"[EMAIL SERVICE] Subject: {subject}")
            print(f"[EMAIL SERVICE] Message: {text_body}")
            print(f"[EMAIL SERVICE] Configure SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD no .env")
            return False

    @staticmethod
    def _send_resend_email(
        to_email: str,
        subject: str,
        html_body: str,
        text_body: str
    ) -> bool:
        """Envia e-mail via Resend API"""
        resend_api_key = os.getenv("RESEND_API_KEY", "")
        from_email = os.getenv("EMAIL_FROM", "")

        if not resend_api_key or not from_email:
            print("[EMAIL SERVICE] Resend não configurado. E-mail não enviado.")
            print(f"[EMAIL SERVICE] Para: {to_email}")
            print(f"[EMAIL SERVICE] Subject: {subject}")
            print(f"[EMAIL SERVICE] Configure RESEND_API_KEY e EMAIL_FROM no .env")
            return False

        try:
            response = requests.post(
                "https://api.resend.com/emails",
                headers={
                    "Authorization": f"Bearer {resend_api_key}",
                    "Content-Type": "application/json",
                },
                json={
                    "from": from_email,
                    "to": [to_email],
                    "subject": subject,
                    "html": html_body,
                    "text": text_body,
                },
                timeout=15,
            )

            if response.status_code >= 400:
                print(f"[EMAIL SERVICE] Erro Resend ({response.status_code}): {response.text}")
                return False

            print(f"[EMAIL SERVICE] E-mail enviado via Resend para {to_email}")
            return True
        except Exception as e:
            print(f"[EMAIL SERVICE] Erro ao enviar via Resend: {str(e)}")
            return False
        
        try:
            # Criar mensagem
            msg = MIMEMultipart('alternative')
            msg['Subject'] = subject
            msg['From'] = f"{smtp_from_name} <{smtp_from_email}>"
            msg['To'] = to_email
            
            # Adicionar versões texto e HTML
            text_part = MIMEText(text_body, 'plain', 'utf-8')
            html_part = MIMEText(html_body, 'html', 'utf-8')
            msg.attach(text_part)
            msg.attach(html_part)
            
            # Enviar via SMTP
            with smtplib.SMTP(smtp_host, smtp_port) as server:
                server.starttls()
                server.login(smtp_user, smtp_password)
                server.send_message(msg)
            
            print(f"[EMAIL SERVICE] E-mail enviado com sucesso para {to_email}")
            return True
            
        except Exception as e:
            print(f"[EMAIL SERVICE] Erro ao enviar e-mail para {to_email}: {str(e)}")
            return False
    
    @staticmethod
    async def send_invitation_email(
        email: str,
        role: str,
        invitation_token: str,
        inviter_name: Optional[str] = None
    ) -> bool:
        """
        Envia e-mail de convite via SMTP
        Se SMTP não estiver configurado, apenas loga no console
        """
        base_url = os.getenv("FRONTEND_URL", "http://localhost:3000")
        
        # token_urlsafe já gera tokens seguros para URL, não precisa codificar novamente
        if role == "facilitator" or role == "FACILITATOR":
            register_url = f"{base_url}/register/facilitator?token={invitation_token}"
            subject = "Convite para ser Facilitador - Plataforma de Jogo Online"
            role_name = "Facilitador"
        else:  # player
            register_url = f"{base_url}/register/player?token={invitation_token}"
            subject = "Convite para jogar - Plataforma de Jogo Online"
            role_name = "Jogador"
        
        inviter_text = f" por {inviter_name}" if inviter_name else ""
        
        # Corpo do e-mail em texto simples
        text_body = f"""Olá,

Você foi convidado{inviter_text} para ser um {role_name} na Plataforma de Jogo Online.

Clique no link abaixo para criar sua conta:
{register_url}

Este link expira em 7 dias.

Atenciosamente,
Equipe da Plataforma de Jogo Online"""
        
        # Corpo do e-mail em HTML
        html_body = f"""<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <style>
        body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
        .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
        .header {{ background-color: #4F46E5; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }}
        .content {{ background-color: #f9fafb; padding: 30px; border: 1px solid #e5e7eb; }}
        .button {{ display: inline-block; padding: 12px 24px; background-color: #4F46E5; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }}
        .footer {{ text-align: center; padding: 20px; color: #6b7280; font-size: 12px; }}
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Plataforma de Jogo Online</h1>
        </div>
        <div class="content">
            <p>Olá,</p>
            <p>Você foi convidado{inviter_text} para ser um <strong>{role_name}</strong> na Plataforma de Jogo Online.</p>
            <p style="text-align: center;">
                <a href="{register_url}" class="button">Criar minha conta</a>
            </p>
            <p>Ou copie e cole o link abaixo no seu navegador:</p>
            <p style="word-break: break-all; color: #6b7280; font-size: 12px;">{register_url}</p>
            <p><strong>Este link expira em 7 dias.</strong></p>
        </div>
        <div class="footer">
            <p>Atenciosamente,<br>Equipe da Plataforma de Jogo Online</p>
        </div>
    </div>
</body>
</html>"""
        
        provider = os.getenv("EMAIL_PROVIDER", "").lower()
        if provider == "resend" or os.getenv("RESEND_API_KEY"):
            return EmailService._send_resend_email(email, subject, html_body, text_body)

        # Fallback para SMTP
        return EmailService._send_smtp_email(email, subject, html_body, text_body)

