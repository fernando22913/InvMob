import { createApp } from "./app";
import { config, validateConfig } from "./config";
import { closePool } from "./db";

async function main(): Promise<void> {
  validateConfig();

  const app = createApp();
  const server = app.listen(config.PORT, () => {
    // eslint-disable-next-line no-console
    console.log(
      `${config.APP_NAME} v${config.APP_VERSION} listening on http://localhost:${config.PORT}/api`
    );
  });

  const shutdown = (signal: string) => {
    // eslint-disable-next-line no-console
    console.log(`\n${signal} received, shutting down...`);
    server.close(() => {
      void closePool().finally(() => process.exit(0));
    });
  };

  process.on("SIGINT", () => shutdown("SIGINT"));
  process.on("SIGTERM", () => shutdown("SIGTERM"));
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exit(1);
});
