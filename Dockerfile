# Root-level Dockerfile for Railway frontend service
# This handles the case where Railway builds from the root directory
FROM node:20-alpine

WORKDIR /app

# Copy package files from frontend subdirectory  
COPY frontend/package*.json ./

# Install dependencies
RUN npm install

# Create public directory and index.html in one step to ensure it works
RUN echo "Creating public directory and index.html..." && \
    mkdir -p public && \
    echo '<!DOCTYPE html>' > public/index.html && \
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
    echo '</html>' >> public/index.html && \
    echo "✅ Created public/index.html successfully" && \
    ls -la public/

# Copy any remaining files if needed (Railway uses COPY . . after our commands)
COPY . .

# Final verification before build
RUN echo "=== FINAL VERIFICATION BEFORE BUILD ===" && \
    echo "All files in /app:" && \
    ls -la && \
    echo "" && \
    echo "Public directory status:" && \
    ls -la public/ 2>/dev/null || echo "❌ Public directory missing!" && \
    echo "" && \
    echo "Index.html status:" && \
    ls -la public/index.html 2>/dev/null || echo "❌ index.html missing!" && \
    echo "" && \
    if [ -f public/index.html ]; then \
        echo "✅ index.html found! Content:" && \
        cat public/index.html; \
    else \
        echo "❌ Creating index.html as last resort..." && \
        mkdir -p public && \
        echo '<!DOCTYPE html><html><head><meta charset="utf-8"/><title>Esca Shop</title></head><body><div id="root"></div></body></html>' > public/index.html && \
        echo "✅ Emergency index.html created"; \
    fi && \
    echo "=== END VERIFICATION ==="

# Build the application
RUN npm run build

# Install serve globally
RUN npm install -g serve

# Expose port
EXPOSE 3000

# Start the application  
CMD ["serve", "-s", "build", "-l", "3000"]
