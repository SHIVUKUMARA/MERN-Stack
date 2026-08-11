# Development Docker Image
# Use Node.js 24 LTS as the base image
FROM node:24   
# We're using the official Node.js image. This image already contains:Linux,Node.js,npm, No installation required.

# Set working directory
WORKDIR /app 
# Inside the container: Everything happens inside /app

# Copy package.json and package-lock.json or dependencies file
COPY package*.json ./
# This copies:package.json,package-lock.json, into /app
# Why first? Because dependency files change less frequently than source code, allowing Docker to reuse the cached npm install layer.

# Install dependencies
RUN npm install
# Installs all dependencies into Linux. Remember: These are Linux packages, not Windows packages.

# Copy the rest of the application files
COPY . .
# Now copy the remaining source code. This order preserves Docker's build cache.

# Expose the port the app runs on
EXPOSE 5000
# Documentation for anyone using the image. It indicates the application listens on port 5000.

# Start the development server
CMD ["npm", "run", "dev"]
# Runs: npm run dev , which starts Nodemon according to your package.json.

# Why aren't we creating a non-root user?
# Because this is a development image.Developer convenience is more important than hardening.
# We'll create a dedicated non-root user in the production Dockerfile.

# Why aren't we using a slim image?
# Again,
# Development prioritizes:
# faster package compatibility
# easier debugging
# convenience

# Production prioritizes:
# small size
# security
# reduced attack surface

# Different goals.


# To Run this: cd server/
#  docker build -f docker/development/Dockerfile -t backend-dev .

# docker build -> Means: Build an image.
# -f docker/development/Dockerfile -> Means: The Dockerfile is located here.Notice this does not decide what files Docker can access.It only tells Docker which Dockerfile to read.
# -t backend-dev -> Means: Name the image backend-dev
# The . means: Use the current directory as the build context