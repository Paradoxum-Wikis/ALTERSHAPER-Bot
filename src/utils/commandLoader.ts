import { Collection } from "discord.js";
import * as kick from "../commands/kick.js";
import * as ban from "../commands/ban.js";
import * as timeout from "../commands/timeout.js";
import * as clear from "../commands/clear.js";
import * as warn from "../commands/warn.js";
import * as sins from "../commands/sins.js";
import * as removesin from "../commands/removesin.js";
import * as archives from "../commands/archives.js";
import * as help from "../commands/help.js";
import * as avatar from "../commands/avatar.js";
import * as info from "../commands/info.js";

export interface Command {
  data: any;
  execute: (...args: any[]) => Promise<void>;
}

export function loadCommands(): Collection<string, Command> {
  const commands = new Collection<string, Command>();

  const commandModules = [
    kick,
    ban,
    timeout,
    clear,
    warn,
    sins,
    removesin,
    archives,
    help,
    avatar,
    info,
  ];

  for (const command of commandModules) {
    commands.set(command.data.name, command);
  }

  return commands;
}
