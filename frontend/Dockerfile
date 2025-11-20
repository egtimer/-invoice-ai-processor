# Multi-stage Dockerfile for Invoice AI Processor Frontend
# Stage 1: Build the React application
# Stage 2: Serve the built files with Nginx

# ============================================
# Stage 1: Build Stage
# ============================================
# Use Node.js 20 on Alpine Linux as the base image for building
# Alpine is a minimal Linux distribution that results in smaller images
FROM node:20-alpine AS builder

# Set working directory for the build
WORKDIR /app

# Copy package files first for better Docker layer caching
# If these files don't change, Docker will reuse the cached layer
# and skip reinstalling dependencies on subsequent builds
COPY package.json package-lock.json ./

# Install all dependencies including devDependencies
# npm ci is preferred over npm install because it's faster and more reliable
# It installs exact versions from package-lock.json ensuring reproducible builds
RUN npm ci

# Copy the rest of the application source code
# This includes src/, public/, index.html, and config files
COPY . .

# Build the React application for production
# Vite will compile, optimize, and bundle all code into static files
# Output will be in the /app/dist directory
RUN npm run build

# ============================================
# Stage 2: Production Stage
# ============================================
# Use official Nginx Alpine image for serving static files
# This is a clean, minimal image containing only Nginx
FROM nginx:alpine

# Copy built files from the builder stage to Nginx's web root
# --from=builder specifies we're copying from the first stage
# /app/dist is where Vite outputs the built files
# /usr/share/nginx/html is Nginx's default document root
COPY --from=builder /app/dist /usr/share/nginx/html

# Create custom Nginx configuration for React single-page application
# This configuration ensures that all routes are handled by index.html
# which is necessary for React Router to work correctly
RUN echo 'server {' > /etc/nginx/conf.d/default.conf && \
    echo '    listen 80;' >> /etc/nginx/conf.d/default.conf && \
    echo '    server_name localhost;' >> /etc/nginx/conf.d/default.conf && \
    echo '    root /usr/share/nginx/html;' >> /etc/nginx/conf.d/default.conf && \
    echo '    index index.html;' >> /etc/nginx/conf.d/default.conf && \
    echo '' >> /etc/nginx/conf.d/default.conf && \
    echo '    # Enable gzip compression for better performance' >> /etc/nginx/conf.d/default.conf && \
    echo '    gzip on;' >> /etc/nginx/conf.d/default.conf && \
    echo '    gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript;' >> /etc/nginx/conf.d/default.conf && \
    echo '' >> /etc/nginx/conf.d/default.conf && \
    echo '    # SPA routing - all requests should serve index.html' >> /etc/nginx/conf.d/default.conf && \
    echo '    location / {' >> /etc/nginx/conf.d/default.conf && \
    echo '        try_files $uri $uri/ /index.html;' >> /etc/nginx/conf.d/default.conf && \
    echo '    }' >> /etc/nginx/conf.d/default.conf && \
    echo '}' >> /etc/nginx/conf.d/default.conf

# Expose port 80 where Nginx will listen
# This is documentation for other developers
EXPOSE 80

# Nginx starts automatically when the container runs
# The default CMD from the nginx:alpine image is sufficient
# It starts Nginx in the foreground so the container stays running
