import fs from "fs/promises";
import path from "path";

export interface LinkedAccount {
  discordUserId: string;
  discordTag: string;
  fandomUsername: string;
  fandomUserId: number;
  linkedAt: string;
}

export class LinkLogger {
  private static readonly LINK_FILE = path.join(
    process.cwd(),
    "data",
    "linked_accounts.json",
  );

  private static async ensureDataDirectory(): Promise<void> {
    const dataDir = path.dirname(this.LINK_FILE);
    try {
      await fs.access(dataDir);
    } catch {
      await fs.mkdir(dataDir, { recursive: true });
    }
  }

  private static async readLinks(): Promise<LinkedAccount[]> {
    try {
      await this.ensureDataDirectory();
      const data = await fs.readFile(this.LINK_FILE, "utf-8");
      return JSON.parse(data);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        return [];
      }
      console.error("Error reading link file, returning empty array:", error);
      return [];
    }
  }

  private static async writeLinks(links: LinkedAccount[]): Promise<void> {
    await this.ensureDataDirectory();
    await fs.writeFile(this.LINK_FILE, JSON.stringify(links, null, 2));
  }

  public static async addLink(
    discordUserId: string,
    discordTag: string,
    fandomUsername: string,
    fandomUserId: number,
  ): Promise<void> {
    const links = await this.readLinks();
    const existingLinkIndex = links.findIndex(
      (link) => link.discordUserId === discordUserId || link.fandomUserId === fandomUserId
    );

    const newLink: LinkedAccount = {
      discordUserId,
      discordTag,
      fandomUsername,
      fandomUserId,
      linkedAt: new Date().toISOString(),
    };

    if (existingLinkIndex !== -1) {
      links[existingLinkIndex] = newLink;
    } else {
      links.push(newLink);
    }
    await this.writeLinks(links);
  }

  public static async getLinkByDiscordId(discordUserId: string): Promise<LinkedAccount | null> {
    const links = await this.readLinks();
    return links.find((link) => link.discordUserId === discordUserId) || null;
  }

  public static async getLinkByFandomId(fandomUserId: number): Promise<LinkedAccount | null> {
    const links = await this.readLinks();
    return links.find((link) => link.fandomUserId === fandomUserId) || null;
  }

  public static async isDiscordUserLinked(discordUserId: string): Promise<boolean> {
    const link = await this.getLinkByDiscordId(discordUserId);
    return !!link;
  }

  public static async isFandomUserLinked(fandomUserId: number): Promise<boolean> {
    const link = await this.getLinkByFandomId(fandomUserId);
    return !!link;
  }

  public static async removeLink(discordUserId: string): Promise<boolean> {
    const links = await this.readLinks();
    const initialLength = links.length;
    const filteredLinks = links.filter(link => link.discordUserId !== discordUserId);
    
    if (filteredLinks.length === initialLength) {
      return false;
    }
    
    await this.writeLinks(filteredLinks);
    return true;
  }

  public static async getAllLinks(): Promise<LinkEntry[]> {
    return await this.readLinks();
  }
}