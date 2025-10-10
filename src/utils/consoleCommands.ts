import { ConsoleHandler } from "./consoleHandler.js";

export function registerConsoleCommands(
  handler: ConsoleHandler,
  bot: {
    logStatus: () => void;
    reloadSlashCommands: () => Promise<void>;
    restart: () => Promise<void>;
    shutdown: (exitCode?: number) => Promise<void>;
  },
): void {
  handler.registerCommand("help", "List available console commands", () =>
    handler.listCommands(),
  );

  handler.registerCommand("status", "Print current bot status", () =>
    bot.logStatus(),
  );

  handler.registerCommand("reload", "Reload registered slash commands", () =>
    bot.reloadSlashCommands(),
  );

  handler.registerCommand("restart", "Restart the bot internals", () =>
    bot.restart(),
  );

  handler.registerCommand("shutdown", "Gracefully stop the bot", () =>
    bot.shutdown(),
  );
}