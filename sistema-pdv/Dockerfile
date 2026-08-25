FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install

# Resolve a regra S6470: Copia apenas as pastas essenciais do React
COPY public/ ./public/
COPY src/ ./src/

# Dá permissão para o usuário node gerenciar a pasta do app
RUN chown -R node:node /app

# Resolve a regra S6471: Remove os poderes de root
USER node

EXPOSE 3000

CMD ["npm", "start"]