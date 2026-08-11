# ==========================================================
# Stage 1 - Install Dependencies
# ==========================================================
FROM node:24-bookworm-slim AS dependencies

# In Development: `FROM node:24` ===>>> Why change?
# Development priorities: Easy compatibility, Faster builds, Debugging
# Production priorities: Smaller image, Fewer packages, Smaller attack surface
# Why bookworm-slim? ==>> Docker provides several Node images. Example:node:24, contains almost everything.
# node:24-bookworm ==>> Debian Bookworm.
# node:24-bookworm-slim ==>>Bookworm with unnecessary packages removed.
# Typical sizes: node:24 ≈ 1.1 GB, bookworm ≈ 450 MB, bookworm-slim ≈ 180 MB
# Huge difference.
# Smaller image means: faster downloads, faster deployment, smaller registry storage

# Why `AS dependencies`? `FROM node:24-bookworm-slim AS dependencies` ===>>> means : Build one temporary image called dependencies.
# Later we'll say: COPY --from=dependencies , and copy only what we need.This is called a multi-stage build. We'll expand it later.

WORKDIR /app  
# Same as development. No Difference

COPY package*.json ./  
# Same as development. No Difference

RUN npm ci --omit=dev
#  Why npm ci? => 
# Development: npm install
# Production: npm ci
# Difference: 
# npm install => modifies package-lock, resolves versions, slower
# npm ci => requires package-lock, installs exactly what's locked, faster, reproducible
# Professional deployments almost always use: npm ci

# Why --omit=dev? ==>> Development installs:nodemon, eslint, prettier, ...
# Production doesn't need them.Only runtime packages.That reduces image size.

# ==========================================================
# Stage 2 - Runtime Image
# ==========================================================
FROM node:24-bookworm-slim 
# New image.Fresh start.Nothing from Stage 1 exists unless we copy it.

WORKDIR /app

ENV NODE_ENV=production
# Why? ==>> Because the image itself is a production image. Many libraries change behavior automatically.
# Example === >> Express: app.get("env") ==>> returns "production"

COPY --from=dependencies --chown=node:node /app/node_modules ./node_modules
# Instead of running `npm ci`, again... We reuse the installed packages. Very fast.
# --chown=node:node ===>>> Copy production dependencies and assign ownership to the non-root node user.

COPY --chown=node:node . .
# Same idea as development. But remember..., Production has: `.dockerignore`, 
# So it does not copy:.git, docker/, docs/, uploads/, node_modules/, Only the application code ends up in the image.
# --chown=node:node . .  ==>> Copy application source code and assign ownership to the non-root node user.

RUN mkdir -p uploads logs && chown -R node:node uploads logs
# Create directories that the application may write to like uploads, logs etc...
# These are runtime directories, not application source.

# Run the application as the non-root "node" user.
USER node  
# We are not giving root user permissions. Instead we are giving node user permissions as much as required for the application.

EXPOSE 5000

HEALTHCHECK --interval=30s --timeout=3s --start-period=20s --retries=3 \
    CMD node -e "require('http').get('http://127.0.0.1:5000/health/ready', res => process.exit(res.statusCode === 200 ? 0 : 1)).once('error', () => process.exit(1))"
# node -e means: Execute this JavaScript directly without creating a .js file.
# require('http') ===>>> Node already has a built-in HTTP module. We don't need:curl, wget, axios.
# http.get("http://127.0.0.1:5000/health", ...) =========  The container asks its own backend
# --interval=30s ===>>> Docker checks every: 30 seconds
# --timeout=3s ===>>> Each check has at most: 3 seconds
# --start-period=20s ===>>> Wait at least: 20 seconds before checking
# --retries=3 ===>>> Retry: 3 times if the check fails docker healthcheck fails and mark as unhealthy

CMD ["node", "server.js"]

# Development:npm run dev => Nodemon => Hot reload
# Production: node server.js
# No watcher. No polling. Less RAM. Less CPU. Faster startup.





# =====================================================
# Explanation
# =====================================================

# In development, we deliberately kept things simple:
# FROM node:24 ==>>> and we allowed the application to run as the default user.
# For production, we want:
# Container
#    │
#    └── Node.js application
#           │
#           └── non-root user
# instead of:
# Container
#    │
#    └── root
#           │
#           └── Node.js application
# Why does this matter?
# If Node is running as root, the attacker gets root privileges inside the container.
# If Node is running as an unprivileged user, the attacker's capabilities are much more limited.
# Docker containers are already isolated, but container isolation should not be your only security boundary.
# This is called principle of least privilege:Give the application only the permissions it actually needs.

# Does Node already provide a non-root user? ==>> Yes.
# The official Node image includes a user called: node
# So we don't actually need to create our own Linux user for this particular Dockerfile.

# We used permission as : USER node
# But there's a problem with File ownership
# Consider this: `COPY . .`
# By default, files copied into the image are owned by: `root`
# Our application will then run as: `node`
# So we could end up with:
# /app
# │
# ├── server.js          root
# ├── controllers/       root
# ├── services/          root
# ├── node_modules/      node/root depending on stage
# └── ...
# For an application that only reads its source code, this is usually fine.
# But your application also has to write user uploaded files and track runtime logs: uploads/, logs/
# So we need to think about ownership carefully.
# But we're ignoring uploads/ and logs/

# Remember our .dockerignore:
# uploads/
# logs/

# Therefore they aren't copied into the production image. That's actually good.
# Production runtime data should not be baked into the image.
# Instead we'll eventually use:
# Container
#    │
#    ├── application code
#    │
#    ├── uploads ───────► persistent volume
#    │
#    └── logs ──────────► logging system / volume

# We'll handle this properly when we build the production Compose file.