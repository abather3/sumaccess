# Docker Setup for EscaShop

This document provides instructions for running the EscaShop application using Docker and Docker Compose.

## Prerequisites

- Docker Desktop (recommended) or Docker Engine
- Docker Compose (usually included with Docker Desktop)
- At least 4GB of available RAM
- At least 2GB of free disk space

## Project Structure

```
escashop/
├── backend/
│   ├── Dockerfile              # Production backend image
│   ├── Dockerfile.dev          # Development backend image
│   ├── .dockerignore          # Backend Docker ignore file
│   └── ...
├── frontend/
│   ├── Dockerfile              # Production frontend image
│   ├── Dockerfile.dev          # Development frontend image
│   ├── .dockerignore          # Frontend Docker ignore file
│   └── ...
├── docker-compose.yml          # Production compose file
├── docker-compose.dev.yml      # Development compose file
└── DOCKER_README.md           # This file
```

## Quick Start

### Production Build

To run the application in production mode:

```bash
# Build and start all services
docker-compose up --build

# Or run in background
docker-compose up -d --build
```

Access the application:
- Frontend: http://localhost:3000
- Backend API: http://localhost:5000
- PostgreSQL: localhost:5432

### Development Build

For development with hot-reloading:

```bash
# Build and start development services
docker-compose -f docker-compose.dev.yml up --build

# Or run in background
docker-compose -f docker-compose.dev.yml up -d --build
```

## Services

### PostgreSQL Database
- **Image**: postgres:15-alpine
- **Port**: 5432
- **Database**: escashop
- **User/Password**: postgres/postgres
- **Volume**: Persistent data storage
- **Health Check**: Built-in PostgreSQL readiness check

### Backend Service
- **Base Image**: node:20-alpine
- **Port**: 5000
- **Features**:
  - TypeScript build process
  - Database migrations on startup
  - Non-root user for security
  - Health checks
  - Environment variable configuration

### Frontend Service
- **Base Image**: node:20-alpine (multi-stage build)
- **Port**: 3000
- **Features**:
  - React build optimization
  - Static file serving with `serve`
  - Multi-stage build for smaller production image
  - Non-root user for security

## Common Commands

### Starting Services
```bash
# Production
docker-compose up -d

# Development
docker-compose -f docker-compose.dev.yml up -d
```

### Stopping Services
```bash
# Production
docker-compose down

# Development
docker-compose -f docker-compose.dev.yml down
```

### Viewing Logs
```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f backend
docker-compose logs -f frontend
docker-compose logs -f postgres
```

### Rebuilding Services
```bash
# Rebuild all
docker-compose up --build

# Rebuild specific service
docker-compose up --build backend
```

### Database Operations
```bash
# Access PostgreSQL shell
docker-compose exec postgres psql -U postgres -d escashop

# Run database migrations manually
docker-compose exec backend npm run migrate
```

## Environment Variables

The following environment variables are configured in the docker-compose files:

### Backend Environment Variables
- `NODE_ENV`: Application environment (development/production)
- `PORT`: Server port (default: 5000)
- `DATABASE_URL`: PostgreSQL connection string
- `JWT_SECRET`: JWT signing secret
- `FRONTEND_URL`: Frontend application URL

### Frontend Environment Variables
- `REACT_APP_API_URL`: Backend API URL
- `REACT_APP_SOCKET_URL`: WebSocket server URL

## Volumes

### Persistent Volumes
- `postgres_data`: PostgreSQL data persistence
- `postgres_dev_data`: Development PostgreSQL data

### Bind Mounts
- `./backend/uploads`: File uploads storage
- `./backend/logs`: Application logs
- Development: Source code mounting for hot-reloading

## Networking

All services communicate through a custom bridge network:
- Production: `escashop-network`
- Development: `escashop-dev-network`

## Security Features

- Non-root users in all containers
- Minimal Alpine Linux base images
- Health checks for service monitoring
- Environment variable configuration
- Docker ignore files to exclude sensitive data

## Troubleshooting

### Database Connection Issues
```bash
# Check if PostgreSQL is running
docker-compose ps postgres

# Check PostgreSQL logs
docker-compose logs postgres

# Verify database connectivity
docker-compose exec backend npm run migrate
```

### Build Issues
```bash
# Clean rebuild
docker-compose down
docker system prune -f
docker-compose up --build
```

### Permission Issues
```bash
# Fix file permissions (Unix/Linux/macOS)
sudo chown -R $USER:$USER ./backend/uploads
sudo chown -R $USER:$USER ./backend/logs
```

### Port Conflicts
If ports 3000, 5000, or 5432 are already in use, modify the port mappings in docker-compose.yml:

```yaml
services:
  frontend:
    ports:
      - "3001:3000"  # Change host port
  backend:
    ports:
      - "5001:5000"  # Change host port
  postgres:
    ports:
      - "5433:5432"  # Change host port
```

## Development Workflow

### Hot Reloading Setup
The development compose file includes volume mounts for hot reloading:

```bash
# Start development environment
docker-compose -f docker-compose.dev.yml up

# Make changes to source code
# Changes will be automatically reflected in the running containers
```

### Running Tests
```bash
# Backend tests
docker-compose exec backend npm test

# Frontend tests
docker-compose exec frontend npm test
```

### Installing New Dependencies
```bash
# Install backend dependency
docker-compose exec backend npm install <package-name>

# Install frontend dependency
docker-compose exec frontend npm install <package-name>

# Rebuild after adding dependencies
docker-compose up --build
```

## Production Deployment

For production deployment, consider:

1. **Environment Variables**: Use environment-specific values
2. **Secrets Management**: Use Docker secrets or external secret management
3. **Resource Limits**: Set memory and CPU limits
4. **Monitoring**: Add monitoring and logging solutions
5. **Load Balancing**: Use a reverse proxy (nginx, traefik)
6. **SSL/TLS**: Configure HTTPS certificates

Example production deployment with resource limits:

```yaml
services:
  backend:
    deploy:
      resources:
        limits:
          memory: 512M
          cpus: '0.5'
        reservations:
          memory: 256M
          cpus: '0.25'
```

## Maintenance

### Backing Up Data
```bash
# Create database backup
docker-compose exec postgres pg_dump -U postgres escashop > backup.sql

# Restore database backup
docker-compose exec -T postgres psql -U postgres escashop < backup.sql
```

### Cleaning Up
```bash
# Remove unused images and volumes
docker system prune -a --volumes

# Remove specific project volumes
docker volume rm escashop_postgres_data
```

## Support

For additional support or issues:
1. Check the application logs using `docker-compose logs`
2. Verify all services are running with `docker-compose ps`
3. Check the main project README for application-specific documentation
