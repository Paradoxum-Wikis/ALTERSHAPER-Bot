import fs from "fs/promises";
import path from "path";
import { Message } from "discord.js";

export interface PurgedMessage {
  id: string;
  content: string;
  authorId: string;
  authorTag: string;
  channelId: string;
  channelName: string;
  guildId: string;
  timestamp: string;
  attachments: string[];
  embeds: any[];
  purgedBy: string;
  purgedAt: string;
  purgeActionId: string;
}

export class MessageLogger {
  private static readonly PURGED_FILE = path.join(
    process.cwd(),
    "data",
    "purged_messages.json",
  );

  private static async ensureDataDirectory(): Promise<void> {
    const dataDir = path.dirname(this.PURGED_FILE);
    try {
      await fs.access(dataDir);
    } catch {
      await fs.mkdir(dataDir, { recursive: true });
    }
  }

  private static async readPurgedMessages(): Promise<PurgedMessage[]> {
    try {
      await this.ensureDataDirectory();
      const data = await fs.readFile(this.PURGED_FILE, "utf-8");
      return JSON.parse(data);
    } catch {
      return [];
    }
  }

  private static async writePurgedMessages(
    messages: PurgedMessage[],
  ): Promise<void> {
    await this.ensureDataDirectory();
    await fs.writeFile(this.PURGED_FILE, JSON.stringify(messages, null, 2));
  }

  public static async logPurgedMessages(
    messages: Message[],
    purgedBy: string,
    actionId: string,
  ): Promise<void> {
    const existingMessages = await this.readPurgedMessages();
    const purgedAt = new Date().toISOString();

    const newPurgedMessages: PurgedMessage[] = messages.map((message) => ({
      id: message.id,
      content: message.content || "[NO TEXT CONTENT]",
      authorId: message.author.id,
      authorTag: message.author.tag,
      channelId: message.channel.id,
      channelName:
        message.channel.type === 0 ? message.channel.name : "Unknown Channel",
      guildId: message.guild?.id || "Unknown Guild",
      timestamp: message.createdAt.toISOString(),
      attachments: message.attachments.map((att) => att.url),
      embeds: message.embeds.map((embed) => embed.toJSON()),
      purgedBy: purgedBy,
      purgedAt: purgedAt,
      purgeActionId: actionId,
    }));

    existingMessages.push(...newPurgedMessages);
    await this.writePurgedMessages(existingMessages);
  }

  public static async getPurgedMessages(
    guildId?: string,
  ): Promise<PurgedMessage[]> {
    const messages = await this.readPurgedMessages();

    if (guildId) {
      return messages.filter((msg) => msg.guildId === guildId);
    }

    return messages;
  }

  public static async getPurgedMessagesByActionId(
    actionId: string,
  ): Promise<PurgedMessage[]> {
    const messages = await this.readPurgedMessages();
    return messages.filter((msg) => msg.purgeActionId === actionId);
  }
}
