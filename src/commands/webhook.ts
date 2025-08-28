import {
  ChatInputCommandInteraction,
  SlashCommandBuilder,
  EmbedBuilder,
  MessageFlags,
  TextChannel,
} from "discord.js";
import { WebhookManager } from "../utils/webhookManager.js";

export const data = new SlashCommandBuilder()
  .setName("webhook")
  .setDescription("Manage the bot's webhook for automated messaging")
  .addSubcommand((subcommand) =>
    subcommand
      .setName("create")
      .setDescription("Create a new webhook in a channel")
      .addChannelOption((option) =>
        option
          .setName("channel")
          .setDescription("Channel to create webhook in")
          .setRequired(true),
      ),
  )
  .addSubcommand((subcommand) =>
    subcommand.setName("delete").setDescription("Delete the existing webhook"),
  )
  .addSubcommand((subcommand) =>
    subcommand
      .setName("test")
      .setDescription("Test the webhook by sending a message")
      .addStringOption((option) =>
        option
          .setName("message")
          .setDescription("Test message to send")
          .setRequired(false),
      ),
  )
  .addSubcommand((subcommand) =>
    subcommand.setName("status").setDescription("Check webhook status"),
  );

export async function execute(
  interaction: ChatInputCommandInteraction,
): Promise<void> {
  if (!interaction.guild) {
    await interaction.reply({
      content: "**THIS COMMAND CAN ONLY BE USED IN THE SACRED HALLS!**",
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  const subcommand = interaction.options.getSubcommand();

  try {
    switch (subcommand) {
      case "create": {
        const channel = interaction.options.getChannel("channel", true);

        if (!(channel instanceof TextChannel)) {
          await interaction.reply({
            content: "**THOU MUST SELECT A TEXT CHANNEL!**",
            flags: MessageFlags.Ephemeral,
          });
          return;
        }

        await interaction.deferReply({ flags: MessageFlags.Ephemeral });

        const result = await WebhookManager.initializeWebhook(
          interaction.guild,
          channel.id,
        );

        const embed = new EmbedBuilder()
          .setTitle("🔗 WEBHOOK CREATION")
          .setDescription(result.message)
          .setColor(result.success ? "#00FF00" : "#FF0000")
          .setTimestamp();

        await interaction.editReply({ embeds: [embed] });
        break;
      }

      case "delete": {
        await interaction.deferReply({ flags: MessageFlags.Ephemeral });

        const deleted = await WebhookManager.deleteWebhook(interaction.guild);

        const embed = new EmbedBuilder()
          .setTitle("🗑️ WEBHOOK DELETION")
          .setDescription(
            deleted
              ? "**The webhook hath been banished from the realm!**"
              : "**No webhook found to banish, or deletion failed!**",
          )
          .setColor(deleted ? "#00FF00" : "#FFA500")
          .setTimestamp();

        await interaction.editReply({ embeds: [embed] });
        break;
      }

      case "test": {
        const testMessage =
          interaction.options.getString("message") ||
          "**Behold! This is a test message from the Altershaper's herald!**";

        await interaction.deferReply({ flags: MessageFlags.Ephemeral });

        const sent = await WebhookManager.sendMessage(
          interaction.guild,
          testMessage,
          {
            username: "Altershaper Herald",
            avatarURL: interaction.guild.members.me?.displayAvatarURL(),
          },
        );

        const embed = new EmbedBuilder()
          .setTitle("🧪 WEBHOOK TEST")
          .setDescription(
            sent
              ? "**Test message sent successfully through the webhook!**"
              : "**Failed to send test message! Check webhook status.**",
          )
          .setColor(sent ? "#00FF00" : "#FF0000")
          .setTimestamp();

        await interaction.editReply({ embeds: [embed] });
        break;
      }

      case "status": {
        const webhook = await WebhookManager.getWebhook(interaction.guild);

        const embed = new EmbedBuilder()
          .setTitle("📊 WEBHOOK STATUS")
          .setColor(webhook ? "#00FF00" : "#FFA500")
          .setTimestamp();

        if (webhook) {
          const channel = interaction.guild.channels.cache.get(
            webhook.channelId,
          );
          embed.setDescription("**Webhook Status: ACTIVE**").addFields(
            {
              name: "📍 Channel",
              value: channel ? `<#${channel.id}>` : "Unknown",
              inline: true,
            },
            {
              name: "🏷️ Name",
              value: webhook.name || "Unnamed",
              inline: true,
            },
            {
              name: "🆔 ID",
              value: webhook.id,
              inline: true,
            },
          );
        } else {
          embed.setDescription(
            "**Webhook Status: INACTIVE**\n\nNo webhook found. Use `/webhook create` to create one.",
          );
        }

        await interaction.reply({
          embeds: [embed],
          flags: MessageFlags.Ephemeral,
        });
        break;
      }
    }
  } catch (error) {
    console.error("Error in webhook command:", error);
    await interaction.reply({
      content:
        "**A DISTURBANCE IN THE SACRED REALM! The webhook ritual failed.**",
      flags: MessageFlags.Ephemeral,
    });
  }
}
