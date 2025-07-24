# Root-level Dockerfile for Railway frontend service
# This handles the case where Railway builds from the root directory
FROM node:20-alpine

WORKDIR /app

# Copy package files from frontend subdirectory  
COPY frontend/package*.json ./

# Install dependencies
RUN npm install

# Copy frontend source code explicitly
COPY frontend/src ./src
COPY frontend/public ./public
COPY frontend/package.json ./package.json
COPY frontend/package-lock.json ./package-lock.json 2>/dev/null || echo "No package-lock.json found"

# Copy other frontend files
COPY frontend/tsconfig.json ./tsconfig.json 2>/dev/null || echo "No tsconfig.json found"
COPY frontend/tailwind.config.js ./tailwind.config.js 2>/dev/null || echo "No tailwind.config.js found"
COPY frontend/postcss.config.js ./postcss.config.js 2>/dev/null || echo "No postcss.config.js found"

# Debug: Verify we have the required files
RUN echo "=== DEBUGGING FILE STRUCTURE ===" && \
    echo "Files in /app:" && \
    ls -la && \
    echo "" && \
    echo "Contents of public directory:" && \
    ls -la public/ && \
    echo "" && \
    echo "Checking for index.html specifically:" && \
    ls -la public/index.html && \
    echo "" && \
    echo "File content preview:" && \
    head -5 public/index.html && \
    echo "" && \
    echo "File size and permissions:" && \
    stat public/index.html && \
    echo "=== END DEBUG ==="

# Build the application
RUN npm run build

# Install serve globally
RUN npm install -g serve

# Expose port
EXPOSE 3000

# Start the application  
CMD ["serve", "-s", "build", "-l", "3000"]
