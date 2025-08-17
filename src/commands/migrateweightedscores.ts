import {
  ChatInputCommandInteraction,
  SlashCommandBuilder,
  EmbedBuilder,
} from "discord.js";
import fs from "fs/promises";
import path from "path";

export const data = new SlashCommandBuilder()
  .setName("migrateweightedscores")
  .setDescription("Recalculate weighted scores for all existing battle stats (Admin only)");

interface LegacyBattleStats {
  userId: string;
  userTag: string;
  wins: number;
  losses: number;
  totalBattles: number;
  winRate: number;
  weightedScore?: number;
  lastCasualBattleAt?: string;
  rankedWins: number;
  rankedLosses: number;
  rankedTotalBattles: number;
  rankedWinRate: number;
  rankedWeightedScore?: number;
  lastRankedBattleAt?: string;
}

interface ModernBattleStats {
  userId: string;
  userTag: string;
  wins: number;
  losses: number;
  totalBattles: number;
  winRate: number;
  weightedScore: number;
  lastCasualBattleAt?: string;
  rankedWins: number;
  rankedLosses: number;
  rankedTotalBattles: number;
  rankedWinRate: number;
  rankedWeightedScore: number;
  lastRankedBattleAt?: string;
}

function calculateWeightedScore(wins: number, totalBattles: number): number {
  if (totalBattles === 0) return 0;
  
  const winRate = wins / totalBattles;
  const gamesFactor = 1 - Math.exp(-0.12 * totalBattles);
  const weightedScore = winRate * gamesFactor;
  
  return Math.round(weightedScore * 100000) / 1000;
}

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
  await interaction.deferReply({ ephemeral: true });

  try {
    const statsFile = path.join(process.cwd(), "data", "battle_stats.json");

    let stats: LegacyBattleStats[] = [];
    try {
      const data = await fs.readFile(statsFile, "utf-8");
      stats = JSON.parse(data);
    } catch (error) {
      await interaction.editReply({
        content: "**No battle stats file found! Nothing to migrate.**"
      });
      return;
    }

    if (stats.length === 0) {
      await interaction.editReply({
        content: "**Battle stats file is empty! Nothing to migrate.**"
      });
      return;
    }

    let updatedCount = 0;
    const modernStats: ModernBattleStats[] = [];

    for (const oldStats of stats) {
      const modernUserStats: ModernBattleStats = {
        userId: oldStats.userId,
        userTag: oldStats.userTag,
        wins: oldStats.wins,
        losses: oldStats.losses,
        totalBattles: oldStats.totalBattles,
        winRate: oldStats.winRate,
        weightedScore: calculateWeightedScore(oldStats.wins, oldStats.totalBattles),
        lastCasualBattleAt: oldStats.lastCasualBattleAt,
        rankedWins: oldStats.rankedWins,
        rankedLosses: oldStats.rankedLosses,
        rankedTotalBattles: oldStats.rankedTotalBattles,
        rankedWinRate: oldStats.rankedWinRate,
        rankedWeightedScore: calculateWeightedScore(oldStats.rankedWins, oldStats.rankedTotalBattles),
        lastRankedBattleAt: oldStats.lastRankedBattleAt,
      };

      const needsUpdate = 
        oldStats.weightedScore !== modernUserStats.weightedScore ||
        oldStats.rankedWeightedScore !== modernUserStats.rankedWeightedScore ||
        oldStats.weightedScore === undefined ||
        oldStats.rankedWeightedScore === undefined;

      if (needsUpdate) {
        updatedCount++;
      }

      modernStats.push(modernUserStats);
    }

    const backupFile = path.join(process.cwd(), "data", `battle_stats_backup_${Date.now()}.json`);
    await fs.writeFile(backupFile, JSON.stringify(stats, null, 2));

    await fs.writeFile(statsFile, JSON.stringify(modernStats, null, 2));

    const embed = new EmbedBuilder()
      .setColor("#00FF00")
      .setTitle("WEIGHTED SCORES MIGRATION COMPLETE")
      .setDescription(
        `**Migration Summary:**\n` +
        `**Total Users Processed:** ${stats.length}\n` +
        `**Users Updated:** ${updatedCount}\n` +
        `**Backup Created:** \`${path.basename(backupFile)}\`\n\n` +
        `**Changes Made:**\n` +
        `• Calculated weighted scores for normal battles\n` +
        `• Calculated weighted scores for ranked battles\n` +
        `• Preserved all existing battle data\n` +
        `• Created backup of original data`
      )
      .setTimestamp();

    await interaction.editReply({ embeds: [embed] });

  } catch (error) {
    console.error("Error migrating weighted scores:", error);
    await interaction.editReply({
      content: "**MIGRATION FAILED!** An error occurred while updating weighted scores. Check the console for details."
    });
  }
}