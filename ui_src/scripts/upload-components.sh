#!/bin/bash

# Exit on error
set -e

# Default values
MANIFEST_FILE="component-upload-manifest.json"
API_HOST="${TEMURAGI_API_BASE:-localhost}"
API_PORT="${TEMURAGI_API_PORT:-5050}"
DRY_RUN=0
FILTER_TYPE=""
FILTER_NAME=""

# Construct full API URL
if [[ "$API_HOST" =~ ^https?:// ]]; then
    # If it's already a full URL, use as-is
    API_BASE="$API_HOST"
else
    # Otherwise, construct the URL
    API_BASE="http://${API_HOST}:${API_PORT}"
fi

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --manifest)
            MANIFEST_FILE="$2"
            shift 2
            ;;
        --api-base)
            API_BASE="$2"
            shift 2
            ;;
        --dry-run)
            DRY_RUN=1
            shift
            ;;
        --filter-type)
            FILTER_TYPE="$2"
            shift 2
            ;;
        --filter-name)
            FILTER_NAME="$2"
            shift 2
            ;;
        --help)
            echo "Usage: $0 [options]"
            echo "Options:"
            echo "  --manifest FILE     Path to manifest file (default: component-upload-manifest.json)"
            echo "  --api-base URL      API base URL (overrides environment variable)"
            echo "  --dry-run           Show what would be uploaded without actually uploading"
            echo "  --filter-type TYPE  Only upload components of this type (page|user_module|component)"
            echo "  --filter-name NAME  Only upload components matching this name pattern"
            echo ""
            echo "Environment variables:"
            echo "  TEMURAGI_API_BASE    API hostname or base URL"
            echo "  TEMURAGI_API_PORT    API port (default: 5050)"
            echo "  TEMURAGI_INIT_TOKEN  API authentication token (required)"
            exit 0
            ;;
        *)
            echo "Unknown option: $1"
            exit 1
            ;;
    esac
done

# Check for required tools
for cmd in jq curl; do
    if ! command -v $cmd &> /dev/null; then
        echo -e "${RED}ERROR: $cmd is required but not installed${NC}"
        exit 1
    fi
done

# Validate API token
if [ -z "$TEMURAGI_INIT_TOKEN" ]; then
    echo -e "${RED}ERROR: TEMURAGI_INIT_TOKEN environment variable is required${NC}"
    echo "Usage: TEMURAGI_INIT_TOKEN='your-token' $0"
    exit 1
fi

# Clean up API_BASE
API_BASE="${API_BASE%/}"  # Remove trailing slash

# Add protocol if missing
if [[ ! "$API_BASE" =~ ^https?:// ]]; then
    echo -e "${YELLOW}WARNING: API_BASE missing protocol, adding http://${NC}"
    API_BASE="http://$API_BASE"
fi

echo "=== COMPONENT UPLOAD START ==="
echo "TEMURAGI_API_BASE: $API_HOST"
echo "TEMURAGI_API_PORT: $API_PORT"
echo "Full API URL: $API_BASE"
echo "TEMURAGI_INIT_TOKEN: ${TEMURAGI_INIT_TOKEN:0:8}..."

# Find manifest file
if [ ! -f "$MANIFEST_FILE" ]; then
    # Search in common locations
    for path in "app/$MANIFEST_FILE" "../app/$MANIFEST_FILE" "../../app/$MANIFEST_FILE"; do
        if [ -f "$path" ]; then
            MANIFEST_FILE="$path"
            break
        fi
    done
fi

if [ ! -f "$MANIFEST_FILE" ]; then
    echo -e "${RED}ERROR: Cannot find manifest file: $MANIFEST_FILE${NC}"
    exit 1
fi

echo "Manifest: $MANIFEST_FILE"

# Determine app directory from manifest location
APP_DIR=$(dirname "$(readlink -f "$MANIFEST_FILE")")
echo "App directory: $APP_DIR"

# Verify some bundle files exist
echo -e "\nVerifying bundle files exist..."
FIRST_BUNDLE=$(jq -r '.components[0].bundle_path // empty' "$MANIFEST_FILE")
if [ -n "$FIRST_BUNDLE" ]; then
    if [ -f "$APP_DIR/$FIRST_BUNDLE" ]; then
        echo -e "  ${GREEN}✓ Found bundle: $APP_DIR/$FIRST_BUNDLE${NC}"
    else
        echo -e "  ${RED}✗ Bundle not found: $APP_DIR/$FIRST_BUNDLE${NC}"
        echo "  Directory contents:"
        ls -la "$APP_DIR" | head -10
    fi
fi

# Test connectivity
if [ $DRY_RUN -eq 0 ]; then
    echo -e "\nTesting connectivity to $API_BASE..."
    if curl -s -f -m 5 "$API_BASE" > /dev/null 2>&1; then
        echo -e "  ${GREEN}✓ Connected successfully${NC}"
    else
        echo -e "  ${RED}✗ Connection failed - server not reachable${NC}"
        echo -e "${RED}ERROR: Cannot connect to API server${NC}"
        echo "Please check if the server is running at $API_BASE"
        exit 1
    fi
fi

# Parse manifest
GENERATED_AT=$(jq -r '.generated_at' "$MANIFEST_FILE")
TOTAL_COMPONENTS=$(jq -r '.components | length' "$MANIFEST_FILE")

echo -e "\nManifest generated: $GENERATED_AT"
echo "Total components: $TOTAL_COMPONENTS"

# Apply filters
JQ_FILTER=".components"

if [ -n "$FILTER_TYPE" ]; then
    JQ_FILTER="$JQ_FILTER | map(select(.component_type == \"$FILTER_TYPE\"))"
    echo "Filtered to $FILTER_TYPE"
fi

if [ -n "$FILTER_NAME" ]; then
    JQ_FILTER="$JQ_FILTER | map(select(.name | ascii_downcase | contains(\"${FILTER_NAME,,}\")))"
    echo "Filtered by name '$FILTER_NAME'"
fi

# Get filtered components
COMPONENTS=$(jq -c "$JQ_FILTER | .[]" "$MANIFEST_FILE")
COMPONENT_COUNT=$(echo "$COMPONENTS" | grep -c . || true)

if [ $COMPONENT_COUNT -eq 0 ]; then
    echo "No components to upload after filtering"
    exit 0
fi

echo -e "\nProcessing $COMPONENT_COUNT components..."

# Counters
SUCCESS_COUNT=0
ERROR_COUNT=0
CURRENT=0

# Process each component
while IFS= read -r component; do
    CURRENT=$((CURRENT + 1))
    
    # Extract component details
    NAME=$(echo "$component" | jq -r '.name')
    TYPE=$(echo "$component" | jq -r '.component_type')
    ROUTES=$(echo "$component" | jq -r '.routes | join(", ")')
    BUNDLE_PATH=$(echo "$component" | jq -r '.bundle_path')
    FILE_SIZE=$(echo "$component" | jq -r '.file_size')
    VERSION=$(echo "$component" | jq -r '.version')
    DESCRIPTION=$(echo "$component" | jq -r '.description')
    
    echo -e "\n[$CURRENT/$COMPONENT_COUNT] $NAME ($TYPE)"
    echo "  Routes: $ROUTES"
    echo "  Bundle: $BUNDLE_PATH ($FILE_SIZE bytes)"
    
    if [ $DRY_RUN -eq 1 ]; then
        echo "  [DRY RUN] Would upload this component"
        SUCCESS_COUNT=$((SUCCESS_COUNT + 1))
        continue
    fi
    
    # Check if bundle file exists
    FULL_BUNDLE_PATH="$APP_DIR/$BUNDLE_PATH"
    if [ ! -f "$FULL_BUNDLE_PATH" ]; then
        echo -e "  ${RED}✗ Bundle file not found: $FULL_BUNDLE_PATH${NC}"
        echo "  Looking for file at: $(realpath "$FULL_BUNDLE_PATH" 2>/dev/null || echo "$FULL_BUNDLE_PATH")"
        echo "  App directory contents:"
        find "$APP_DIR" -name "*.js" -type f | head -20
        ERROR_COUNT=$((ERROR_COUNT + 1))
        continue
    fi
    
    # Read bundle content and save to temp file for large files
    TEMP_BUNDLE=$(mktemp)
    TEMP_PAYLOAD=$(mktemp)
    
    # Copy bundle to temp file
    cp "$FULL_BUNDLE_PATH" "$TEMP_BUNDLE"
    
    # Create the payload using files instead of variables
    jq -n \
        --arg name "$NAME" \
        --arg version "$VERSION" \
        --arg description "$DESCRIPTION" \
        --argjson routes "$(echo "$component" | jq '.routes')" \
        --arg component_type "$TYPE" \
        --arg uploaded_at "$(date -u +"%Y-%m-%dT%H:%M:%S.000Z")" \
        --arg build_timestamp "$(date +%s)000" \
        --rawfile compiled_code "$TEMP_BUNDLE" \
        '{
            name: $name,
            source_code: "",
            compiled_code: $compiled_code,
            version: $version,
            description: $description,
            routes: $routes,
            component_type: $component_type,
            force_update: true,
            uploaded_at: $uploaded_at,
            build_timestamp: ($build_timestamp | tonumber)
        }' > "$TEMP_PAYLOAD"
    
    # Upload the component
    echo "  Uploading to $API_BASE/v2/api/components/sync..."
    
    RESPONSE=$(curl -s -w "\n%{http_code}" -X POST \
        -H "Authorization: Bearer $TEMURAGI_INIT_TOKEN" \
        -H "Content-Type: application/json" \
        -H "X-Internal-Request: true" \
        -H "X-Source: temuragi-web-init" \
        -d "@$TEMP_PAYLOAD" \
        "$API_BASE/v2/api/components/sync" 2>&1 || true)
    
    # Clean up temp files
    rm -f "$TEMP_BUNDLE" "$TEMP_PAYLOAD"
    
    HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
    BODY=$(echo "$RESPONSE" | sed '$d')
    
    if [ "$HTTP_CODE" = "200" ]; then
        STATUS=$(echo "$BODY" | jq -r '.status // "uploaded"' 2>/dev/null || echo "uploaded")
        echo -e "  ${GREEN}✓ SUCCESS: $STATUS${NC}"
        SUCCESS_COUNT=$((SUCCESS_COUNT + 1))
    else
        echo -e "  ${RED}✗ FAILED: Status $HTTP_CODE${NC}"
        if [ -n "$BODY" ]; then
            ERROR_MSG=$(echo "$BODY" | jq -r '.error // .message // .' 2>/dev/null || echo "$BODY")
            echo -e "  Error: $ERROR_MSG"
        fi
        ERROR_COUNT=$((ERROR_COUNT + 1))
    fi
    
done <<< "$COMPONENTS"

# Summary
echo -e "\n=== UPLOAD SUMMARY ==="
echo "Total processed: $COMPONENT_COUNT"
echo -e "Successful: ${GREEN}$SUCCESS_COUNT${NC}"
echo -e "Errors: ${RED}$ERROR_COUNT${NC}"

if [ $DRY_RUN -eq 1 ]; then
    echo -e "\n${YELLOW}[DRY RUN] No actual uploads performed${NC}"
fi

echo "=== UPLOAD COMPLETE ==="

# Exit with error code if any failures
[ $ERROR_COUNT -eq 0 ] || exit 1