// ---- FORCE COLORS BEFORE IMPORT ----
if (process.platform === "win32") {
  process.env.FORCE_COLOR = "3";
  // Instead of execSync('chcp 65001') use safer approach:
  // Windows Terminal and new consoles support ANSI by default
  const isModernTerminal = 
    process.env.WT_SESSION || // Windows Terminal
    process.env.TERM_PROGRAM === 'vscode' || // VSCode integrated terminal
    process.env.ANSICON || // ANSICON
    process.env.ConEmuANSI === 'ON'; // ConEmu
  
  if (!isModernTerminal) {
    // Fallback: disable colors for old terminals
    kleur.enabled = false;
    log.transports.console.useStyles = false;
  }
}
// Force enable styles for electron-log
process.env.FORCE_STYLES = "true";

import log from "electron-log";
import { app } from "electron";
import path from "path";
import kleur from "kleur";

// Force enable colors on Windows for kleur
kleur.enabled = true;

const isDev = process.env.NODE_ENV === "development";

/**
 * Initialize electron-log with file and console logging
 */
export function initializeLogger(): void {
  // --- File logging ---
  log.transports.file.resolvePathFn = () => {
    try {
      return path.join(
        app?.getPath?.("documents") || process.cwd(),
        "natively_debug.log"
      );
    } catch {
      return path.join(process.cwd(), "natively_debug.log");
    }
  };

  log.transports.file.level = isDev ? "debug" : "info";
  log.transports.file.format =
    "[{y}-{m}-{d} {h}:{i}:{s}.{ms}] [{level}] {text}";

  // --- Console logging with colors ---
  log.transports.console.level = "debug";

  // --- Console logging with colors ---
  log.transports.console.level = "debug";

  // Custom formatter with kleur colors for terminal
  log.transports.console.format = (variables: any) => {
    const level = variables.level || 'info';
    
    // Get timestamp - use plain text for Git Bash compatibility
    const now = new Date();
    const timeStr = now.toTimeString().split(' ')[0];
    const ms = now.getMilliseconds().toString().padStart(3, '0');
    const timestamp = `[${timeStr}.${ms}]`;
    
    // Get the message
    let text = '';
    if (variables.data && Array.isArray(variables.data) && variables.data.length > 0) {
      text = variables.data[0];
    } else if (variables.args && Array.isArray(variables.args)) {
      text = variables.args.map((arg: any) => {
        if (typeof arg === 'object') {
          return JSON.stringify(arg);
        }
        return String(arg);
      }).join(' ');
    } else if (variables.text) {
      text = variables.text;
    } else if (variables.message) {
      text = typeof variables.message === 'object' ? JSON.stringify(variables.message) : variables.message;
    }
    
    // Extract module name from [ModuleName] pattern
    const moduleMatch = text.match(/^\[([^\]]+)\]/);
    const moduleName = moduleMatch ? moduleMatch[1] : null;
    
    // Color for level
    let coloredLevel: any;
    switch (level) {
      case 'error':
        coloredLevel = kleur.red().bold(level.toUpperCase());
        break;
      case 'warn':
        coloredLevel = kleur.yellow().bold(level.toUpperCase());
        break;
      case 'info':
        coloredLevel = kleur.green().bold(level.toUpperCase());
        break;
      case 'debug':
        coloredLevel = kleur.cyan().bold(level.toUpperCase());
        break;
      default:
        coloredLevel = kleur.gray().bold(level.toUpperCase());
    }
    
    // Color for module name if present
    let coloredModule = '';
    if (moduleName) {
      coloredModule = kleur.blue().bold(`[${moduleName}]`);
      text = text.replace(/^\[[^\]]+\]\s*/, coloredModule + ' ');
    }
    
    return [`${timestamp} ${coloredLevel} ${coloredModule ? coloredModule + ' ' + text.replace(coloredModule + ' ', '') : text}`];
  };

  // Enable styles/colors for console transport
  log.transports.console.useStyles = true;

  setupExceptionHandlers();

  log.info("Logger initialized");
}

/**
 * Handle uncaught exceptions and unhandled rejections
 */
function setupExceptionHandlers(): void {
  process.on("uncaughtException", (err) => {
    log.error(
      "[CRITICAL] Uncaught Exception:",
      err?.stack || err?.message || err
    );
  });

  process.on("unhandledRejection", (reason, promise) => {
    log.error(
      "[CRITICAL] Unhandled Rejection at:",
      promise,
      "reason:",
      reason
    );
  });
}

/**
 * Prevent EIO crashes from stdout/stderr
 */
export function setupProcessErrorHandlers(): void {
  process.stdout?.on?.("error", () => {});
  process.stderr?.on?.("error", () => {});
}

export { log };