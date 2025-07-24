# Force cache invalidation with new structure
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files and install dependencies
COPY frontend/package*.json ./
RUN npm install

# Copy all source files
COPY . .

# CRITICAL: Create the missing public/index.html file
RUN echo "FORCE CACHE INVALIDATION - Creating public directory and index.html" && \
    mkdir -p public && \
    echo '<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width, initial-scale=1"/><title>Esca Shop Premium Eyewear</title></head><body><noscript>You need to enable JavaScript to run this app.</noscript><div id="root"></div></body></html>' > public/index.html && \
    echo "✅ Successfully created public/index.html" && \
    ls -la public/

# Double-check before build
RUN echo "FINAL CHECK:" && ls -la public/index.html && echo "File content:" && cat public/index.html

# Build the React application
RUN npm run build

# Install serve globally
RUN npm install -g serve

# Expose port
EXPOSE 3000

# Start the application  
CMD ["serve", "-s", "build", "-l", "3000"]
