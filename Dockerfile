# Build stage
FROM node:20-alpine AS builder

# Accept version as build arg
ARG VERSION
ENV VERSION=${VERSION}

# Build React app
WORKDIR /app
COPY ./ui_src/package*.json ./ui_src/

WORKDIR /app/ui_src
RUN npm ci && npm cache clean --force
COPY ./ui_src/ .

RUN npm run build
RUN npm run generate-manifest

RUN echo $VERSION > /app/build-version.txt

# Production stage
FROM nginx:alpine AS production

# Copy built React app
COPY --from=builder /app/app /usr/share/nginx/html
COPY --from=builder /app/build-version.txt /usr/share/nginx/html/version.txt

# Copy static assets
COPY ./static/ /usr/share/nginx/html/

# Copy nginx config
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Add version label
ARG VERSION
LABEL version="${VERSION}"
LABEL maintainer="chris@watkinslabs.com"

# Expose port
EXPOSE 80

# Start nginx
CMD ["nginx", "-g", "daemon off;"]

# Init stage for uploading components
FROM alpine AS web_init

# Install dependencies for the upload script
RUN apk add --no-cache bash curl jq

# Copy upload script and make it executable
COPY --from=builder /app/ui_src/scripts/upload-components.sh /upload-components.sh
RUN chmod +x /upload-components.sh

# Copy the app with manifest
COPY --from=builder /app/app /app

# Add version label
ARG VERSION
LABEL version="${VERSION}"
LABEL maintainer="chris@watkinslabs.com"

# Start upload script
CMD ["/upload-components.sh", "--manifest", "/app/component-upload-manifest.json"]