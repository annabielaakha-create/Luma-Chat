# Production Dockerfile for LUMA AI on Google Cloud Run
FROM node:22-slim

# Create and define app directory
WORKDIR /app

# Set default production environment variables
ENV NODE_ENV=production
ENV PORT=3000

# Install dependencies (both runtime and dev for Vite build step)
COPY package*.json ./
RUN npm install

# Copy application source code
COPY . .

# Build the frontend production bundle (Vite outputs to /app/dist)
RUN npm run build

# Expose the default Cloud Run port (can be overridden by Cloud Run PORT env var)
EXPOSE 3000

# Launch production server
CMD ["node", "server.ts"]
