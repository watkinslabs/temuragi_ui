#!/bin/bash
# build.sh - Docker build script with automatic version bumping

set -e  # Exit on error

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if wl_version_manager is installed
if ! command -v wl_version_manager &> /dev/null; then
    echo "Error: wl_version_manager not found. Install with: pip install wl_version_manager"
    exit 1
fi

# Parse arguments
BUMP_TYPE="patch"  # Default
NO_PUSH=false
NO_CACHE=false
BUILD_TARGET="all"  # all, static, react

while [[ $# -gt 0 ]]; do
    case $1 in
        --minor)
            BUMP_TYPE="minor"
            shift
            ;;
        --major)
            BUMP_TYPE="major"
            shift
            ;;
        --no-push)
            NO_PUSH=true
            shift
            ;;
        --no-cache)
            NO_CACHE=true
            shift
            ;;
        --static-only)
            BUILD_TARGET="static"
            shift
            ;;
        --react-only)
            BUILD_TARGET="react"
            shift
            ;;
        --help)
            echo "Usage: $0 [options]"
            echo "Options:"
            echo "  --minor        Bump minor version (default: patch)"
            echo "  --major        Bump major version (default: patch)"
            echo "  --no-push      Don't push to registry"
            echo "  --no-cache     Build without cache"
            echo "  --static-only  Only build static nginx image"
            echo "  --react-only   Only build react builder image"
            exit 0
            ;;
        *)
            echo "Unknown option: $1"
            exit 1
            ;;
    esac
done

# Get current version
OLD_VERSION=$(cat VERSION)

# Bump version
echo -e "${BLUE}Bumping $BUMP_TYPE version...${NC}"
wl_version_manager --update-package-json $BUMP_TYPE 

# Get new version
NEW_VERSION=$(cat VERSION)
echo -e "${GREEN}Version bumped: $OLD_VERSION → $NEW_VERSION${NC}"

# Docker image details
DOCKER_HUB_ORG="watkinslabs"
IMAGE_NAME_STATIC="temuragi_static"
IMAGE_NAME_REACT="temuragi_react"

# Build arguments
BUILD_ARGS=""
if [ "$NO_CACHE" = true ]; then
    BUILD_ARGS="--no-cache"
fi

# Build React builder image
if [ "$BUILD_TARGET" = "all" ] || [ "$BUILD_TARGET" = "react" ]; then
    echo -e "${BLUE}Building React builder image: $DOCKER_HUB_ORG/$IMAGE_NAME_REACT:$NEW_VERSION${NC}"
    docker build $BUILD_ARGS \
        --build-arg VERSION=$NEW_VERSION \
        --target builder \
        -t $DOCKER_HUB_ORG/$IMAGE_NAME_REACT:$NEW_VERSION \
        -t $DOCKER_HUB_ORG/$IMAGE_NAME_REACT:latest \
        .
fi

# Build static production image
if [ "$BUILD_TARGET" = "all" ] || [ "$BUILD_TARGET" = "static" ]; then
    echo -e "${BLUE}Building static production image: $DOCKER_HUB_ORG/$IMAGE_NAME_STATIC:$NEW_VERSION${NC}"
    docker build $BUILD_ARGS \
        --build-arg VERSION=$NEW_VERSION \
        --target production \
        -t $DOCKER_HUB_ORG/$IMAGE_NAME_STATIC:$NEW_VERSION \
        -t $DOCKER_HUB_ORG/$IMAGE_NAME_STATIC:latest \
        .
fi

# Push to Docker Hub (unless --no-push)
if [ "$NO_PUSH" = false ]; then
    echo -e "${BLUE}Pushing to Docker Hub...${NC}"
    
    # Login check
    if ! docker info 2>/dev/null | grep -q "Username"; then
        echo -e "${YELLOW}Not logged into Docker Hub. Please run: docker login${NC}"
        exit 1
    fi
    
    if [ "$BUILD_TARGET" = "all" ] || [ "$BUILD_TARGET" = "react" ]; then
        docker push $DOCKER_HUB_ORG/$IMAGE_NAME_REACT:$NEW_VERSION
        docker push $DOCKER_HUB_ORG/$IMAGE_NAME_REACT:latest
    fi
    
    if [ "$BUILD_TARGET" = "all" ] || [ "$BUILD_TARGET" = "static" ]; then
        docker push $DOCKER_HUB_ORG/$IMAGE_NAME_STATIC:$NEW_VERSION
        docker push $DOCKER_HUB_ORG/$IMAGE_NAME_STATIC:latest
    fi
    
    echo -e "${GREEN}Pushed successfully!${NC}"
else
    echo -e "${BLUE}Skipping push (--no-push specified)${NC}"
fi

# Commit version bump
echo -e "${BLUE}Committing version bump...${NC}"
git add VERSION ui_src/package.json
git commit -m "Bump version to $NEW_VERSION" || true

# Summary
echo -e "${GREEN}Build complete! Version $NEW_VERSION${NC}"
echo "Images built:"
if [ "$BUILD_TARGET" = "all" ] || [ "$BUILD_TARGET" = "react" ]; then
    echo "  - $DOCKER_HUB_ORG/$IMAGE_NAME_REACT:$NEW_VERSION (builder)"
fi
if [ "$BUILD_TARGET" = "all" ] || [ "$BUILD_TARGET" = "static" ]; then
    echo "  - $DOCKER_HUB_ORG/$IMAGE_NAME_STATIC:$NEW_VERSION (production)"
fi

echo ""
echo "To use the builder image:"
echo "  docker run -it $DOCKER_HUB_ORG/$IMAGE_NAME_REACT:$NEW_VERSION"
echo ""
echo "To run the production site:"
echo "  docker run -p 8080:80 $DOCKER_HUB_ORG/$IMAGE_NAME_STATIC:$NEW_VERSION"