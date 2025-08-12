import fs from "fs/promises";
import path from "path";

export interface BattleStats {
  userId: string;
  userTag: string;
  // Normal
  wins: number;
  losses: number;
  totalBattles: number;
  winRate: number;
  lastCasualBattleAt?: string;
  // Ranked
  rankedWins: number;
  rankedLosses: number;
  rankedTotalBattles: number;
  rankedWinRate: number;
  lastRankedBattleAt?: string;
}

export interface BattleRecord {
  battleId: string;
  winnerId: string;
  winnerTag: string;
  loserId: string;
  loserTag: string;
  battleDate: string;
  turns: number;
  winnerHpRemaining: number;
  winnerMaxHp: number;
  isRanked: boolean;
  guildId: string;
}

export class BattleStatsManager {
  private static readonly STATS_FILE = path.join(
    process.cwd(),
    "data",
    "battle_stats.json",
  );

  private static readonly RECORDS_FILE = path.join(
    process.cwd(),
    "data",
    "battle_records.json",
  );

  private static async ensureDataDirectory(): Promise<void> {
    const dataDir = path.dirname(this.STATS_FILE);
    try {
      await fs.access(dataDir);
    } catch {
      await fs.mkdir(dataDir, { recursive: true });
    }
  }

  private static async readStats(): Promise<BattleStats[]> {
    try {
      await this.ensureDataDirectory();
      const data = await fs.readFile(this.STATS_FILE, "utf-8");
      return JSON.parse(data);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") {
        return [];
      }
      console.error("Error reading battle stats file:", error);
      return [];
    }
  }

  private static async writeStats(stats: BattleStats[]): Promise<void> {
    await this.ensureDataDirectory();
    await fs.writeFile(this.STATS_FILE, JSON.stringify(stats, null, 2));
  }

  private static async readRecords(): Promise<BattleRecord[]> {
    try {
      await this.ensureDataDirectory();
      const data = await fs.readFile(this.RECORDS_FILE, "utf-8");
      return JSON.parse(data);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") {
        return [];
      }
      console.error("Error reading battle records file:", error);
      return [];
    }
  }

  private static async writeRecords(records: BattleRecord[]): Promise<void> {
    await this.ensureDataDirectory();
    await fs.writeFile(this.RECORDS_FILE, JSON.stringify(records, null, 2));
  }

  private static calculateWinRate(wins: number, totalBattles: number): number {
    return totalBattles > 0 ? Math.round((wins / totalBattles) * 100) : 0;
  }

  public static async recordBattle(
    winnerId: string,
    winnerTag: string,
    loserId: string,
    loserTag: string,
    turns: number,
    winnerHpRemaining: number,
    winnerMaxHp: number,
    isRanked: boolean = false,
    guildId?: string,
  ): Promise<void> {
    const stats = await this.readStats();
    const records = await this.readRecords();
    const battleDate = new Date().toISOString();
    const battleId = `battle_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const battleRecord: BattleRecord = {
      battleId,
      winnerId,
      winnerTag,
      loserId,
      loserTag,
      battleDate,
      turns,
      winnerHpRemaining,
      winnerMaxHp,
      isRanked,
      guildId: guildId || "1362084781134708907",
    };
    records.push(battleRecord);

    let winnerStats = stats.find((s) => s.userId === winnerId);
    if (!winnerStats) {
      winnerStats = {
        userId: winnerId,
        userTag: winnerTag,
        wins: 0,
        losses: 0,
        totalBattles: 0,
        winRate: 0,
        lastCasualBattleAt: undefined,
        rankedWins: 0,
        rankedLosses: 0,
        rankedTotalBattles: 0,
        rankedWinRate: 0,
        lastRankedBattleAt: undefined,
      };
      stats.push(winnerStats);
    }

    if (isRanked) {
      winnerStats.rankedWins++;
      winnerStats.rankedTotalBattles++;
      winnerStats.rankedWinRate = this.calculateWinRate(
        winnerStats.rankedWins,
        winnerStats.rankedTotalBattles,
      );
      winnerStats.lastRankedBattleAt = battleDate;
    } else {
      winnerStats.wins++;
      winnerStats.totalBattles++;
      winnerStats.winRate = this.calculateWinRate(
        winnerStats.wins,
        winnerStats.totalBattles,
      );
      winnerStats.lastCasualBattleAt = battleDate;
    }

    winnerStats.userTag = winnerTag;

    let loserStats = stats.find((s) => s.userId === loserId);
    if (!loserStats) {
      loserStats = {
        userId: loserId,
        userTag: loserTag,
        wins: 0,
        losses: 0,
        totalBattles: 0,
        winRate: 0,
        lastCasualBattleAt: undefined,
        rankedWins: 0,
        rankedLosses: 0,
        rankedTotalBattles: 0,
        rankedWinRate: 0,
        lastRankedBattleAt: undefined,
      };
      stats.push(loserStats);
    }

    if (isRanked) {
      loserStats.rankedLosses++;
      loserStats.rankedTotalBattles++;
      loserStats.rankedWinRate = this.calculateWinRate(
        loserStats.rankedWins,
        loserStats.rankedTotalBattles,
      );
      loserStats.lastRankedBattleAt = battleDate;
    } else {
      loserStats.losses++;
      loserStats.totalBattles++;
      loserStats.winRate = this.calculateWinRate(
        loserStats.wins,
        loserStats.totalBattles,
      );
      loserStats.lastCasualBattleAt = battleDate;
    }

    loserStats.userTag = loserTag;

    await this.writeStats(stats);
    await this.writeRecords(records);
  }

  public static async getUserStats(
    userId: string,
  ): Promise<BattleStats | null> {
    const stats = await this.readStats();
    return stats.find((s) => s.userId === userId) || null;
  }

  public static async getLeaderboard(
    limit: number = 10,
    ranked: boolean = false,
  ): Promise<BattleStats[]> {
    const stats = await this.readStats();
    const minBattles = ranked ? 5 : 3;

    return stats
      .filter((s) =>
        ranked
          ? s.rankedTotalBattles >= minBattles
          : s.totalBattles >= minBattles,
      )
      .sort((a, b) => {
        const aWinRate = ranked ? a.rankedWinRate : a.winRate;
        const bWinRate = ranked ? b.rankedWinRate : b.winRate;
        const aWins = ranked ? a.rankedWins : a.wins;
        const bWins = ranked ? b.rankedWins : b.wins;

        if (bWinRate !== aWinRate) {
          return bWinRate - aWinRate;
        }
        return bWins - aWins;
      })
      .slice(0, limit);
  }

  public static async getUserBattleHistory(
    userId: string,
    limit: number = 10,
    ranked?: boolean,
  ): Promise<BattleRecord[]> {
    const records = await this.readRecords();
    return records
      .filter((r) => {
        const userMatches = r.winnerId === userId || r.loserId === userId;
        if (ranked !== undefined) {
          return userMatches && r.isRanked === ranked;
        }
        return userMatches;
      })
      .sort(
        (a, b) =>
          new Date(b.battleDate).getTime() - new Date(a.battleDate).getTime(),
      )
      .slice(0, limit);
  }

  public static async getAllStats(): Promise<BattleStats[]> {
    return await this.readStats();
  }
}
