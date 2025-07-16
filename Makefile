# Makefile for installing and restarting temuragi services

# phony targets
.PHONY: 

# ui_srcbuild commands
react-install:
	cd ui_src; npm install

build:
	cd ui_src; npm run build

upload: 
	cd ui_src; npm run upload:components

react-clean:
	cd ui_src&& npm run clean

# Full component build and deploy
components: react-build react-upload
	@echo "Components built and uploaded successfully"

# Development mode
react-watch:
	cd ui_src&& npm run watch

# Complete setup
setup-react: react-install
	@echo "ui_srcdependencies installed"

# Build everything
build-all: react-build react-upload
	@echo "All components built and synced to database"


