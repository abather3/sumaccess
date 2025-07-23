FROM node:20-alpine

WORKDIR /app

# Install serve globally
RUN npm install -g serve

# Copy pre-built files
COPY build/ ./build/

# Expose port
EXPOSE 3000

# Start application
CMD ["serve", "-s", "build", "-l", "3000"]
