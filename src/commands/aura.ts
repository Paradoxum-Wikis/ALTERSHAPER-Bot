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

// prettier-ignore
const auraLevelNames = [
  "Vile",        // 0
  "Invisible",   // 1
  "Weak",        // 2
  "Frail",       // 3
  "Mid",         // 4
  "Noticed",     // 5
  "Vibrant",     // 6
  "Strong",      // 7
  "Radiant",     // 8
  "Legendary",   // 9
  "Mythical",    // 10
  "Omnipotent",  // 11
];

const flavorSet1 = [
  "An aura so cursed, even homeless bums avoid you!",
  "Your aura is basically nonexistent. NPC energy.",
  "Your vibe is weak. People forget you exist mid-conversation.",
  "You got potential, but right now you're background noise.",
  "Decent energy, but still kinda mid. Try harder.",
  "Solid aura, people actually notice you.",
  "A vibrant aura, in harmony with the egoistic tides.",
  "Strong aura, like a maxxed Minigunner under DJ buff.",
  "You light up the room. Everyone wants you on their team.",
  "A divinelike presence, bending the fabric of reality.",
  "A legendary aura, echoing through the cosmos eternally.",
  "Your presence is truly, truly unmatched.",
];

const flavorSet2 = [
  "Your presence is weaker than your dad's commitment.",
  "Please go, you're making the room uncomfortable.",
  "Your aura is so weak, even the Normals avoid you.",
  "Barely a vibe, as if you fell down a 4 person tall staircase.",
  "You're like a level 5 Pyromancer on Wave 40—absolutely useless and proud of it.",
  "You've got presence. Not loud, but respected.",
  "Nice aura, Ego would probably approve.",
  "Radiant energy, the alters are envious.",
  "You walk in, and the atmosphere changes. Eyes turn.",
  "Near-mythical aura, you're as lethal as King Von.",
  "God-tier vibes, I'd rub your feet.",
  "Paradoxically omnipotent. Are you Ego himself?",
];

const flavorSets = [flavorSet1, flavorSet2];

export const data = new SlashCommandBuilder()
  .setName("aura")
  .setDescription("Calculate your aura based on your display name")
  .addUserOption((option) =>
    option
      .setName("user")
      .setDescription("Ping a user to read their aura")
      .setRequired(false),
  );

export async function execute(
  interaction: ChatInputCommandInteraction,
): Promise<void> {
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

  const nameToLevel: { [key: string]: number } = {
    toru: 0,
    toru1: 1,
    toru2: 2,
    toru3: 3,
    toru4: 4,
    toru5: 5,
    toru6: 6,
    toru7: 7,
    toru8: 8,
    toru9: 9,
    toru10: 10,
    toru11: 11,
  };

  if (displayName in nameToLevel) {
    level = nameToLevel[displayName];
    percentage = level === 0 ? -100 : level === 11 ? 100 : (level - 1) * 10 + 9;
    const chosenSet = flavorSets[Math.floor(Math.random() * flavorSets.length)];
    flavorText = chosenSet[Math.max(0, Math.min(level, chosenSet.length - 1))];
  } else {
    const chosenSet = flavorSets[Math.floor(Math.random() * flavorSets.length)];
    const hash = hashString(displayName);
    percentage = hash % 101;

    if (percentage <= 3) {
      level = 0;
    } else if (percentage <= 9) {
      level = 1;
    } else if (percentage === 100) {
      level = 11;
    } else {
      level = Math.ceil((percentage - 9) / 10) + 1;
      if (level > 10) level = 10;
    }

    flavorText = chosenSet[Math.max(0, Math.min(level, chosenSet.length - 1))];
  }

  const levelName =
    auraLevelNames[Math.max(0, Math.min(level, auraLevelNames.length - 1))];

  const embed = new EmbedBuilder()
    .setColor(level === 0 ? "#2F2F2F" : level === 11 ? "#ad32ffff" : "#800080")
    .setTitle("🔮 Aura Reading")
    .setDescription(`The mystical aura of **${displayName}** has been divined!`)
    .addFields(
      { name: "Aura Strength", value: `${percentage}%`, inline: true },
      { name: "Aura Level", value: `${level} (${levelName})`, inline: true },
      { name: "Verdict:", value: flavorText, inline: false },
    )
    .setFooter({ text: "Aura levels may vary based on cosmic vibrations." })
    .setTimestamp();

  await interaction.reply({ embeds: [embed] });
}
