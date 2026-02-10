# Install Tooltip Package in Docker

I've added `@radix-ui/react-tooltip` to your `apps/frontend/package.json`.

Now you need to rebuild your Docker container to install it:

## Option 1: Rebuild the frontend container (Recommended - Faster)

```bash
docker-compose up -d --build frontend
```

This will rebuild only the frontend container and restart it.

## Option 2: Rebuild all containers

```bash
docker-compose down
docker-compose up -d --build
```

This will rebuild all containers (takes longer).

## Option 3: Install inside running container (Quick test - not persistent)

```bash
docker-compose exec frontend npm install
```

This installs in the running container but won't persist if you restart. Use Option 1 for permanent fix.

## Verify Installation

After rebuilding, check if the package is installed:

```bash
docker-compose exec frontend npm list @radix-ui/react-tooltip
```

You should see: `@radix-ui/react-tooltip@1.0.7`

## If you still see errors:

1. Make sure the container rebuilt successfully
2. Check logs: `docker-compose logs frontend`
3. Restart the container: `docker-compose restart frontend`

The tooltip feature will work once the package is installed!
