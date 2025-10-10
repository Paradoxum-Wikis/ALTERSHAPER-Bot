import dotenv from "dotenv";
dotenv.config();

import {
  Client,
  GatewayIntentBits,
  ChannelType,
  REST,
  Routes,
  Collection,
} from "discord.js";
import { loadCommands, Command } from "./utils/commandLoader.js";
import { ReactionRoleHandler } from "./utils/reactionRoleHandler.js";
import { ConsoleHandler } from "./utils/consoleHandler.js";
import { registerConsoleCommands } from "./utils/consoleCommands.js";
import {
  handleInteraction,
  handleMemberJoin,
  handleReactionAdd,
  handleReactionRemove,
} from "./utils/eventHandlers.js";

class AltershaperBot {
  private client: Client;
  private readonly BOT_TOKEN = process.env.DISCORD_TOKEN;
  private commands: Collection<string, Command>;

  constructor() {
    this.client = new Client({
      intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildModeration,
        GatewayIntentBits.GuildMessageReactions,
      ],
    });

    this.commands = loadCommands();
    this.setupEventListeners();
  }

  private setupEventListeners(): void {
    this.client.once("ready", async () => {
      console.log(
        `✅ Altershaper bot hath awakened as ${this.client.user?.tag}`,
      );
      this.client.user?.setActivity("Alter Egoists", { type: 3 });

      this.logVisibleChannels();

      await this.registerSlashCommands();
      await ReactionRoleHandler.initialize(this.client);
    });

    this.client.on("interactionCreate", (interaction) =>
      handleInteraction(interaction, this.commands),
    );
    this.client.on("guildMemberAdd", handleMemberJoin);
    this.client.on("messageReactionAdd", handleReactionAdd);
    this.client.on("messageReactionRemove", handleReactionRemove);
  }

  private logVisibleChannels(): void {
    console.log("🔍 Permissions:");
    console.log("================================");

    this.client.guilds.cache.forEach((guild) => {
      console.log(`📁 Server: ${guild.name} (ID: ${guild.id})`);

      guild.channels.cache.forEach((channel) => {
        let channelType = "Unknown";
        let canRead = false;

        const permissions = channel.permissionsFor(this.client.user!);

        switch (channel.type) {
          case ChannelType.GuildText:
            channelType = "Text";
            canRead =
              (permissions?.has("ViewChannel") &&
                permissions?.has("ReadMessageHistory")) ||
              false;
            break;
          case ChannelType.GuildVoice:
            channelType = "Voice";
            canRead = permissions?.has("ViewChannel") || false;
            break;
          case ChannelType.GuildCategory:
            channelType = "Category";
            canRead = permissions?.has("ViewChannel") || false;
            break;
          case ChannelType.GuildAnnouncement:
            channelType = "Announcement";
            canRead =
              (permissions?.has("ViewChannel") &&
                permissions?.has("ReadMessageHistory")) ||
              false;
            break;
          case ChannelType.GuildStageVoice:
            channelType = "Stage";
            canRead = permissions?.has("ViewChannel") || false;
            break;
          case ChannelType.GuildForum:
            channelType = "Forum";
            canRead = permissions?.has("ViewChannel") || false;
            break;
          case ChannelType.PublicThread:
            channelType = "Public Thread";
            canRead =
              (permissions?.has("ViewChannel") &&
                permissions?.has("ReadMessageHistory")) ||
              false;
            break;
          case ChannelType.PrivateThread:
            channelType = "Private Thread";
            canRead =
              (permissions?.has("ViewChannel") &&
                permissions?.has("ReadMessageHistory")) ||
              false;
            break;
        }

        const readStatus = canRead ? "✅ CAN READ" : "❌ CANNOT READ";
        console.log(
          `  📝 ${channelType}: #${channel.name} (ID: ${channel.id}) - ${readStatus}`,
        );
      });

      console.log("");
    });

    console.log("================================");
  }

  private async registerSlashCommands(): Promise<void> {
    const commandData = Array.from(this.commands.values()).map(
      (command) => command.data,
    );
    const rest = new REST({ version: "10" }).setToken(this.BOT_TOKEN!);

    try {
      console.log("🔄 Registering divine slash commands...");

      await rest.put(Routes.applicationCommands(this.client.user!.id), {
        body: commandData,
      });

      console.log("✅ Divine slash commands registered successfully!");
    } catch (error) {
      console.error("❌ Failed to register slash commands:", error);
    }
  }

  public async start(): Promise<void> {
    if (!this.BOT_TOKEN) {
      console.error("❌ Discord token not found in environment variables");
      process.exit(1);
    }

    try {
      await this.client.login(this.BOT_TOKEN);
    } catch (error) {
      console.error("❌ Failed to login:", error);
      process.exit(1);
    }

    // Graceful shutdown
    process.on("SIGINT", () => {
      console.log("🛑 Shutting down gracefully...");
      this.client.destroy();
      process.exit(0);
    });

    process.on("SIGTERM", () => {
      console.log("🛑 Shutting down gracefully...");
      this.client.destroy();
      process.exit(0);
    });
  }

  public async reloadSlashCommands(): Promise<void> {
    console.log("🔄 Reloading slash commands...");
    this.commands = loadCommands();
    await this.registerSlashCommands();
    console.log("✅ Slash commands reloaded successfully!");
  }

  public logStatus(): void {
    const readyAt = this.client.readyAt
      ? `<t:${Math.floor(this.client.readyAt.getTime() / 1000)}:R>`
      : "Not ready";
    console.log("📊 Altershaper Status:");
    console.log(`  • Ready at: ${readyAt}`);
    console.log(`  • Guilds: ${this.client.guilds.cache.size}`);
    console.log(`  • Users cached: ${this.client.users.cache.size}`);
    console.log(`  • Ping: ${Math.round(this.client.ws.ping)}ms\n`);
  }

  public async shutdown(exitCode = 0): Promise<void> {
    console.log("🛑 Shutting down Altershaper bot...");
    await this.client.destroy();
    process.exit(exitCode);
  }

  public async restart(): Promise<void> {
    console.log("♻️ Restarting Altershaper bot internals...");

    try {
      await this.client.destroy();
      this.commands = loadCommands();
      this.client = new Client({
        intents: [
          GatewayIntentBits.Guilds,
          GatewayIntentBits.GuildMessages,
          GatewayIntentBits.MessageContent,
          GatewayIntentBits.GuildMembers,
          GatewayIntentBits.GuildModeration,
          GatewayIntentBits.GuildMessageReactions,
        ],
      });

      this.setupEventListeners();
      await this.client.login(this.BOT_TOKEN!);

      console.log("✅ Altershaper bot internals restarted successfully!");
    } catch (error) {
      console.error("❌ Failed to restart bot internals:", error);
      console.log("❌ Manual restart required. Bot will shut down.");
      await this.shutdown(1);
    }
  }
}

const bot = new AltershaperBot();
const consoleCommands = new ConsoleHandler();

registerConsoleCommands(consoleCommands, bot);

consoleCommands.start();
bot.start();
