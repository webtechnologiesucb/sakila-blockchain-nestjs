FROM node:20-alpine AS builder

WORKDIR /usr/src/app

# Install build dependencies if needed
RUN apk add --no-cache python3 make g++ git

# Copy dependency manifests
COPY package*.json ./

# Install all dependencies (including devDependencies needed for build & hardhat)
RUN npm ci

# Copy application source code and contracts
COPY tsconfig*.json nest-cli.json hardhat.config.ts ./
COPY src/ ./src/
COPY contracts/ ./contracts/
COPY database/ ./database/
COPY docker-entrypoint.sh ./

# Compile Solidity contracts and build NestJS
RUN npx hardhat compile
RUN npm run build
RUN chmod +x docker-entrypoint.sh

EXPOSE 3000

ENTRYPOINT ["./docker-entrypoint.sh"]
