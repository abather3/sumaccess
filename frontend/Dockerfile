# Simple Dockerfile fallback for Railway
FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy all source code
COPY . .

# Check if public directory was copied and copy if not
RUN if [ -d "public" ]; then echo "public directory exists"; else echo "public directory missing - will create"; fi

# Debug: Check what was copied
RUN echo "Contents after COPY:" && ls -la
RUN echo "Checking public directory:" && ls -la public/ || echo "public directory missing"

# Create public directory and index.html if missing (Railway build context issue)
RUN mkdir -p public && \
    if [ ! -f public/index.html ]; then \
        echo "Creating missing public/index.html..." && \
        echo '<!DOCTYPE html>' > public/index.html && \
        echo '<html lang="en">' >> public/index.html && \
        echo '<head>' >> public/index.html && \
        echo '    <meta charset="utf-8" />' >> public/index.html && \
        echo '    <link rel="icon" href="%PUBLIC_URL%/favicon.ico" />' >> public/index.html && \
        echo '    <meta name="viewport" content="width=device-width, initial-scale=1" />' >> public/index.html && \
        echo '    <meta name="theme-color" content="#000000" />' >> public/index.html && \
        echo '    <meta name="description" content="ESC Shop - Your online shopping destination" />' >> public/index.html && \
        echo '    <link rel="apple-touch-icon" href="%PUBLIC_URL%/logo192.png" />' >> public/index.html && \
        echo '    <link rel="manifest" href="%PUBLIC_URL%/manifest.json" />' >> public/index.html && \
        echo '    <title>ESC Shop</title>' >> public/index.html && \
        echo '</head>' >> public/index.html && \
        echo '<body>' >> public/index.html && \
        echo '    <noscript>You need to enable JavaScript to run this app.</noscript>' >> public/index.html && \
        echo '    <div id="root"></div>' >> public/index.html && \
        echo '</body>' >> public/index.html && \
        echo '</html>' >> public/index.html ; \
    else \
        echo "public/index.html already exists" ; \
    fi

# Create manifest.json if missing
RUN if [ ! -f public/manifest.json ]; then \
        echo "Creating manifest.json..." && \
        echo '{' > public/manifest.json && \
        echo '  "short_name": "ESC Shop",' >> public/manifest.json && \
        echo '  "name": "ESC Shop",' >> public/manifest.json && \
        echo '  "icons": [' >> public/manifest.json && \
        echo '    {' >> public/manifest.json && \
        echo '      "src": "favicon.ico",' >> public/manifest.json && \
        echo '      "sizes": "64x64 32x32 24x24 16x16",' >> public/manifest.json && \
        echo '      "type": "image/x-icon"' >> public/manifest.json && \
        echo '    }' >> public/manifest.json && \
        echo '  ],' >> public/manifest.json && \
        echo '  "start_url": ".",' >> public/manifest.json && \
        echo '  "display": "standalone",' >> public/manifest.json && \
        echo '  "theme_color": "#000000",' >> public/manifest.json && \
        echo '  "background_color": "#ffffff"' >> public/manifest.json && \
        echo '}' >> public/manifest.json ; \
    fi

# Verify files are ready
RUN echo "Final check - public directory:" && ls -la public/
RUN echo "Contents of index.html:" && cat public/index.html

# Build the application
RUN npm run build

# Install serve globally
RUN npm install -g serve

# Expose port (Railway will set this dynamically)
EXPOSE $PORT

# Start the application using Railway's PORT environment variable
CMD ["sh", "-c", "serve -s build -l $PORT"]
