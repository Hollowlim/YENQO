import { loadEnvFile } from "node:process";
import { fileURLToPath } from "node:url";
const envPath = fileURLToPath(new URL("../../../.env", import.meta.url));
try {
  loadEnvFile(envPath);
} catch (error) {
  if (
    !(error instanceof Error) ||
    !("code" in error) ||
    error.code !== "ENOENT"
  )
    throw error;
}
process.env.NODE_ENV ??= process.argv.includes("--production")
  ? "production"
  : "development";
const portArgument = process.argv.indexOf("--port");
if (portArgument >= 0) process.env.PORT = process.argv[portArgument + 1];
process.env.APP_ORIGIN ??= `http://127.0.0.1:${process.env.PORT ?? 3000}`;
