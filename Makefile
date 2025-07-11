# Makefile for installing and restarting temuragi services

# phony targets
.PHONY: 

# app_uibuild commands
react-install:
	cd app_ui&& npm install

react-build:
	cd app_ui&& npm run build

react-upload:
	cd app_ui&& API_TOKEN="$(API_TOKEN)" npm run build:components

react-clean:
	cd app_ui&& npm run clean

# Full component build and deploy
components: react-build react-upload
	@echo "Components built and uploaded successfully"

# Development mode
react-watch:
	cd app_ui&& npm run watch

# Complete setup
setup-react: react-install
	@echo "app_uidependencies installed"

# Build everything
build-all: react-build react-upload
	@echo "All components built and synced to database"



build:
	@cd app_ui&& npm run build && npm run upload:components