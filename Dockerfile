# Use an official Node runtime as a parent image
FROM node:18-alpine

# Set working directory
WORKDIR /usr/src/app

# Copy package files and install dependencies first (layer caching)
COPY package*.json ./

# Install dependencies (production). For development, you can switch to npm install
RUN npm install --production

# Copy rest of the application code
COPY . .

# Expose port (matches PORT in .env)
EXPOSE 5000

# Start the app
CMD ["node", "server.js"]
