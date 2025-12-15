# 🔧 Configurar Git e GitHub

Guia para instalar o Git e configurar o repositório no GitHub.

---

## 📥 Passo 1: Instalar o Git

1. **Baixe o Git para Windows:**
   - Acesse: https://git-scm.com/download/win
   - O download começará automaticamente

2. **Instale o Git:**
   - Execute o instalador baixado
   - Clique em "Next" nas telas de instalação
   - **Mantenha as opções padrão** (recomendado)
   - Clique em "Install"
   - Aguarde a instalação terminar
   - Clique em "Finish"

3. **Reinicie o terminal:**
   - Feche e abra novamente o PowerShell/CMD
   - Ou reinicie o Cursor/VS Code

---

## ✅ Passo 2: Verificar Instalação

Abra um novo terminal e execute:

```cmd
git --version
```

Se aparecer algo como `git version 2.x.x`, está instalado corretamente!

---

## 🔧 Passo 3: Configurar Git (Primeira vez)

Configure seu nome e email (substitua pelos seus dados):

```cmd
git config --global user.name "Seu Nome"
git config --global user.email "seu.email@example.com"
```

---

## 📦 Passo 4: Inicializar o Repositório

Execute estes comandos na pasta do projeto:

```cmd
cd C:\Users\anapa\PilotoJogo
git init
git add .
git commit -m "Initial commit: Plataforma de Jogo Online Multiagentes"
```

---

## 🚀 Passo 5: Criar Repositório no GitHub

1. **Acesse o GitHub:**
   - Vá para: https://github.com
   - Faça login na sua conta (ou crie uma se não tiver)

2. **Criar novo repositório:**
   - Clique no botão "+" no canto superior direito
   - Selecione "New repository"
   - Nome do repositório: `PilotoJogo` (ou outro nome de sua escolha)
   - Descrição: "Plataforma de Jogo Online Multiagentes com IA"
   - **NÃO marque** "Initialize this repository with a README"
   - **NÃO marque** "Add .gitignore" (já temos um)
   - **NÃO marque** "Choose a license" (opcional)
   - Clique em "Create repository"

3. **Copie a URL do repositório:**
   - Após criar, você verá uma página com instruções
   - Copie a URL que aparece (algo como: `https://github.com/seu-usuario/PilotoJogo.git`)

---

## 🔗 Passo 6: Conectar ao GitHub

Execute estes comandos (substitua `SUA_URL` pela URL que você copiou):

```cmd
git remote add origin SUA_URL
git branch -M main
git push -u origin main
```

**Exemplo:**
```cmd
git remote add origin https://github.com/seu-usuario/PilotoJogo.git
git branch -M main
git push -u origin main
```

---

## 📝 Comandos Úteis do Git

### Ver status do repositório
```cmd
git status
```

### Adicionar arquivos modificados
```cmd
git add .
```

### Fazer commit
```cmd
git commit -m "Descrição das alterações"
```

### Enviar para o GitHub
```cmd
git push
```

### Ver histórico de commits
```cmd
git log
```

### Ver diferenças
```cmd
git diff
```

---

## ⚠️ Arquivos que NÃO serão enviados

O arquivo `.gitignore` está configurado para **NÃO enviar**:
- ✅ Arquivos `.env` (com senhas e chaves)
- ✅ `node_modules/` (dependências do Node.js)
- ✅ `venv/` (ambiente virtual Python)
- ✅ `__pycache__/` (cache do Python)
- ✅ Arquivos de log
- ✅ Arquivos temporários

**IMPORTANTE:** Nunca commite arquivos `.env` com senhas ou chaves de API!

---

## 🆘 Problemas Comuns

### Erro: "git não é reconhecido"
**Solução:** Reinicie o terminal após instalar o Git.

### Erro: "Permission denied" ao fazer push
**Solução:** Você precisa autenticar. Use:
- GitHub Desktop (mais fácil)
- Ou configure SSH keys
- Ou use Personal Access Token

### Erro: "remote origin already exists"
**Solução:** Remova e adicione novamente:
```cmd
git remote remove origin
git remote add origin SUA_URL
```

---

## 📚 Próximos Passos

Após configurar:
1. ✅ Faça commits regularmente
2. ✅ Faça push para o GitHub
3. ✅ Crie branches para novas funcionalidades
4. ✅ Use pull requests para revisar código

---

**Precisa de ajuda?** Me avise quando instalar o Git e posso ajudar a executar os comandos!


