interface BattleLock {
  guildId: string;
  userIds: Set<string>;
  startTime: number;
}

const locks = new Map<string, BattleLock>();
export class BattleLockManager {
  private static readonly BATTLE_TIMEOUT = 1000 * 60 * 5; // 5 minutes
  // Checks if a battle is active in a specific server
  public static isLocked(guildId: string): boolean {
    this.cleanupOldBattles();
    return locks.has(guildId);
  }

  // if a user is in any battle across any server
  public static isUserInAnyBattle(userId: string): boolean {
    this.cleanupOldBattles();
    for (const lock of locks.values()) {
      if (lock.userIds.has(userId)) {
        return true;
      }
    }
    return false;
  }

  // Acquires a battle lock for a specific server and users
  // Returns true if the lock was acquired, false otherwise
  public static acquireLock(guildId: string, userIds: string[]): boolean {
    if (this.isLocked(guildId)) {
      return false;
    }
    for (const id of userIds) {
      if (this.isUserInAnyBattle(id)) {
        return false;
      }
    }

    locks.set(guildId, {
      guildId,
      userIds: new Set(userIds),
      startTime: Date.now(),
    });
    return true;
  }

  // Releases the battle lock for a specific server
  public static releaseLock(guildId: string): void {
    locks.delete(guildId);
  }

  // Clean up old/timed out battles to prevent permanent locks
  private static cleanupOldBattles(): void {
    const now = Date.now();
    const toRemove: string[] = [];

    for (const [guildId, lock] of locks.entries()) {
      if (now - lock.startTime > this.BATTLE_TIMEOUT) {
        toRemove.push(guildId);
      }
    }

    for (const guildId of toRemove) {
      console.log(
        `[BATTLE_LOCK] Cleaning up timed out battle in guild ${guildId}`,
      );
      this.releaseLock(guildId);
    }
  }
}
