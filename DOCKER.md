# ReadAI Docker Setup

This directory contains Docker configuration for running ReadAI with both backend and frontend services.

## Prerequisites

- Docker and Docker Compose installed
- `.env` files configured in backend and frontend directories

## Quick Start

### Production Mode
```bash
# Build and start all services
docker-compose up --build

# Run in background
docker-compose up -d --build

# Stop services
docker-compose down
```

### Development Mode (with hot reload)
```bash
# Start development environment
docker-compose -f docker-compose.dev.yml up --build

# Run in background
docker-compose -f docker-compose.dev.yml up -d --build

# Stop development services
docker-compose -f docker-compose.dev.yml down
```

## Service URLs

### Production Mode
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:3001/api
- **Health Check**: http://localhost:3001/api/health

### Development Mode
- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:3001/api
- **Health Check**: http://localhost:3001/api/health

## Environment Variables

Make sure you have the following files:

### Backend (.env)
```bash
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_KEY=your_service_key
GEMINI_API_KEY=your_gemini_key
```

### Frontend (.env) - Optional
```bash
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_anon_key
VITE_API_URL=http://localhost:3001/api
```

## Docker Commands

### View logs
```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f backend
docker-compose logs -f frontend
```

### Rebuild specific service
```bash
docker-compose up --build backend
docker-compose up --build frontend
```

### Execute commands in containers
```bash
# Access backend container
docker-compose exec backend sh

# Access frontend container
docker-compose exec frontend sh
```

### Clean up
```bash
# Remove containers and networks
docker-compose down

# Remove containers, networks, and volumes
docker-compose down -v

# Remove everything including images
docker-compose down --rmi all -v
```

## Production Deployment

For production deployment, consider:

1. **Environment-specific configurations**
2. **SSL/TLS certificates**
3. **Reverse proxy (nginx)**
4. **Health monitoring**
5. **Log aggregation**
6. **Backup strategies**

## Troubleshooting

### Common Issues

1. **Port conflicts**: Make sure ports 3000, 3001, and 5173 are available
2. **Environment variables**: Ensure all required .env files exist
3. **Docker permissions**: Make sure Docker daemon is running
4. **Build failures**: Check Docker logs for specific error messages

### Debugging

```bash
# Check container status
docker-compose ps

# View detailed logs
docker-compose logs --details

# Inspect container
docker inspect readai-backend
docker inspect readai-frontend
```
