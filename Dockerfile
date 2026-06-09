FROM node:22-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY main.ts ./
COPY src/ ./src/

ENTRYPOINT ["npm", "start"]
