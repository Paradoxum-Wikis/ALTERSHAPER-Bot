import {
  ChatInputCommandInteraction,
  SlashCommandBuilder,
  EmbedBuilder,
  GuildMember,
  MessageFlags,
  User,
} from "discord.js";

export const data = new SlashCommandBuilder()
  .setName("furry")
  .setDescription("The divine oracles reveal furry energy levels")
  .addUserOption((option) =>
    option
      .setName("target")
      .setDescription("The user to check for furry energy")
      .setRequired(false),
  );

export async function execute(
  interaction: ChatInputCommandInteraction,
): Promise<void> {
  if (!interaction.guild) {
    await interaction.reply({
      content: "**THIS HOLY COMMAND CAN ONLY BE USED IN THE SACRED HALLS!**",
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  try {
    let targetUser: User;
    let targetMember: GuildMember | null = null;

    const specifiedUser = interaction.options.getUser("target");
    
    if (specifiedUser) {
      targetUser = specifiedUser;
      targetMember = await interaction.guild.members.fetch(targetUser.id).catch(() => null);
      
      if (!targetMember) {
        await interaction.reply({
          content: "**THE ORACLES CANNOT FIND THIS MORTAL IN THE SACRED HALLS!**",
          flags: MessageFlags.Ephemeral,
        });
        return;
      }
    } else {
      const members = await interaction.guild.members.fetch();
      const realMembers = members.filter(member => !member.user.bot);
      
      if (realMembers.size === 0) {
        await interaction.reply({
          content: "**THE SACRED HALLS ARE EMPTY OF MORTALS TO JUDGE!**",
          flags: MessageFlags.Ephemeral,
        });
        return;
      }

      const membersArray = Array.from(realMembers.values());
      targetMember = membersArray[Math.floor(Math.random() * membersArray.length)];
      targetUser = targetMember.user;
    }

    const furryLevel = Math.abs(parseInt(targetUser.id.slice(-6), 16)) % 100 + 1;
    const isFurry = furryLevel >= 50;
    
    const spiritAnimals = ["Wolf", "Fox", "Cat", "Dragon", "Protogen", "Seal", "Raccoon", "Tiger", "Deer", "Bear"];
    const spiritAnimal = spiritAnimals[Math.abs(parseInt(targetUser.id.slice(-4), 16)) % spiritAnimals.length];

    const embed = new EmbedBuilder()
      .setColor(isFurry ? "#FF69B4" : "#808080")
      .setTitle("🔮 THE ORACLES HAVE SPOKEN")
      .setDescription(
        `**The divine vision is ${isFurry ? "clear" : "clouded"}!**\n\n` +
        `Through the mystical powers of the cosmos, ` +
        `the oracles have gazed into the depths of souls and revealed:\n\n` +
        (isFurry 
          ? `🐾 **${targetMember?.displayName || targetUser.displayName}** is secretly a furry! 🐾`
          : `😐 **${targetMember?.displayName || targetUser.displayName}** is NOT a furry.`) +
        `\n\n` +
        `*The truth cannot be hidden from the all-seeing divine eye...*`
      )
      .setThumbnail(targetUser.displayAvatarURL())
      .addFields(
        {
          name: "📜 ORACLE'S DECREE",
          value: isFurry 
            ? "This divine revelation cannot be disputed!" 
            : "The furry energy levels are below the sacred threshold.",
          inline: false,
        },
        {
          name: "🎭 FURRY LEVEL",
          value: `${furryLevel}% Furry Energy Detected ${isFurry ? "✅" : "❌"}`,
          inline: true,
        },
        {
          name: isFurry ? "🐺 SPIRIT ANIMAL" : "🐺 POTENTIAL SPIRIT ANIMAL",
          value: spiritAnimal,
          inline: true,
        }
      )
      .setFooter({ 
        text: "The oracles' judgements are never wrong" 
      })
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });

  } catch (error) {
    console.error("Error in furry command:", error);
    await interaction.reply({
      content: "**THE ORACLES ARE EXPERIENCING TECHNICAL DIFFICULTIES! THE FURRY DETECTION RITUAL HAS FAILED!**",
      flags: MessageFlags.Ephemeral,
    });
  }
}