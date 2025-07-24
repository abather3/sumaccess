# Root-level Dockerfile for Railway frontend service
# This handles the case where Railway builds from the root directory
FROM node:20-alpine

WORKDIR /app

# Copy package files from frontend subdirectory  
COPY frontend/package*.json ./

# Install dependencies
RUN npm install

# Railway copies all files as flat structure, so we need to create public directory and index.html
RUN mkdir -p public

# Create the index.html file that React needs
RUN echo '<!DOCTYPE html>' > public/index.html && \
    echo '<html lang="en">' >> public/index.html && \
    echo '  <head>' >> public/index.html && \
    echo '    <meta charset="utf-8" />' >> public/index.html && \
    echo '    <meta name="viewport" content="width=device-width, initial-scale=1" />' >> public/index.html && \
    echo '    <title>Esca Shop Premium Eyewear</title>' >> public/index.html && \
    echo '  </head>' >> public/index.html && \
    echo '  <body>' >> public/index.html && \
    echo '    <noscript>You need to enable JavaScript to run this app.</noscript>' >> public/index.html && \
    echo '    <div id="root"></div>' >> public/index.html && \
    echo '  </body>' >> public/index.html && \
    echo '</html>' >> public/index.html

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
