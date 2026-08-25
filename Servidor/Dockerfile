FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install

# Substitua o COPY . . apenas pelos arquivos/pastas reais do seu projeto.
# ATENÇÃO: Se você tiver outras pastas (como 'tests', 'controllers', 'database'), 
# adicione-as aqui seguindo este mesmo modelo:
COPY Server.js ./
COPY instrument.js ./

# O SEGREDO: Dá permissão total na pasta /app para o usuário 'node' ANTES de trocar
RUN chown -R node:node /app

# Agora é seguro trocar de usuário (Resolve a vulnerabilidade S6471)
USER node

EXPOSE 5000

CMD ["node", "Server.js"]