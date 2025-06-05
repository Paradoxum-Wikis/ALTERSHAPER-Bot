import fs from 'fs/promises';
import path from 'path';

export interface ModerationEntry {
  id: string;
  type: 'warn' | 'kick' | 'ban' | 'timeout' | 'clear';
  userId: string;
  userTag: string;
  moderatorId: string;
  moderatorTag: string;
  reason: string;
  timestamp: string;
  guildId: string;
  mercy?: boolean;
  duration?: number;
  messageCount?: number;
}

export class ModerationLogger {
  private static readonly MOD_FILE = path.join(process.cwd(), 'data', 'moderation.json');

  private static async ensureDataDirectory(): Promise<void> {
    const dataDir = path.dirname(this.MOD_FILE);
    try {
      await fs.access(dataDir);
    } catch {
      await fs.mkdir(dataDir, { recursive: true });
    }
  }

  private static async readEntries(): Promise<ModerationEntry[]> {
    try {
      await this.ensureDataDirectory();
      const data = await fs.readFile(this.MOD_FILE, 'utf-8');
      return JSON.parse(data);
    } catch {
      return [];
    }
  }

  private static async writeEntries(entries: ModerationEntry[]): Promise<void> {
    await this.ensureDataDirectory();
    await fs.writeFile(this.MOD_FILE, JSON.stringify(entries, null, 2));
  }

  private static async getNextId(type: ModerationEntry['type']): Promise<string> {
    const entries = await this.readEntries();
    const prefix = type.charAt(0).toUpperCase(); // W, K, B, T, C
    
    const typeEntries = entries.filter(entry => entry.id.startsWith(prefix));
    const numbers = typeEntries.map(entry => {
      const num = parseInt(entry.id.substring(1));
      return isNaN(num) ? 0 : num;
    });
    
    const nextNumber = numbers.length > 0 ? Math.max(...numbers) + 1 : 1;
    return `${prefix}${nextNumber}`;
  }

  public static async addEntry(entry: Omit<ModerationEntry, 'id' | 'timestamp'>): Promise<string> {
    const entries = await this.readEntries();
    const entryId = await this.getNextId(entry.type);
    
    const newEntry: ModerationEntry = {
      ...entry,
      id: entryId,
      timestamp: new Date().toISOString()
    };

    entries.push(newEntry);
    await this.writeEntries(entries);
    
    return entryId;
  }

  public static async getUserEntries(userId: string, guildId: string): Promise<ModerationEntry[]> {
    const entries = await this.readEntries();
    return entries.filter(entry => 
      entry.userId === userId && 
      entry.guildId === guildId && 
      !entry.mercy
    );
  }

  public static async getUserWarns(userId: string, guildId: string): Promise<ModerationEntry[]> {
    const entries = await this.readEntries();
    return entries.filter(entry => 
      entry.userId === userId && 
      entry.guildId === guildId && 
      entry.type === 'warn' && 
      !entry.mercy
    );
  }

  public static async getAllEntries(guildId: string): Promise<ModerationEntry[]> {
    const entries = await this.readEntries();
    return entries.filter(entry => entry.guildId === guildId && !entry.mercy);
  }

  public static async getEntryById(entryId: string): Promise<ModerationEntry | null> {
    const entries = await this.readEntries();
    return entries.find(entry => entry.id === entryId) || null;
  }

  public static async removeEntry(entryId: string): Promise<boolean> {
    const entries = await this.readEntries();
    const index = entries.findIndex(entry => entry.id === entryId && !entry.mercy);
    
    if (index === -1) return false;
    
    entries[index].mercy = true;
    
    await this.writeEntries(entries);
    return true;
  }
}