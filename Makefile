# Web UI Makefile

DOCKER_HUB_ORG := watkinslabs
IMAGE_NAME_STATIC := temuragi_static
IMAGE_NAME_REACT := temuragi_react
IMAGE_NAME_INIT := temuragi_web_init
VERSION := $(shell cat VERSION)
BUILDER_NAME := temuragi-builder
PLATFORMS := linux/amd64

BUMP_TYPE ?= patch

.PHONY: build push build-push setup-buildx clean help bump-version

help:
	@echo "Usage: make [target]"
	@echo "Targets:"
	@echo "  build         Build Docker images locally"
	@echo "  push          Push images to Docker Hub"
	@echo "  build-push    Build and push in one step"
	@echo "  bump-version  Bump version (BUMP_TYPE=patch|minor|major)"
	@echo "  clean         Remove local images"
	@echo "  run-init      Run the init container to test component upload"

check-wl-version:
	@if ! command -v wl_version_manager &> /dev/null; then \
		echo "Error: wl_version_manager not found. Install with: pip install wl_version_manager"; \
		exit 1; \
	fi

bump-version: check-wl-version
	@echo "Bumping $(BUMP_TYPE) version..."
	@wl_version_manager --update-package-json $(BUMP_TYPE)
	@NEW_VERSION=$$(cat VERSION); \
	git add VERSION ui_src/package.json; \
	git commit -m "Bump version to $$NEW_VERSION" || true

setup-buildx:
	@if ! docker buildx ls | grep -q "^$(BUILDER_NAME)"; then \
		echo "Creating buildx builder: $(BUILDER_NAME)"; \
		docker buildx create --name $(BUILDER_NAME) --driver docker-container --bootstrap; \
	fi
	@docker buildx use $(BUILDER_NAME)

build-react: setup-buildx
	docker buildx build \
		--build-arg VERSION=$(VERSION) \
		--target builder \
		-t $(DOCKER_HUB_ORG)/$(IMAGE_NAME_REACT):$(VERSION) \
		-t $(DOCKER_HUB_ORG)/$(IMAGE_NAME_REACT):latest \
		--load \
		.

build-static: setup-buildx
	docker buildx build \
		--build-arg VERSION=$(VERSION) \
		--target production \
		-t $(DOCKER_HUB_ORG)/$(IMAGE_NAME_STATIC):$(VERSION) \
		-t $(DOCKER_HUB_ORG)/$(IMAGE_NAME_STATIC):latest \
		--load \
		.

build-init: setup-buildx
	docker buildx build \
		--build-arg VERSION=$(VERSION) \
		--target web_init \
		-t $(DOCKER_HUB_ORG)/$(IMAGE_NAME_INIT):$(VERSION) \
		-t $(DOCKER_HUB_ORG)/$(IMAGE_NAME_INIT):latest \
		--load \
		.

build: build-react build-static build-init

push-react:
	@if ! docker info 2>/dev/null | grep -q "Username"; then \
		echo "Not logged into Docker Hub. Please run: docker login"; \
		exit 1; \
	fi
	docker push $(DOCKER_HUB_ORG)/$(IMAGE_NAME_REACT):$(VERSION)
	docker push $(DOCKER_HUB_ORG)/$(IMAGE_NAME_REACT):latest

push-static:
	@if ! docker info 2>/dev/null | grep -q "Username"; then \
		echo "Not logged into Docker Hub. Please run: docker login"; \
		exit 1; \
	fi
	docker push $(DOCKER_HUB_ORG)/$(IMAGE_NAME_STATIC):$(VERSION)
	docker push $(DOCKER_HUB_ORG)/$(IMAGE_NAME_STATIC):latest

push-init:
	@if ! docker info 2>/dev/null | grep -q "Username"; then \
		echo "Not logged into Docker Hub. Please run: docker login"; \
		exit 1; \
	fi
	docker push $(DOCKER_HUB_ORG)/$(IMAGE_NAME_INIT):$(VERSION)
	docker push $(DOCKER_HUB_ORG)/$(IMAGE_NAME_INIT):latest

push: push-react push-static push-init

build-push-react: setup-buildx
	@if ! docker info 2>/dev/null | grep -q "Username"; then \
		echo "Not logged into Docker Hub. Please run: docker login"; \
		exit 1; \
	fi
	docker buildx build \
		--platform $(PLATFORMS) \
		--provenance=true \
		--sbom=true \
		--build-arg VERSION=$(VERSION) \
		--target builder \
		-t $(DOCKER_HUB_ORG)/$(IMAGE_NAME_REACT):$(VERSION) \
		-t $(DOCKER_HUB_ORG)/$(IMAGE_NAME_REACT):latest \
		--push \
		.

build-push-static: setup-buildx
	@if ! docker info 2>/dev/null | grep -q "Username"; then \
		echo "Not logged into Docker Hub. Please run: docker login"; \
		exit 1; \
	fi
	docker buildx build \
		--platform $(PLATFORMS) \
		--provenance=true \
		--sbom=true \
		--build-arg VERSION=$(VERSION) \
		--target production \
		-t $(DOCKER_HUB_ORG)/$(IMAGE_NAME_STATIC):$(VERSION) \
		-t $(DOCKER_HUB_ORG)/$(IMAGE_NAME_STATIC):latest \
		--push \
		.

build-push-init: setup-buildx
	@if ! docker info 2>/dev/null | grep -q "Username"; then \
		echo "Not logged into Docker Hub. Please run: docker login"; \
		exit 1; \
	fi
	docker buildx build \
		--platform $(PLATFORMS) \
		--provenance=true \
		--sbom=true \
		--build-arg VERSION=$(VERSION) \
		--target web_init \
		-t $(DOCKER_HUB_ORG)/$(IMAGE_NAME_INIT):$(VERSION) \
		-t $(DOCKER_HUB_ORG)/$(IMAGE_NAME_INIT):latest \
		--push \
		.

build-push: build-push-react build-push-static build-push-init

clean:
	docker rmi $(DOCKER_HUB_ORG)/$(IMAGE_NAME_REACT):$(VERSION) || true
	docker rmi $(DOCKER_HUB_ORG)/$(IMAGE_NAME_REACT):latest || true
	docker rmi $(DOCKER_HUB_ORG)/$(IMAGE_NAME_STATIC):$(VERSION) || true
	docker rmi $(DOCKER_HUB_ORG)/$(IMAGE_NAME_STATIC):latest || true
	docker rmi $(DOCKER_HUB_ORG)/$(IMAGE_NAME_INIT):$(VERSION) || true
	docker rmi $(DOCKER_HUB_ORG)/$(IMAGE_NAME_INIT):latest || true

inspect-attestations:
	@echo "React Builder SBOM:"
	@docker buildx imagetools inspect $(DOCKER_HUB_ORG)/$(IMAGE_NAME_REACT):$(VERSION) --format '{{ json .SBOM }}'
	@echo "\nReact Builder Provenance:"
	@docker buildx imagetools inspect $(DOCKER_HUB_ORG)/$(IMAGE_NAME_REACT):$(VERSION) --format '{{ json .Provenance }}'
	@echo "\nStatic SBOM:"
	@docker buildx imagetools inspect $(DOCKER_HUB_ORG)/$(IMAGE_NAME_STATIC):$(VERSION) --format '{{ json .SBOM }}'
	@echo "\nStatic Provenance:"
	@docker buildx imagetools inspect $(DOCKER_HUB_ORG)/$(IMAGE_NAME_STATIC):$(VERSION) --format '{{ json .Provenance }}'
	@echo "\nInit SBOM:"
	@docker buildx imagetools inspect $(DOCKER_HUB_ORG)/$(IMAGE_NAME_INIT):$(VERSION) --format '{{ json .SBOM }}'
	@echo "\nInit Provenance:"
	@docker buildx imagetools inspect $(DOCKER_HUB_ORG)/$(IMAGE_NAME_INIT):$(VERSION) --format '{{ json .Provenance }}'

run-static:
	docker run -p 8080:80 $(DOCKER_HUB_ORG)/$(IMAGE_NAME_STATIC):$(VERSION)

run-react:
	docker run -it $(DOCKER_HUB_ORG)/$(IMAGE_NAME_REACT):$(VERSION)

run-init:
	@echo "Running init container (dry-run mode for testing)..."
	docker run -it \
		-e TEMURAGI_API_BASE=http://localhost:5050 \
		-e TEMURAGI_INIT_TOKEN=test-token \
		$(DOCKER_HUB_ORG)/$(IMAGE_NAME_INIT):$(VERSION) \
		/upload-components.sh --dry-run --manifest /app/component-upload-manifest.json

run-init-upload:
	@if [ -z "$(TEMURAGI_API_BASE)" ] || [ -z "$(TEMURAGI_INIT_TOKEN)" ]; then \
		echo "Error: TEMURAGI_API_BASE and TEMURAGI_INIT_TOKEN must be set"; \
		exit 1; \
	fi
	docker run -it \
		-e TEMURAGI_API_BASE=$(TEMURAGI_API_BASE) \
		-e TEMURAGI_INIT_TOKEN=$(TEMURAGI_INIT_TOKEN) \
		$(DOCKER_HUB_ORG)/$(IMAGE_NAME_INIT):$(VERSION)