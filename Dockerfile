FROM node:18-alpine

WORKDIR /app

# Copy package files for backend
COPY backend/package*.json ./backend/

# Install dependencies
RUN cd backend && npm install --production

# Copy all source files
COPY . .

# Environment variables
ENV NODE_ENV=production
ENV PORT=5000

# Railway will provide DATABASE_URL

# Start command handles DB migrations/seeds and starts server
CMD cd backend && npm run migrate && npm run seed && npm start
