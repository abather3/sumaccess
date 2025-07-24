# Temporary Dockerfile - Railway builds from root, so we need to handle frontend subdirectory
FROM node:20-alpine

WORKDIR /app

# Debug: List contents to see what Railway is copying
RUN echo "Contents of build context:" && ls -la || echo "No files found"

# Copy package files from current directory (should be frontend/)
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy all source code from current directory
COPY . .

# Try to explicitly ensure public directory structure is preserved
RUN echo "Attempting to verify public directory structure after COPY..."

# Debug: Verify public directory exists before build
RUN echo "Contents of /app:" && ls -la
RUN echo "Contents of /app/public:" && ls -la public/ || echo "public directory not found"

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

# Create other essential public files if missing
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

# Verify public directory is now ready
RUN echo "Final verification - Contents of /app/public:" && ls -la public/
RUN echo "Content of index.html:" && cat public/index.html

# Build the application
RUN npm run build

# Install serve globally
RUN npm install -g serve

# Expose port
EXPOSE 3000

# Start the application
CMD ["serve", "-s", "build", "-l", "3000"]
