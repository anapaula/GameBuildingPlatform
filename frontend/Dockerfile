FROM node:18-alpine

WORKDIR /app

# Copiar package.json primeiro
COPY package.json ./

# Instalar dependências
RUN npm install --legacy-peer-deps

# Copiar o resto dos arquivos
COPY . .

EXPOSE 3000

CMD ["npm", "run", "dev"]