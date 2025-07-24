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
        cat > public/index.html << 'EOF'
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8" />
    <link rel="icon" href="%PUBLIC_URL%/favicon.ico" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="theme-color" content="#000000" />
    <meta name="description" content="ESC Shop - Your online shopping destination" />
    <link rel="apple-touch-icon" href="%PUBLIC_URL%/logo192.png" />
    <link rel="manifest" href="%PUBLIC_URL%/manifest.json" />
    <title>ESC Shop</title>
</head>
<body>
    <noscript>You need to enable JavaScript to run this app.</noscript>
    <div id="root"></div>
</body>
</html>
EOF
    else \
        echo "public/index.html already exists" ; \
    fi

# Create other essential public files if missing
RUN if [ ! -f public/manifest.json ]; then \
        echo "Creating manifest.json..." && \
        cat > public/manifest.json << 'EOF'
{
  "short_name": "ESC Shop",
  "name": "ESC Shop",
  "icons": [
    {
      "src": "favicon.ico",
      "sizes": "64x64 32x32 24x24 16x16",
      "type": "image/x-icon"
    }
  ],
  "start_url": ".",
  "display": "standalone",
  "theme_color": "#000000",
  "background_color": "#ffffff"
}
EOF
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
