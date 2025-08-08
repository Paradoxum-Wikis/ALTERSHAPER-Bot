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

    // Get display name for deterministic results
    const displayName = targetMember?.displayName || targetUser.displayName;
    
    // Use the same hash function from fighterGenerator for consistency
    function hashString(str: string): number {
      let hash = 0;
      for (let i = 0; i < str.length; i++) {
        hash = ((hash << 5) - hash + str.charCodeAt(i)) >>> 0;
      }
      return hash;
    }

    // Generate furry level based on display name (same as aura system)
    const nameHash = hashString(displayName);
    const furryLevel = (nameHash % 100) + 1;
    const isFurry = furryLevel >= 50;

    const speciesData = [
      { category: "Canine", specific: "Wolf" },
      { category: "Canine", specific: "Fox" },
      { category: "Canine", specific: "Dog" },
      { category: "Canine", specific: "Coyote" },
      { category: "Canine", specific: "Jackal" },
      { category: "Canine", specific: "Dingo" },

      { category: "Feline", specific: "Cat" },
      { category: "Feline", specific: "Tiger" },
      { category: "Feline", specific: "Lion" },
      { category: "Feline", specific: "Panther" },
      { category: "Feline", specific: "Leopard" },
      { category: "Feline", specific: "Cheetah" },
      { category: "Feline", specific: "Cougar" },

      { category: "Mythical", specific: "Dragon" },
      { category: "Mythical", specific: "Griffin" },
      { category: "Mythical", specific: "Kirin" },
      { category: "Mythical", specific: "Unicorn" },
      { category: "Mythical", specific: "Phoenix" },
      { category: "Mythical", specific: "Werewolf" },
      { category: "Mythical", specific: "Chimera" },

      { category: "Synthetic", specific: "Protogen" },
      { category: "Synthetic", specific: "Primagen" },
      { category: "Synthetic", specific: "Android" },

      { category: "Aquatic", specific: "Seal" },
      { category: "Aquatic", specific: "Shark" },
      { category: "Aquatic", specific: "Dolphin" },
      { category: "Aquatic", specific: "Orca" },
      { category: "Aquatic", specific: "Otter" },
      { category: "Aquatic", specific: "Octopus" },

      { category: "Mammal", specific: "Raccoon" },
      { category: "Mammal", specific: "Deer" },
      { category: "Mammal", specific: "Bear" },
      { category: "Mammal", specific: "Rabbit" },
      { category: "Mammal", specific: "Horse" },
      { category: "Mammal", specific: "Bat" },
      { category: "Mammal", specific: "Squirrel" },
      { category: "Mammal", specific: "Pig" },
      { category: "Mammal", specific: "Goat" },
      { category: "Mammal", specific: "Sheep" },
      { category: "Mammal", specific: "Cow" },

      { category: "Insect", specific: "Bee" },
      { category: "Insect", specific: "Moth" },
      { category: "Insect", specific: "Butterfly" },
      { category: "Insect", specific: "Ant" },

      { category: "Avian", specific: "Raven" },
      { category: "Avian", specific: "Parrot" },
      { category: "Avian", specific: "Bird" },
      { category: "Avian", specific: "Hawk" },
      { category: "Avian", specific: "Owl" },
      { category: "Avian", specific: "Eagle" },
    ];

    const speciesHash = hashString(displayName + "species");
    const selectedSpecies = speciesData[speciesHash % speciesData.length];
    const fursonaDisplay = `${selectedSpecies.category} (${selectedSpecies.specific})`;

    const embed = new EmbedBuilder()
      .setColor(isFurry ? "#FF69B4" : "#808080")
      .setTitle("🔮 THE ORACLES HAVE SPOKEN")
      .setDescription(
        `**The divine vision is ${isFurry ? "clear" : "clouded"}!**\n\n` +
        `Through the mystical powers of the cosmos, ` +
        `the oracles have gazed into the depths of souls and revealed:\n\n` +
        (isFurry 
          ? `🐾 **${displayName}** is secretly a furry! 🐾`
          : `😐 **${displayName}** is NOT a furry.`) +
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
          value: `${furryLevel}% Furry Energy`,
          inline: true,
        },
        {
          name: isFurry ? "🐺 FURSONA" : "🐺 SPECIES",
          value: isFurry ? fursonaDisplay : "Mammal (Human)",
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