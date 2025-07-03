FROM node:20-slim

# Set working directory
WORKDIR /app

# Copy package.json and package-lock.json (if present)
COPY package.json ./

# Install dependencies
RUN npm install

# Copy the rest of the frontend code
COPY . .

# Expose the port your frontend runs on (Vite default is 5173)
EXPOSE 5173

# Default command (change to "npm run dev" for development)
CMD ["npm", "run", "dev"]