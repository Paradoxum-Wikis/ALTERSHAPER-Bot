import {
  ChatInputCommandInteraction,
  SlashCommandBuilder,
  EmbedBuilder,
} from "discord.js";

function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash + str.charCodeAt(i)) >>> 0;
  }
  return hash;
}

const flavorSet1 = [
  "Your aura is basically nonexistent. NPC energy.",
  "Your vibe is weak. People forget you exist mid-conversation.",
  "You got potential, but right now you're background noise.",
  "Decent energy, but still kinda mid. Try harder.",
  "Solid aura, people actually notice you.",
  "A vibrant aura, in harmony with the egoistic tides.",
  "Strong aura, like a maxxed Minigunner under DJ buff.",
  "You light up the room. Everyone wants you on their team.",
  "A near divine presence, bending the fabric of reality.",
  "A legendary aura, echoing through the cosmos eternally.",
];

const flavorSet2 = [
  "Your presence is weaker than your dad's commitment.",
  "Your aura is so weak, even the Normals avoid you.",
  "Barely a vibe, as if you fell down a 4 person tall staircase.",
  "You're like a level 0 Sniper on Wave 40—absolutely useless and proud of it.",
  "You've got presence. Not loud, but respected.",
  "Nice aura, Ego would probably approve.",
  "Radiant energy, the alters are envious.",
  "You walk in, and the atmosphere changes. Eyes turn.",
  "Near-mythical aura, you're as lethal as King Von.",
  "God-tier vibes, I'd rub your feet.",
];

const flavorSets = [flavorSet1, flavorSet2];

export const data = new SlashCommandBuilder()
  .setName("aura")
  .setDescription("Calculate your aura based on your display name")
  .addUserOption(option =>
    option
      .setName("user")
      .setDescription("Ping a user to read their aura")
      .setRequired(false)
  );

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
  const targetUser = interaction.options.getUser("user") || interaction.user;
  let displayName: string;

  if (interaction.inGuild()) {
    const member = await interaction.guild!.members.fetch(targetUser.id);
    displayName = member.displayName;
  } else {
    displayName = targetUser.username;
  }

  let percentage: number;
  let level: number;
  let flavorText: string;

  if (displayName === "toru") {
    percentage = -100;
    level = 0;
    flavorText = "An aura so cursed, even homeless bums avoid you!";
  } else {
    const chosenSet = flavorSets[Math.floor(Math.random() * flavorSets.length)];
    const hash = hashString(displayName);
    percentage = hash % 101;
    level = Math.ceil(percentage / 10) || 1;
    flavorText = chosenSet[level - 1];
  }

  const embed = new EmbedBuilder()
    .setColor(level === 0 ? "#2F2F2F" : "#800080")
    .setTitle("🔮 Aura Reading")
    .setDescription(`The mystical aura of **${displayName}** has been divined!`)
    .addFields(
      { name: "Aura Strength", value: `${percentage}%`, inline: true },
      { name: "Aura Level", value: level === 0 ? "Vile" : String(level), inline: true },
      { name: "Verdict", value: flavorText, inline: false }
    )
    .setFooter({ text: "Aura levels may vary based on cosmic vibrations." })
    .setTimestamp();

  await interaction.reply({ embeds: [embed] });
}