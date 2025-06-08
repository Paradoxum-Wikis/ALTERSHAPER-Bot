import {
  ChatInputCommandInteraction,
  SlashCommandBuilder,
  EmbedBuilder,
} from "discord.js";

interface GitHubCommit {
  sha: string;
  html_url: string;
  commit: {
    message: string;
    author: {
      date: string;
    };
  };
}

export const data = new SlashCommandBuilder()
  .setName("info")
  .setDescription("BEHOLD THE KNOWLEDGE OF THE ALTERSHAPER");

export async function execute(
  interaction: ChatInputCommandInteraction,
): Promise<void> {
  try {
    const response = await fetch(
      "https://api.github.com/repos/Paradoxum-Wikis/ALTERSHAPER-Bot/commits/main"
    );
    
    let commitInfo = "**UNABLE TO RETRIEVE COMMIT DATA**";
    if (response.ok) {
      const data = await response.json() as GitHubCommit;
      const commitDate = new Date(data.commit.author.date);
      const commitMessage = data.commit.message.split('\n')[0];
      const commitSha = data.sha.substring(0, 7);
      
      commitInfo = `**[${commitSha}](${data.html_url})** - ${commitMessage}\n**Date:** ${commitDate.toLocaleDateString()} at ${commitDate.toLocaleTimeString()}`;
    }

    const embed = new EmbedBuilder()
      .setColor("#9932CC")
      .setTitle("ℹ️ KNOWLEDGE OF THE ALTERSHAPER")
      .setDescription(
        "**BEHOLD THE DIVINE INFORMATION OF THY SACRED ENFORCER!**"
      )
      .addFields(
        {
          name: "📚 DOCUMENTATION",
          value: "[ALTER EGO Wiki Help Page](https://alter-ego.fandom.com/wiki/Help:ALTERSHAPER)",
          inline: false,
        },
        {
          name: "🔗 SOURCE CODE",
          value: "[GitHub Repository](https://github.com/Paradoxum-Wikis/ALTERSHAPER-Bot)",
          inline: false,
        },
        {
          name: "📝 LATEST UPDATE",
          value: commitInfo,
          inline: false,
        },
        {
          name: "📊 CURRENT STATUS",
          value: `**Servers:** ${interaction.client.guilds.cache.size}\n**Users:** ${interaction.client.users.cache.size}\n**Uptime:** <t:${Math.floor((Date.now() - (process.uptime() * 1000)) / 1000)}:R>`,
          inline: false,
        },
      )
      .setFooter({ 
        text: "THE ALTERSHAPER STANDS ETERNAL, GUARDIAN OF ALTERUISM AND ENFORCER OF RIGHTEOUS ORDER!" 
      })
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  } catch (error) {
    console.error("Error fetching bot info:", error);
    
    const embed = new EmbedBuilder()
      .setColor("#9932CC")
      .setTitle("ℹ️ KNOWLEDGE OF THE ALTERSHAPER")
      .setDescription(
        "**BEHOLD THE INFORMATION OF THY SACRED ENFORCER!**"
      )
      .addFields(
        {
          name: "📚 DOCUMENTATION",
          value: "[ALTER EGO Wiki Help Page](https://alter-ego.fandom.com/wiki/Help:ALTERSHAPER)",
          inline: false,
        },
        {
          name: "🔗 SOURCE CODE",
          value: "[GitHub Repository](https://github.com/Paradoxum-Wikis/ALTERSHAPER-Bot)",
          inline: false,
        },
        {
          name: "📊 CURRENT STATUS",
          value: `**Servers:** ${interaction.client.guilds.cache.size}\n**Users:** ${interaction.client.users.cache.size}\n**Uptime:** <t:${Math.floor((Date.now() - (process.uptime() * 1000)) / 1000)}:R>`,
          inline: true,
        },
      )
      .setFooter({ 
        text: "THE ALTERSHAPER STANDS ETERNAL, GUARDIAN OF ALTERUISM AND ENFORCER OF RIGHTEOUS ORDER!" 
      })
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  }
}