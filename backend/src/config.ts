import * as path from "path";
import * as dotenv from "dotenv";

dotenv.config({ path: path.resolve(__dirname, "..", ".env") });

const PLACEHOLDER_SECRETS = new Set([
  "",
  "CHANGE THIS IN PRODUCTION",
  "super-secret-key-change-in-production",
  "change-me-to-a-random-secret-key",
  "CHANGE-THIS-TO-A-RANDOM-STRING",
]);

const SECRET_KEY_MIN_LENGTH = 32;

function bool(value: string | undefined, fallback = false): boolean {
  if (value === undefined || value === "") return fallback;
  return value.toLowerCase() === "true" || value === "1";
}

export const config = {
  APP_NAME: "Inventario Generico",
  APP_VERSION: "0.1.0",
  DEBUG: bool(process.env.DEBUG, false),
  PORT: Number(process.env.PORT ?? 8000),

  DB_HOST: process.env.DB_HOST ?? "localhost",
  DB_PORT: Number(process.env.DB_PORT ?? 5433),
  DB_NAME: process.env.DB_NAME ?? "inventario_generico",
  DB_USER: process.env.DB_USER ?? "postgres",
  DB_PASSWORD: process.env.DB_PASSWORD ?? "postgres",
  DATABASE_URL: process.env.DATABASE_URL ?? "",

  SECRET_KEY: process.env.SECRET_KEY ?? "CHANGE THIS IN PRODUCTION",
  ACCESS_TOKEN_EXPIRE_MINUTES: Number(
    process.env.ACCESS_TOKEN_EXPIRE_MINUTES ?? 60
  ),
  ALGORITHM: process.env.ALGORITHM ?? "HS256",

  FIRST_ADMIN_EMAIL: process.env.FIRST_ADMIN_EMAIL ?? "",
  FIRST_ADMIN_PASSWORD: process.env.FIRST_ADMIN_PASSWORD ?? "",
  FIRST_ADMIN_NAME: process.env.FIRST_ADMIN_NAME ?? "Administrator",

  CORS_ORIGINS:
    process.env.CORS_ORIGINS ??
    "http://localhost:3000,http://localhost:8000",
};

export function connectionString(): string {
  if (config.DATABASE_URL) return config.DATABASE_URL;
  return (
    `postgresql://${config.DB_USER}:${config.DB_PASSWORD}` +
    `@${config.DB_HOST}:${config.DB_PORT}/${config.DB_NAME}`
  );
}

export function corsOrigins(): string[] {
  const raw = config.CORS_ORIGINS.trim();
  if (raw.startsWith("[")) {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed.map((o) => String(o).trim()).filter(Boolean);
      }
    } catch {
      // fall through to comma-separated parsing
    }
  }
  return raw
    .split(",")
    .map((o) => o.trim())
    .filter(Boolean);
}

export function validateConfig(): void {
  const problems: string[] = [];
  const secret = (config.SECRET_KEY ?? "").trim();
  if (PLACEHOLDER_SECRETS.has(secret)) {
    problems.push(
      "SECRET_KEY is a known placeholder (or missing), so anyone could forge " +
        'valid JWT tokens. Generate one: openssl rand -base64 48'
    );
  } else if (secret.length < SECRET_KEY_MIN_LENGTH) {
    problems.push(
      `SECRET_KEY is too short (${secret.length} < ${SECRET_KEY_MIN_LENGTH}). ` +
        "Use a random secret, e.g. openssl rand -base64 48"
    );
  }
  if (corsOrigins().length === 0) {
    problems.push("CORS_ORIGINS resolved to an empty list.");
  }
  if (problems.length > 0) {
    throw new Error(
      "Refusing to start with insecure configuration:\n- " +
        problems.join("\n- ")
    );
  }
}
