# ===========================================
# Dockerfile Ordering Principle
# ===========================================

# This is a rule we'll follow in almost every Dockerfile:
# Put the least frequently changing instructions first.
# Put the most frequently changing instructions last.

# ===========================================
# STEP 1 : Choose the base Image
# ===========================================

# FROM node:24  
# Size: ~1 GB (can vary by release), 
# Contains:Node.js, npm, Debian, Many utilities, Good for beginners.Not ideal for production because it's larger than necessary.

# FROM node:24-alpine
# Size: Very Smaller. Contains:Node.js, npm, apline linux, 
# Advantages:Small downloads, Fast startup, Smaller images
# Disadvantages:Some native Node packages need extra Alpine-specific libraries or build tools.

#Which One Should We Choose? ===>>> Look at our dependencies.
# We have:sharp,bcrypt, fluent-ffmpeg, ffmpeg-static, pdf-parse, mammoth
# These are native or binary-dependent packages.
# They sometimes require additional compatibility work on Alpine.
# For a reusable backend template where we want predictable builds and easier troubleshooting,

FROM node:24-slim
# Size: Smaller. Contains:Node.js, npm, Minimal Debian, A good balance. recomended to use for our case.

# ===========================================
# STEP 2 : Set the working directory
# ===========================================

# Docker Questions: Does /app already exist? ===>>>No. Docker creates it automatically if it doesn't exist.
WORKDIR /app

# Why /app? Could we write: "WORKDIR /server" => Yes. Or: "WORKDIR /hello" Also yes. Docker doesn't care.The convention is simply: "/app" because it's short, clear, and widely recognized.

# Every following instruction now runs inside /app unless we change the working directory.

# ===========================================
# STEP 3 : Copy package.json file
# ===========================================

# Many beginners do this: "COPY . ." ===>>>  It works... But it's slow. Instead, we'll do: "COPY package*.json ./"
COPY package*.json ./

# Why only these files? ===>>> Because Docker caches layers. Let's understand that.

# Docker Builds in Layers, Each Dockerfile instruction creates a new layer.
# Example: FROM node:24-slim -> Layer 1 -> WORKDIR /app -> Layer 2 -> COPY package*.json ./ -> Layer 3 -> RUN npm install -> Layer 4 -> COPY . . -> Layer 5 -> Docker reuses unchanged layers to make future builds much faster.

# Why Copy package.json First? We edit: "server.js" ===>>> Did package.json change? ===>>> No.
# So Docker can reuse the cached dependency installation layer instead of running npm install again.
# If you copied everything before installing dependencies: "COPY . . && RUN npm install"
# Then changing any file would invalidate the cache and reinstall all packages.
# That's why professionals separate these steps.

# ===========================================
# STEP 4 : Install all Dependencies
# ===========================================

RUN npm install --include=dev \
    && npm cache clean --force

# Docker executes this inside the image. At this point, only package.json and package-lock.json have been copied.The resulting node_modules are built for Linux, which is exactly what we want. npm stores cache. and cache clean to reduce the size of the image.And --include=dev make it feature proof

# npm install or npm ci? ===>>> For development, npm install is fine. For production, we'll later switch to:
# RUN npm ci
# This is faster because it installs exactly what's in package-lock.json and is more suitable for reproducible builds.

# =========================================== 
# STEP 5 : Copy the rest of the application code or source code
# ===========================================

COPY . .

# Thanks to .dockerignore, Docker skips files like:node_modules, .env, uploads, logs, etc. Only the necessary source files are copied.

# ===========================================
# STEP 6 : Expose the port
# ===========================================

EXPOSE 5000

#EXPOSE does not publish the port. It simply tells anyone reading the image: "This application expects to listen on port 3000." Actual port publishing happens later in Compose.

# ===========================================
# STEP 7 : Start the application
# ===========================================

CMD ["npm", "run", "dev"]

# Why? Because your package.json contains:
# {
#   "scripts": {
#     "dev": "nodemon server.js"
#   }
# }
# So the container starts with nodemon, giving us automatic restarts when files change.

# ===========================================
# What Happens During docker build?
# ===========================================

# ===========================================
# FROM node:24-slim
#         │
#         ▼
# Create Linux image
#         │
#         ▼
# WORKDIR /app
#         │
#         ▼
# Create /app
#         │
#         ▼
# COPY package*.json
#         │
#         ▼
# RUN npm install
#         │
#         ▼
# COPY . .
#         │
#         ▼
# EXPOSE 3000
#         │
#         ▼
# Save image
# ===========================================

# Nothing starts yet. This only creates the image. The application starts later when a container is created from that image.


# Our First Docker Workflow
# From now on, this will usually be our daily workflow:

# cd server
# docker compose up --build

# The --build flag tells Docker to rebuild the image if necessary before starting the containers.
# When we're done working:

# docker compose down