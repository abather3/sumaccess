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

# Debug: Verify public directory exists before build
RUN echo "Contents of /app:" && ls -la
RUN echo "Contents of /app/public:" && ls -la public/ || echo "public directory not found"

# Build the application
RUN npm run build

# Install serve globally
RUN npm install -g serve

# Expose port
EXPOSE 3000

# Start the application
CMD ["serve", "-s", "build", "-l", "3000"]
