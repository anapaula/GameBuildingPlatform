# Configuração de E-mail

Para que os e-mails de convite sejam enviados, você precisa configurar as variáveis de ambiente SMTP no arquivo `backend/.env`.

## Variáveis Necessárias

Adicione as seguintes variáveis ao arquivo `backend/.env`:

```env
# SMTP Configuration
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=seu-email@gmail.com
SMTP_PASSWORD=sua-senha-de-app
SMTP_FROM_EMAIL=seu-email@gmail.com
SMTP_FROM_NAME=Plataforma de Jogo Online
```

## Configuração para Gmail

1. **Ative a verificação em duas etapas** na sua conta Google
2. **Gere uma senha de app**:
   - Acesse: https://myaccount.google.com/apppasswords
   - Selecione "App" e "Outro (nome personalizado)"
   - Digite "Plataforma de Jogo" e clique em "Gerar"
   - Copie a senha gerada (16 caracteres)
3. **Configure no .env**:
   ```env
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=587
   SMTP_USER=seu-email@gmail.com
   SMTP_PASSWORD=senha-de-app-gerada
   SMTP_FROM_EMAIL=seu-email@gmail.com
   SMTP_FROM_NAME=Plataforma de Jogo Online
   ```

## Configuração para Outlook/Hotmail

```env
SMTP_HOST=smtp-mail.outlook.com
SMTP_PORT=587
SMTP_USER=seu-email@outlook.com
SMTP_PASSWORD=sua-senha
SMTP_FROM_EMAIL=seu-email@outlook.com
SMTP_FROM_NAME=Plataforma de Jogo Online
```

## Configuração para outros provedores

- **Yahoo**: `smtp.mail.yahoo.com` (porta 587)
- **SendGrid**: `smtp.sendgrid.net` (porta 587, use API key como senha)
- **Mailgun**: `smtp.mailgun.org` (porta 587)

## Teste

Após configurar, reinicie o backend:

```bash
docker-compose restart backend
```

Ao convidar um facilitador ou jogador, o e-mail será enviado automaticamente. Se houver erro, verifique os logs:

```bash
docker-compose logs backend | grep EMAIL
```

## Nota

Se as variáveis SMTP não estiverem configuradas, o sistema continuará funcionando, mas apenas registrará os e-mails no console do backend (para desenvolvimento/teste).

