# HerRaise_Hub_Backend

...existing code...

Usage (docker-compose)
- docker-compose must be run from the directory that contains docker-compose.yml (project root).
  Example:
    cd C:\Users\hp\Desktop\backend\HerRaise_Hub_Backend
    docker-compose up --build

- If you are inside the herraise_hub subfolder, point to the compose file with -f:
    cd C:\Users\hp\Desktop\backend\HerRaise_Hub_Backend\herraise_hub
    docker-compose -f ..\docker-compose.yml up --build

Common commands
- Show compose-managed containers (from project root):
    docker-compose ps
  Or from a subfolder (explicit file):
    docker-compose -f ..\docker-compose.yml ps

- Run in background:
    docker-compose up -d --build

Troubleshooting
- If `docker-compose ps` shows no services, verify you are in the directory containing docker-compose.yml or use the `-f` flag to point to it.
- If containers exit, check logs:
    docker-compose logs web
    docker-compose logs db
- On newer Docker Desktop you can also use the plugin command `docker compose` (no hyphen) with the same `-f` option.