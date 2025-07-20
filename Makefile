# Makefile for installing and restarting temuragi services

VERSION := $(shell cat VERSION)

.PHONY: build push all clean list

all: build-images 


# ui_srcbuild commands
react-install:
	cd ui_src; npm install

build:
	cd ui_src; npm run build

upload: 
	cd ui_src; npm run upload:components

react-clean:
	cd ui_src&& npm run clean





build-images:
	@echo "Building version $(VERSION)..."
	@docker build -t watkinslabs/temuragi_static:latest -t watkinslabs/temuragi_static:$(VERSION) --target production .
	@docker build -t watkinslabs/temuragi_react:latest -t watkinslabs/temuragi_react:$(VERSION) --target builder .
	@echo "Build complete!"
	@make list

push:
	@echo "Pushing images..."
	@docker push watkinslabs/temuragi_static --all-tags
	@docker push watkinslabs/temuragi_react --all-tags
	@echo "Push complete!"

list:
	@echo "Built images:"
	@docker images | grep temuragi

clean:
	@echo "Removing local images..."
	@docker rmi watkinslabs/temuragi_static:latest watkinslabs/temuragi_static:$(VERSION) || true
	@docker rmi watkinslabs/temuragi_react:latest watkinslabs/temuragi_react:$(VERSION) || true

test:
	@echo "Running static image on port 8080..."
	@docker run -p 8080:80 watkinslabs/temuragi_static:latest