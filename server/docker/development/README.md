# Docker Development Environment

This directory contains the Docker configuration used for local backend development.

The goal is to provide a consistent development environment where every developer runs the application in the same way without installing MongoDB or other services directly on the host machine.

---

# Folder Structure

```text
docker/
└── development/
    ├── Dockerfile
    ├── compose.yaml
    ├── .env
    └── README.md
```

---

# Prerequisites

Before running the development environment, make sure you have:

- Docker Desktop
- Docker Compose (included with Docker Desktop)
- Git

Verify installation:

```bash
docker --version
docker compose version
```

---

# Services

| Service | Port  | Description      |
| ------- | ----- | ---------------- |
| Backend | 5000  | Express.js API   |
| MongoDB | 27017 | MongoDB Database |

Redis will be added later.

---

# Build & Start

Run from the project root (`server/`).

Foreground mode:

```bash
docker compose --env-file docker/development/.env -f docker/development/compose.yaml up --build
```

Detached mode:

```bash
docker compose --env-file docker/development/.env -f docker/development/compose.yaml up --build -d
```

---

# Stop Containers

```bash
docker compose --env-file docker/development/.env -f docker/development/compose.yaml down
```

---

# Stop & Remove Volumes

**Warning:** This deletes MongoDB data.

```bash
docker compose --env-file docker/development/.env -f docker/development/compose.yaml down -v
```

---

# Rebuild Images

```bash
docker compose --env-file docker/development/.env -f docker/development/compose.yaml up --build
```

---

# Restart Services

```bash
docker compose --env-file docker/development/.env -f docker/development/compose.yaml restart
```

Restart only backend:

```bash
docker compose --env-file docker/development/.env -f docker/development/compose.yaml restart backend
```

---

# View Running Containers

```bash
docker ps
```

All containers:

```bash
docker ps -a
```

---

# View Logs

All services:

```bash
docker compose --env-file docker/development/.env -f docker/development/compose.yaml logs -f
```

Backend only:

```bash
docker compose --env-file docker/development/.env -f docker/development/compose.yaml logs -f backend
```

MongoDB only:

```bash
docker compose --env-file docker/development/.env -f docker/development/compose.yaml logs -f mongodb
```

---

# Execute Commands Inside Containers

Open backend shell:

```bash
docker exec -it backend-dev sh
```

Open Mongo shell:

```bash
docker exec -it mongodb mongosh
```

---

# Check Container Health

```bash
docker ps
```

Inspect backend:

```bash
docker inspect backend-dev
```

Inspect MongoDB:

```bash
docker inspect mongodb
```

---

# Volumes

List volumes:

```bash
docker volume ls
```

Inspect Mongo volume:

```bash
docker volume inspect backend-dev_mongo-data
```

Remove unused volumes:

```bash
docker volume prune
```

---

# Networks

List networks:

```bash
docker network ls
```

Inspect Compose network:

```bash
docker network inspect backend-dev_default
```

---

# Images

List images:

```bash
docker images
```

Remove backend image:

```bash
docker rmi backend-dev
```

---

# Cleanup

Remove stopped containers:

```bash
docker container prune
```

Remove unused images:

```bash
docker image prune
```

Remove unused networks:

```bash
docker network prune
```

Remove unused volumes:

```bash
docker volume prune
```

Remove everything unused:

```bash
docker system prune
```

Remove everything including images and volumes:

```bash
docker system prune -a --volumes
```

---

# Troubleshooting

## Backend doesn't start

Check logs:

```bash
docker compose --env-file docker/development/.env -f docker/development/compose.yaml logs -f backend
```

---

## MongoDB isn't healthy

Check Mongo logs:

```bash
docker compose --env-file docker/development/.env -f docker/development/compose.yaml logs -f mongodb
```

---

## Rebuild Everything

```bash
docker compose --env-file docker/development/.env -f docker/development/compose.yaml down -v
```

```bash
docker compose --env-file docker/development/.env -f docker/development/compose.yaml up --build
```

## Nuclear Cleanup

**Warning:** This deletes MongoDB data.

```bash
docker system prune -a --volumes
```

This removes:

✅ All stopped containers
✅ All unused images
✅ All unused networks
✅ All unused volumes
✅ Build cache

After this, the next docker compose up --build will download MongoDB again and rebuild our backend image from scratch.

---

# Development Notes

- Source code is mounted using a bind mount for hot reload.
- `node_modules` is stored in a Docker-managed volume to preserve Linux dependencies.
- MongoDB data is stored in a named volume.
- Containers communicate using the default Docker Compose network.
- The backend connects to MongoDB using the service name (`mongodb`), **not** `localhost`.
- Redis will be added after backend integration.
- Production uses a separate Docker configuration.
