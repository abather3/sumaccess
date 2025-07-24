# Root-level Dockerfile for Railway frontend service
# This handles the case where Railway builds from the root directory
FROM node:20-alpine

WORKDIR /app

# Copy package files from frontend subdirectory  
COPY frontend/package*.json ./

# Install dependencies
RUN npm install

# Copy all frontend source code
COPY frontend/ ./

# Debug: Verify we have the required files
RUN echo "Verifying files after copy from frontend/:" && \
    ls -la && \
    echo "Contents of public directory:" && \
    ls -la public/ && \
    echo "Checking for index.html:" && \
    ls -la public/index.html

# Build the application
RUN npm run build

# Install serve globally
RUN npm install -g serve

# Expose port
EXPOSE 3000

# Start the application  
CMD ["serve", "-s", "build", "-l", "3000"]
