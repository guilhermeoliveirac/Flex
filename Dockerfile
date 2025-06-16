# Dockerfile
FROM node:18

# Criar diretório de trabalho
WORKDIR /app

# Copiar os arquivos do projeto
COPY package*.json ./
RUN npm install

COPY . .

# Expor a porta padrão usada no server.js
EXPOSE 3000

# Comando padrão para iniciar a aplicação
CMD ["node", "server.js"]
