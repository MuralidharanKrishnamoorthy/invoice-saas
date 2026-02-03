FROM node:20-alpine

WORKDIR /app

# Copy backend package files
COPY payme-backend/package*.json ./

# Install dependencies
RUN npm install --omit=dev

# Copy backend application code
COPY payme-backend/ .

# Create logs directory
RUN mkdir -p logs

# Expose port
EXPOSE 3000

# Start application
CMD ["node", "server.js"]
