import { app } from "electron";
import path from "path";
import log from "electron-log";

const isDev = process.env.NODE_ENV === "development";

/**
 * Initialize electron-log with file and console logging
 */
export function initializeLogger(): void {
  // --- File logging ---
  log.transports.file.resolvePathFn = () =>
    path.join(app.getPath("documents"), "natively_debug.log");
  log.transports.file.level = isDev ? "debug" : "info";
  log.transports.file.format = "[{y}-{m}-{d} {h}:{i}:{s}.{ms}] [{level}] {text}";

  // --- Console logging ---
  log.transports.console.level = isDev ? "debug" : "warn";
  log.transports.console.useStyles = true; // Enable ANSI colors
  log.transports.console.format = "[{h}:{i}:{s}] [{level}] {text}"; // String format works with TS

  // Force colors on Windows terminals
  if (process.platform === "win32") {
    process.env.FORCE_COLOR = "3";
  }

  // Global exception handlers
  setupExceptionHandlers();

  log.info("Logger initialized");
}

/**
 * Handle uncaught exceptions and unhandled rejections
 */
function setupExceptionHandlers(): void {
  process.on("uncaughtException", (err) => {
    log.error("[CRITICAL] Uncaught Exception:", err.stack || err.message || err);
  });

  process.on("unhandledRejection", (reason, promise) => {
    log.error("[CRITICAL] Unhandled Rejection at:", promise, "reason:", reason);
  });
}

/**
 * Handle stdout/stderr errors at the process level to prevent EIO crashes
 */
export function setupProcessErrorHandlers(): void {
  process.stdout?.on?.("error", () => {});
  process.stderr?.on?.("error", () => {});
}

// Export log instance for direct use
export { log };