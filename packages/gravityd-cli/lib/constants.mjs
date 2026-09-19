export const SCHEMA_VERSION = "1.0.0";
export const CLI_VERSION = "0.1.0";
export const CONFIG_DIR = ".gravityd";
export const CONFIG_FILE = "project.json";
export const DEFAULT_PROJECT_ID = "local";
export const DEFAULT_INSFORGE_URL = "http://127.0.0.1:7130";
export const DEFAULT_POSTGRES_PORT = 5433;
export const MENU_BUSINESS_START = 100;
export const MENU_BLOCK_SIZE = 10;
export const FORBIDDEN_MIGRATIONS = new Set(["002_seed_system.sql"]);

export const MARKERS = {
  migrations: "insforge-app/migrations",
  web: "frontend/web",
  libsh: "scripts/lib.sh",
};

export const EXIT = {
  OK: 0,
  RUNTIME: 1,
  AUTH: 2,
  VALIDATION: 3,
};
