---
title: "Taming Your First Docker Build in 5 Minutes"
date: 2025-05-23
tags: [docker, devops, cicd, tutorial]
description: "Ever wished your app just worked on every machine? Docker gives you consistent, isolated environments — no more 'it works on my machine' drama."
---

Ever wished your app "just worked" on every machine? Docker gives you consistent, isolated environments — no more "it works on my machine" drama. In this hands-on guide, you'll go from zero to a running container in five minutes flat.
{: .post-lede}

---

## Prerequisites

- Docker Desktop (macOS/Windows) or Docker Engine (Linux) installed
- A simple sample app. We'll use a minimal ASP.NET Core "Hello World" API, but you can swap in Node.js or static files.

```bash
# Check you have Docker:
docker --version
```

---

## Crafting Your Dockerfile

Create a file named `Dockerfile` in your project root:

```dockerfile
# 1. Base runtime image
FROM mcr.microsoft.com/dotnet/aspnet:7.0 AS base
WORKDIR /app
EXPOSE 80

# 2. Build stage
FROM mcr.microsoft.com/dotnet/sdk:7.0 AS build
WORKDIR /src
COPY *.csproj .
RUN dotnet restore
COPY . .
RUN dotnet publish -c Release -o /app/publish

# 3. Final image
FROM base AS final
WORKDIR /app
COPY --from=build /app/publish .
ENTRYPOINT ["dotnet", "MyApp.dll"]
```

> **tip** Replace `MyApp.dll` with your project's DLL name.

---

## Building the Image

```bash
docker build -t my-hello-app .
```

- `-t my-hello-app` tags your image
- `.` tells Docker to use the current folder as the build context
- You'll see logs of each layer being built and cached

---

## Running & Testing

Start your container and map port 80 → 8080:

```bash
docker run --rm -p 8080:80 my-hello-app
```

- `--rm` cleans up the container when you stop it
- Navigate to `http://localhost:8080` or run:

```bash
curl http://localhost:8080
```

---

## Quick Wins & Optimizations

**`.dockerignore`** — keep your build context lean:

```
bin/
obj/
.vs/
```

**Layer caching** — put infrequently changing instructions (e.g., `RUN dotnet restore`) early so Docker can cache them.

**Multi-stage builds** — keeps the final image slim. The example above already uses one.

---

## Understanding the Container Lifecycle

Docker containers transition through well-defined states. Knowing these helps you manage, debug, and automate effectively.

| State | What it means |
|-------|---------------|
| Created | Container exists, not running |
| Running | Main process is executing |
| Paused | Process temporarily frozen |
| Exited | Process finished or crashed |
| Removed | Container deleted |

### Common lifecycle commands

```bash
# List all containers (running + stopped)
docker ps -a

# Start a stopped container
docker start <container_id>

# Stop gracefully
docker stop <container_id>

# Force restart
docker restart <container_id>

# Remove
docker rm <container_id>

# Pause / unpause
docker pause <container_id>
docker unpause <container_id>
```

Why it matters:

- **CI/CD automation** — detect "Exited" states to trigger alerts or restarts
- **Resource cleanup** — proactively remove unused containers to free disk space
- **Debugging** — start a crashed container interactively to inspect logs or shell in

---

## Troubleshooting Tips

```bash
# Verbose build output
docker build --progress=plain .

# Shell into a running or broken image
docker run --rm -it my-hello-app /bin/bash
```

Common pitfalls: wrong file paths, missing dependencies, port mismatches.

---

## Next Steps

```bash
# Scan for vulnerabilities
docker scout cves my-hello-app

# Tag and push to a registry
docker tag my-hello-app myregistry/my-hello-app:v1.0
docker push myregistry/my-hello-app:v1.0
```

From here: automate with GitHub Actions — integrate `docker build` and `docker push` on every PR.

---

## Additional Resources

- [Docker Official Docs — Get Started](https://docs.docker.com/get-started/)
- [Dockerfile Best Practices](https://docs.docker.com/engine/reference/builder/)
- [Docker Curriculum by Prakhar Srivastav](https://docker-curriculum.com/)
- [Play with Docker — in-browser playground](https://labs.play-with-docker.com/)
