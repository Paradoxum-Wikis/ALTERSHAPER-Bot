import {
  Guild,
  TextChannel,
  Webhook,
  EmbedBuilder,
  WebhookMessageCreateOptions,
} from "discord.js";
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "fs";
import { join } from "path";

interface WebhookData {
  id: string;
  token: string;
  channelId: string;
  guildId: string;
}

export class WebhookManager {
  private static webhookData: WebhookData | null = null;
  private static readonly WEBHOOK_DATA_FILE = join(
    process.cwd(),
    "data",
    "webhook-data.json",
  );

  /**
   * Load webhook data from file
   */
  private static loadWebhookData(): void {
    try {
      const data = readFileSync(this.WEBHOOK_DATA_FILE, "utf-8");
      this.webhookData = JSON.parse(data);
    } catch (error) {
      this.webhookData = null;
    }
  }

  /**
   * Save webhook data to file
   */
  private static saveWebhookData(): void {
    if (this.webhookData) {
      const dataDir = join(process.cwd(), "data");
      mkdirSync(dataDir, { recursive: true });
      writeFileSync(
        this.WEBHOOK_DATA_FILE,
        JSON.stringify(this.webhookData, null, 2),
      );
    }
  }

  /**
   * Get the webhook avatar from webhook.png file
   */
  private static getWebhookAvatar(): string | undefined {
    const backgroundFile = "webhook.png";
    const possiblePaths = [
      join(process.cwd(), "src", backgroundFile),
      join(process.cwd(), "dist", backgroundFile),
      join(process.cwd(), "altershaper-bot", "dist", backgroundFile),
    ];

    for (const filePath of possiblePaths) {
      try {
        const imageBuffer = readFileSync(filePath);
        const base64Image = imageBuffer.toString("base64");
        return `data:image/png;base64,${base64Image}`;
      } catch (error) {
        continue;
      }
    }

    console.warn(
      "webhook.png not found in any of the expected locations:",
      possiblePaths,
    );
    return undefined;
  }

  /**
   * Create a new webhook in the specified channel
   */
  public static async createWebhook(
    channel: TextChannel,
    name: string = "Altershaper Herald",
    avatar?: string,
  ): Promise<Webhook | null> {
    try {
      if (
        !channel
          .permissionsFor(channel.guild.members.me!)
          ?.has("ManageWebhooks")
      ) {
        throw new Error(
          "Bot lacks permission to manage webhooks in this channel",
        );
      }

      await this.deleteWebhook(channel.guild);

      const webhookAvatar = avatar || this.getWebhookAvatar();

      const webhook = await channel.createWebhook({
        name: name,
        avatar: webhookAvatar,
        reason: "Automated webhook creation for bot messaging",
      });

      this.webhookData = {
        id: webhook.id,
        token: webhook.token!,
        channelId: channel.id,
        guildId: channel.guild.id,
      };
      this.saveWebhookData();

      return webhook;
    } catch (error) {
      console.error("Error creating webhook:", error);
      return null;
    }
  }

  /**
   * Get the existing webhook
   */
  public static async getWebhook(guild: Guild): Promise<Webhook | null> {
    if (!this.webhookData) {
      this.loadWebhookData();
    }

    if (!this.webhookData || this.webhookData.guildId !== guild.id) {
      return null;
    }

    try {
      const webhook = await guild.client.fetchWebhook(
        this.webhookData.id,
        this.webhookData.token,
      );
      return webhook;
    } catch (error) {
      console.error("Error fetching webhook:", error);
      return null;
    }
  }

  /**
   * Delete the existing webhook
   */
  public static async deleteWebhook(guild: Guild): Promise<boolean> {
    const webhook = await this.getWebhook(guild);
    if (webhook) {
      try {
        await webhook.delete("Cleaning up old webhook");
        this.webhookData = null;
        this.saveWebhookData();
        return true;
      } catch (error) {
        console.error("Error deleting webhook:", error);
        return false;
      }
    }
    return true;
  }

  /**
   * Send a message via webhook
   */
  public static async sendMessage(
    guild: Guild,
    content: string,
    options?: {
      embeds?: EmbedBuilder[];
      username?: string;
      avatarURL?: string;
    },
  ): Promise<boolean> {
    const webhook = await this.getWebhook(guild);
    if (!webhook) {
      console.error("No webhook available for sending message");
      return false;
    }

    try {
      const messageOptions: WebhookMessageCreateOptions = {
        content: content,
        embeds: options?.embeds?.map((embed) => embed.toJSON()),
        username: options?.username,
        avatarURL: options?.avatarURL,
      };

      await webhook.send(messageOptions);
      return true;
    } catch (error) {
      console.error("Error sending webhook message:", error);
      return false;
    }
  }

  /**
   * Send an embed via webhook
   */
  public static async sendEmbed(
    guild: Guild,
    embed: EmbedBuilder,
    options?: {
      username?: string;
      avatarURL?: string;
    },
  ): Promise<boolean> {
    return this.sendMessage(guild, "", {
      embeds: [embed],
      ...options,
    });
  }

  /**
   * Initialize webhook for a guild (create if doesn't exist)
   */
  public static async initializeWebhook(
    guild: Guild,
    channelId?: string,
  ): Promise<{ success: boolean; message: string }> {
    try {
      let webhook = await this.getWebhook(guild);

      if (webhook) {
        return {
          success: true,
          message: "Webhook already exists and is functional",
        };
      }

      let targetChannel: TextChannel | null = null;

      if (channelId) {
        const channel = guild.channels.cache.get(channelId);
        if (channel instanceof TextChannel) {
          targetChannel = channel;
        }
      }

      if (!targetChannel) {
        const generalChannel = guild.channels.cache.find(
          (channel) =>
            channel instanceof TextChannel &&
            (channel.name.includes("general") ||
              channel.name.includes("main") ||
              channel.name.includes("chat")),
        ) as TextChannel;

        if (generalChannel) {
          targetChannel = generalChannel;
        } else {
          targetChannel = guild.channels.cache.find(
            (channel) =>
              channel instanceof TextChannel &&
              channel.permissionsFor(guild.members.me!)?.has("SendMessages"),
          ) as TextChannel;
        }
      }

      if (!targetChannel) {
        return {
          success: false,
          message: "No suitable text channel found to create webhook",
        };
      }

      const webhookAvatar = this.getWebhookAvatar();

      webhook = await this.createWebhook(
        targetChannel,
        "Altershaper Herald",
        webhookAvatar,
      );

      if (webhook) {
        return {
          success: true,
          message: `Webhook created successfully in #${targetChannel.name}`,
        };
      } else {
        return { success: false, message: "Failed to create webhook" };
      }
    } catch (error) {
      console.error("Error initializing webhook:", error);
      return {
        success: false,
        message: `Error: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  }
}
