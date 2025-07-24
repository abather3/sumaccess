FROM node:20-alpine

WORKDIR /app

# Copy package files from frontend subdirectory  
COPY frontend/package*.json ./

# Install dependencies
RUN npm install

# Copy files - Railway does this but we'll do it explicitly
COPY . .

# Create public directory and index.html - this MUST happen after COPY
RUN mkdir -p public && echo '<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width, initial-scale=1"/><title>Esca Shop Premium Eyewear</title></head><body><noscript>You need to enable JavaScript to run this app.</noscript><div id="root"></div></body></html>' > public/index.html

# Verify the file exists
RUN echo "Contents of /app:" && ls -la

# Verify public directory
RUN echo "Contents of /app/public:" && ls -la public/ || echo "public directory not found"

# Build the application - this should work now
RUN npm run build

# Install serve globally
RUN npm install -g serve

# Expose port
EXPOSE 3000

# Start the application  
CMD ["serve", "-s", "build", "-l", "3000"]
