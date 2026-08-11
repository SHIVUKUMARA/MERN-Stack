# ==========================================================
# Production Nginx Image
# ==========================================================

# Uses the lightweight official Nginx Alpine image.
FROM nginx:alpine

# The official image contains a default website configuration. We don't want that. We're going to provide our own reverse-proxy configuration.
RUN rm /etc/nginx/conf.d/default.conf

# Copy our main Nginx configuration
COPY docker/production/nginx/nginx.conf /etc/nginx/nginx.conf

# Copy our server configuration
COPY docker/production/nginx/conf.d/ /etc/nginx/conf.d/

# Nginx listens on port 80
EXPOSE 80

# The resulting architecture will be:
# Browser
#    │
#    │ :80
#    ▼
# ┌──────────────┐
# │    Nginx     │
# └──────┬───────┘
#        │
#        │ :5000
#        ▼
# ┌──────────────┐
# │   Backend    │
# └──────┬───────┘
#        │
#        ▼
#    MongoDB