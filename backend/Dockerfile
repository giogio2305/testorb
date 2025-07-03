FROM node:20-slim

# Set working directory
WORKDIR /app

# Copy package.json and package-lock.json (if present)
COPY package.json ./

# Install dependencies
RUN npm install

# Copy the rest of the backend code
COPY . .

# Expose the port your backend runs on
EXPOSE 3000

# Default command (change to "npm run dev" for development)
CMD ["npm", "run", "dev"]