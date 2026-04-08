FROM node:18-alpine

WORKDIR /app

# Install root deps
COPY package.json ./
RUN npm install

# Build client
COPY client/package.json ./client/
RUN npm install --prefix client
COPY client/ ./client/
RUN npm run build --prefix client

# Install server deps
COPY server/package.json ./server/
RUN npm install --prefix server
COPY server/ ./server/

ENV NODE_ENV=production
EXPOSE 3000
CMD ["npm", "start"]
