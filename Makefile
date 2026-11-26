COMPOSE := docker compose
TOOLS := $(COMPOSE) run --rm --build tools

.DEFAULT_GOAL := help
.PHONY: help up stop restart down logs ps sh lint test build e2e smoke run reset

help: ## Lista los comandos
	@grep -E '^[a-z0-9]+:.*##' $(MAKEFILE_LIST) | awk -F ':.*## ' '{printf "  %-9s %s\n", $$1, $$2}'

up: ## Levanta https://bioteam.local y espera a que esté healthy
	$(COMPOSE) up -d --build --wait --wait-timeout 420 web

stop: ## Frena el contenedor
	$(COMPOSE) stop

restart: ## Reinicia (reinstala si cambió pnpm-lock.yaml)
	$(COMPOSE) restart web
	$(COMPOSE) up -d --wait --wait-timeout 420 web

down: ## Borra el contenedor; conserva los volúmenes
	$(COMPOSE) down

logs: ## Sigue los logs
	$(COMPOSE) logs -f web

ps: ## Estado
	$(COMPOSE) ps

sh: ## Shell en el contenedor web
	$(COMPOSE) exec web bash

lint: ## ESLint
	$(TOOLS) pnpm lint

test: ## Vitest
	$(TOOLS) pnpm test

build: ## Build de producción (no pisa el .next del dev server)
	$(TOOLS) pnpm build

e2e: ## Playwright. Escribe en la DB de .env.local: pide CONFIRMO_DB_DEV=1
	@test "$(CONFIRMO_DB_DEV)" = "1" || { echo "La suite e2e puede escribir en la DB de .env.local. Si es de desarrollo: make e2e CONFIRMO_DB_DEV=1"; exit 1; }
	$(COMPOSE) run --rm --build e2e

smoke: ## Verifica dominios, TLS y redirects (CURL_OPTS=-k si la CA no es de confianza)
	./docker/smoke.sh

run: ## Comando suelto: make run CMD="node scripts/x.mjs"
	$(if $(strip $(CMD)),,$(error Uso: make run CMD="..."))
	$(TOOLS) $(CMD)

reset: ## Borra contenedor y volúmenes del proyecto
	$(COMPOSE) --profile tools --profile e2e down -v
