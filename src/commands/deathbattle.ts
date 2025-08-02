import {
  ChatInputCommandInteraction,
  SlashCommandBuilder,
  EmbedBuilder,
  AttachmentBuilder,
  User,
  MessageFlags,
} from "discord.js";
import { createCanvas, loadImage } from "canvas";
import path from "path";

export const data = new SlashCommandBuilder()
  .setName("deathbattle")
  .setDescription("Witness an epic clash between two souls in divine combat!")
  .addUserOption((option) =>
    option
      .setName("fighter1")
      .setDescription("The first warrior to enter the arena")
      .setRequired(true),
  )
  .addUserOption((option) =>
    option
      .setName("fighter2")
      .setDescription("The second warrior to challenge fate")
      .setRequired(true),
  );

interface Fighter {
  user: User;
  name: string;
  hp: number;
  maxHp: number;
  attack: number;
  defense: number;
  speed: number;
  critChance: number;
  abilities: string[];
}

interface BattleEvent {
  attacker: string;
  defender: string;
  action: string;
  damage: number;
  isCrit: boolean;
  abilityUsed?: string;
  narration: string;
  fighter1Hp: number;
  fighter2Hp: number;
}

const battleNarrations = {
  normalAttack: [
    "{attacker} strikes {defender} with fury",
    "{attacker} unleashes a devastating blow upon {defender}",
    "{attacker} channels their inner alter ego against {defender}",
    "{attacker} delivers a blow to {defender}",
    "{attacker} attacks {defender} with determination",
    "{attacker} brings down their wrath on {defender}",
    "{attacker} manifests their true power against {defender}",
    "{attacker} launches a fierce assault on {defender}",
    "{attacker} quickly strikes {defender}",
  ],
  criticalHit: [
    "{attacker} lands a **CRITICAL** strike that shakes the heavens!",
    "{attacker} unleashes a soul-crushing **CRITICAL** blow!",
    "{attacker} empowers their alter ego for a **DEVASTATING** hit!",
    "{attacker} delivers a space-bending **CRITICAL** attack!",
    "{attacker} strikes with the fury of a thousand alters - **CRITICAL**!",
  ],
  dodge: [
    "{defender} gracefully evades {attacker}'s assault",
    "{defender} phases through {attacker}'s attack like a phantom",
    "{defender} reads {attacker}'s movements and dodges perfectly",
    "{defender} vanishes from sight, avoiding {attacker}'s strike",
    "{defender} sidesteps {attacker}'s attack",
    "{defender} anticipates {attacker}'s move and slips away",
  ],
  block: [
    "{defender} raises their guard and blocks {attacker}'s attack",
    "{defender} deflects {attacker}'s strike with divine protection",
    "{defender} absorbs the impact with unwavering resolve",
    "{defender} withstands {attacker}'s attack like a man",
  ],
  death: [
    "{fighter} collapses to the ground, defeated",
    "{fighter} falls with honor, their alter ego proud",
    "{fighter} succumbs to their wounds",
    "{fighter} takes their final breath, at peace",
    "{fighter} is vanquished, their spirit ascending",
    "{fighter} has been defeated, their legacy lives on",
    "{fighter} has fallen in battle",
    "{fighter} has met their pitiful end",
    "{fighter}'s fate is sealed, their alter ego fades",
    "{fighter}'s journey ends here, their alter ego rests",
    "The comfort of death embraces {fighter}",
  ],
  victory: [
    "{winner} stands victorious over the battlefield!",
    "{winner} raises their arms in triumphant glory!",
    "{winner} has proven their supremacy in combat!",
    "{winner} emerges as the ultimate warrior!",
    "{winner} claims the title of champion!",
    "{winner} has prevailed!",
  ],
};

function createHpBar(currentHp: number, maxHp: number): string {
  const percentage = Math.max(0, currentHp / maxHp);
  const barLength = 10;
  const filledBars = Math.floor(percentage * barLength);
  const emptyBars = barLength - filledBars;

  let color = "🟩";
  if (percentage < 0.3) color = "🟥";
  else if (percentage < 0.6) color = "🟨";

  return color.repeat(filledBars) + "⬛".repeat(emptyBars);
}

async function createBattleImage(
  fighter1: User,
  fighter2: User,
  fighter1Name: string,
  fighter2Name: string,
  winner?: User,
): Promise<Buffer> {
  const canvas = createCanvas(1920, 1080);
  const ctx = canvas.getContext("2d");

  const possiblePaths = [
    path.join(process.cwd(), "src", "deathbattle.png"),
    path.join(process.cwd(), "dist", "deathbattle.png"),
    path.join(process.cwd(), "altershaper-bot", "dist", "deathbattle.png"),
  ];

  let background: any = null;

  for (const imagePath of possiblePaths) {
    try {
      background = await loadImage(imagePath);
      break;
    } catch (error) {
      continue;
    }
  }

  try {
    if (background) {
      ctx.drawImage(background, 0, 0, 1920, 1080);
    } else {
      ctx.fillStyle = "#2F3136";
      ctx.fillRect(0, 0, 1920, 1080);
      ctx.fillStyle = "#FFFFFF";
      ctx.font = "bold 66px Verdana";
      ctx.textAlign = "center";
      ctx.fillText("DEATHBATTLE", 960, 540);
    }

    const avatar1 = await loadImage(
      fighter1.displayAvatarURL({ extension: "png", size: 512 }),
    );
    const avatar2 = await loadImage(
      fighter2.displayAvatarURL({ extension: "png", size: 512 }),
    );

    ctx.drawImage(avatar1, 225, 285, 512, 512);
    ctx.drawImage(avatar2, 1183, 285, 512, 512);

    if (winner) {
      const tempCanvas = createCanvas(512, 512);
      const tempCtx = tempCanvas.getContext("2d");

      let loserAvatar: any;
      let loserX: number;

      if (winner.id === fighter1.id) {
        loserAvatar = avatar2;
        loserX = 1183;
      } else {
        loserAvatar = avatar1;
        loserX = 225;
      }

      tempCtx.drawImage(loserAvatar, 0, 0, 512, 512);

      const imageData = tempCtx.getImageData(0, 0, 512, 512);
      const data = imageData.data;

      for (let i = 0; i < data.length; i += 4) {
        const gray = Math.round(
          0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2],
        );
        data[i] = gray;
        data[i + 1] = gray;
        data[i + 2] = gray;
      }

      tempCtx.putImageData(imageData, 0, 0);
      ctx.drawImage(tempCanvas, loserX, 285, 512, 512);

      ctx.fillStyle = "rgba(0, 0, 0, 0.3)";
      ctx.fillRect(loserX, 285, 512, 512);
    }

    ctx.fillStyle = "#FFFFFF";
    ctx.font = "bold 66px Verdana";
    ctx.textAlign = "center";

    // name fighter location
    ctx.fillText(fighter1Name, 475, 908);
    ctx.fillText(fighter2Name, 1440, 908);

    return canvas.toBuffer();
  } catch (error) {
    ctx.fillStyle = "#2F3136";
    ctx.fillRect(0, 0, 1920, 1080);
    ctx.fillStyle = "#FFFFFF";
    ctx.font = "bold 66px Verdana";
    ctx.textAlign = "center";
    ctx.fillText("DEATHBATTLE", 960, 540);
    return canvas.toBuffer();
  }
}

async function simulateBattleStep(
  fighter1: Fighter,
  fighter2: Fighter,
  fighters: Fighter[],
  currentFighter: number,
): Promise<{ event: BattleEvent; newCurrentFighter: number }> {
  const attacker = fighters[currentFighter];
  const defender = fighters[1 - currentFighter];

  const useAbility = Math.random() < 0.25 && attacker.abilities.length > 0;
  let damage = 0;
  let action = "attack";
  let abilityUsed: string | undefined;
  let narration = "";

  if (useAbility) {
    abilityUsed =
      attacker.abilities[Math.floor(Math.random() * attacker.abilities.length)];

    switch (abilityUsed) {
      case "Alter Ego Burst":
        damage = Math.floor(attacker.attack * 1.5);
        narration = `💥 **${attacker.name}** channels their alter ego for a devastating burst attack!`;
        break;
      case "Divine Shield":
        attacker.defense += 3;
        narration = `🛡️ **${attacker.name}** raises a divine shield, increasing their defense!`;
        break;
      case "Shadow Clone":
        damage = Math.floor(attacker.attack * 0.8);
        narration = `👥 **${attacker.name}** creates shadow clones, striking from multiple angles!`;
        break;
      case "Healing Light":
        const heal = Math.floor(attacker.maxHp * 0.2);
        attacker.hp = Math.min(attacker.hp + heal, attacker.maxHp);
        narration = `✨ **${attacker.name}** bathes in healing light, restoring ${heal} HP!`;
        break;
      case "Berserker Rage":
        attacker.attack += 3;
        attacker.defense = Math.max(1, attacker.defense - 2);
        narration = `😡 **${attacker.name}** enters a berserker rage! (+3 ATK, -2 DEF)`;
        break;
      case "Time Slow":
        attacker.speed += 3;
        narration = `⏰ **${attacker.name}** manipulates time, increasing their speed!`;
        break;
      case "Soul Strike":
        damage = Math.floor(attacker.attack * 1.3);
        narration = `👻 **${attacker.name}** strikes directly at **${defender.name}**'s soul!`;
        break;
      case "Phoenix Rising":
        if (attacker.hp < attacker.maxHp * 0.3) {
          const heal = Math.floor(attacker.maxHp * 0.4);
          attacker.hp = Math.min(attacker.hp + heal, attacker.maxHp);
          narration = `🔥 **${attacker.name}** rises like a phoenix, healing for ${heal} HP!`;
        } else {
          damage = Math.floor(attacker.attack * 1.2);
          narration = `🔥 **${attacker.name}** strikes with phoenix fire!`;
        }
        break;
      case "Relic of Exo":
        damage = Math.floor(attacker.attack * 1.4);
        narration = `🏺 **${attacker.name}** unleashes the power of the Relic of Exo, bypassing all defenses!`;
        break;
      case "Ego's Blessing":
        attacker.attack += 2;
        attacker.defense += 2;
        attacker.speed += 2;
        narration = `🌟 **${attacker.name}** receives Ego's divine blessing! (+2 to all stats)`;
        break;
      case "Cleansing":
        const cleanseHeal = Math.floor(attacker.maxHp * 0.15);
        attacker.hp = Math.min(attacker.hp + cleanseHeal, attacker.maxHp);
        narration = `🌿 **${attacker.name}** cleanses their body and soul, healing ${cleanseHeal} HP and purifying debuffs!`;
        break;
      case "Raise the Dead":
        if (attacker.hp < attacker.maxHp * 0.25) {
          const reviveHeal = Math.floor(attacker.maxHp * 0.5);
          attacker.hp = Math.min(attacker.hp + reviveHeal, attacker.maxHp);
          narration = `⚰️ **${attacker.name}** calls upon the dead, cheating death with ${reviveHeal} HP!`;
        } else {
          damage = Math.floor(attacker.attack * 1.1);
          narration = `⚰️ **${attacker.name}** summons the spirits of the fallen to strike!`;
        }
        break;
      case "Warrior's Call":
        attacker.attack += 4;
        narration = `🗡️ **${attacker.name}** lets out a warrior's cry, increasing their battle fury! (+4 ATK)`;
        break;
      case "Drop the Beat":
        defender.speed = Math.max(1, defender.speed - 3);
        narration = `🎵 **${attacker.name}** drops the beat, disrupting **${defender.name}**'s rhythm! (-3 SPD to enemy)`;
        break;
      case "Call to Arms":
        const hits = 3;
        damage = Math.floor(attacker.attack * 0.6) * hits;
        narration = `📯 **${attacker.name}** sounds the call to arms, a platoon of soldiers unleashed a flurry of ${hits} bullets!`;
        break;
      case "Airstrike":
        damage = Math.floor(attacker.attack * 1.6);
        narration = `✈️ **${attacker.name}** calls in an airstrike from above, raining destruction!`;
        break;
      case "Divine Intervention":
        const divineHeal = Math.floor(attacker.maxHp * 0.3);
        attacker.hp = Math.min(attacker.hp + divineHeal, attacker.maxHp);
        attacker.defense += 5;
        narration = `⭐ **${attacker.name}** receives divine intervention, healing ${divineHeal} HP and gaining divine protection!`;
        break;
      case "Great Will":
        const missingHp = attacker.maxHp - attacker.hp;
        damage = Math.floor(attacker.attack + missingHp * 0.5);
        narration = `👑 **${attacker.name}** channels their great will, converting their wounds into raw power!`;
        break;
    }
  } else {
    const baseDamage = attacker.attack;
    const isCrit = Math.random() < attacker.critChance;
    damage = isCrit ? Math.floor(baseDamage * 1.8) : baseDamage;

    const defenseRoll = Math.random();
    const canBlock =
      abilityUsed !== "Airstrike" && abilityUsed !== "Relic of Exo";

    if (defenseRoll < 0.15) {
      damage = 0;
      action = "dodge";
      narration = `💨 **${defender.name}** ${battleNarrations.dodge[
        Math.floor(Math.random() * battleNarrations.dodge.length)
      ]
        .replace("{defender}", "")
        .replace("{attacker}", `**${attacker.name}**'s`)}`;
    } else if (defenseRoll < 0.25 && canBlock) {
      damage = Math.max(1, damage - defender.defense);
      action = "block";
      narration = `🛡️ **${defender.name}** ${battleNarrations.block[
        Math.floor(Math.random() * battleNarrations.block.length)
      ]
        .replace("{defender}", "")
        .replace("{attacker}", `**${attacker.name}**'s`)}`;
    } else {
      if (abilityUsed === "Relic of Exo") {
        damage = Math.max(1, damage);
      } else {
        damage = Math.max(1, damage - Math.floor(defender.defense / 2));
      }

      if (isCrit) {
        narration = `💥 ${battleNarrations.criticalHit[
          Math.floor(Math.random() * battleNarrations.criticalHit.length)
        ].replace("{attacker}", `**${attacker.name}**`)}`;
      } else {
        narration = `⚔️ ${battleNarrations.normalAttack[
          Math.floor(Math.random() * battleNarrations.normalAttack.length)
        ]
          .replace("{attacker}", `**${attacker.name}**`)
          .replace("{defender}", `**${defender.name}**`)}`;
      }
    }
  }

  if (damage > 0) {
    defender.hp = Math.max(0, defender.hp - damage);
    if (damage > 0 && !narration.includes("HP")) {
      narration += ` **(${damage} dmg)**`;
    }
  }

  const event: BattleEvent = {
    attacker: attacker.name,
    defender: defender.name,
    action,
    damage,
    isCrit: action === "attack" && Math.random() < attacker.critChance,
    abilityUsed,
    narration,
    fighter1Hp: fighter1.hp,
    fighter2Hp: fighter2.hp,
  };

  return {
    event,
    newCurrentFighter: 1 - currentFighter,
  };
}

function generateFighter(user: User, displayName: string): Fighter {
  function hashString(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = ((hash << 5) - hash + str.charCodeAt(i)) >>> 0;
    }
    return hash;
  }

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

  let percentage: number;

  if (displayName in nameToLevel) {
    const level = nameToLevel[displayName];
    percentage = level === 0 ? -100 : level === 11 ? 100 : (level - 1) * 10 + 9;
  } else {
    const hash = hashString(displayName);
    percentage = hash % 101;
  }

  const auraMultiplier = Math.max(0, (percentage + 100) / 200);

  // Base stats + aura bonus
  const baseHp = Math.floor(80 + auraMultiplier * 40); // 80-120 HP
  const baseAttack = Math.floor(15 + auraMultiplier * 10); // 15-25 ATK
  const baseDefense = Math.floor(5 + auraMultiplier * 10); // 5-15 DEF
  const baseSpeed = Math.floor(10 + auraMultiplier * 10); // 10-20 SPD
  const critChance = 0.1 + auraMultiplier * 0.2; // 0.1-0.3 crit chance

  const abilities = [
    "Alter Ego Burst",
    "Divine Shield",
    "Shadow Clone",
    "Healing Light",
    "Berserker Rage",
    "Time Slow",
    "Soul Strike",
    "Phoenix Rising",
    "Relic of Exo",
    "Ego's Blessing",
    "Cleansing",
    "Raise the Dead",
    "Warrior's Call",
    "Drop the Beat",
    "Call to Arms",
    "Airstrike",
    "Divine Intervention",
    "Great Will",
  ];

  let seed = Math.abs(percentage) + 1000;
  const random = () => {
    seed = (seed * 9301 + 49297) % 233280;
    return seed / 233280;
  };

  const selectedAbilities = [];
  const abilityPool = [...abilities];
  for (let i = 0; i < 2; i++) {
    const index = Math.floor(random() * abilityPool.length);
    selectedAbilities.push(abilityPool.splice(index, 1)[0]);
  }

  return {
    user,
    name: displayName,
    hp: baseHp,
    maxHp: baseHp,
    attack: baseAttack,
    defense: baseDefense,
    speed: baseSpeed,
    critChance,
    abilities: selectedAbilities,
  };
}

export async function execute(
  interaction: ChatInputCommandInteraction,
): Promise<void> {
  const fighter1User = interaction.options.getUser("fighter1")!;
  const fighter2User = interaction.options.getUser("fighter2")!;

  if (fighter1User.id === fighter2User.id) {
    await interaction.reply({
      content:
        "**A soul cannot battle against itself! Choose two different warriors!**",
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  await interaction.deferReply();

  try {
    let fighter1DisplayName: string;
    let fighter2DisplayName: string;

    if (interaction.inGuild()) {
      const member1 = await interaction.guild!.members.fetch(fighter1User.id);
      const member2 = await interaction.guild!.members.fetch(fighter2User.id);
      fighter1DisplayName = member1.displayName;
      fighter2DisplayName = member2.displayName;
    } else {
      fighter1DisplayName = fighter1User.username;
      fighter2DisplayName = fighter2User.username;
    }

    const fighter1 = generateFighter(fighter1User, fighter1DisplayName);
    const fighter2 = generateFighter(fighter2User, fighter2DisplayName);

    const imageBuffer = await createBattleImage(
      fighter1User,
      fighter2User,
      fighter1DisplayName,
      fighter2DisplayName,
    );
    const attachment = new AttachmentBuilder(imageBuffer, {
      name: "deathbattle.png",
    });

    const fighters = [fighter1, fighter2].sort((a, b) => b.speed - a.speed);
    let currentFighter = 0;
    let turn = 0;
    let battleLog: string[] = [];

    const setupEmbed = new EmbedBuilder()
      .setColor("#2E2B5F")
      .setTitle("⚔️ THE HEAVENS HAVE DECLARED A DEATHBATTLE!")
      .setDescription(
        `**Two warriors enter the sacred arena of combat!**\n\n` +
          `**${fighter1.name}** vs **${fighter2.name}**\n\n` +
          `🏃 **${fighters[0].name}** moves first with superior speed!\n\n` +
          `**Fighter Stats:**\n` +
          `🔴 **${fighter1.name}**: ${fighter1.maxHp} HP | ${fighter1.attack} ATK | ${fighter1.defense} DEF | ${fighter1.speed} SPD\n` +
          `🔵 **${fighter2.name}**: ${fighter2.maxHp} HP | ${fighter2.attack} ATK | ${fighter2.defense} DEF | ${fighter2.speed} SPD\n\n` +
          `⚔️ **Battle begins in 3 seconds...**`,
      )
      .setImage("attachment://deathbattle.png");

    await interaction.editReply({ embeds: [setupEmbed], files: [attachment] });

    await new Promise((resolve) => setTimeout(resolve, 3000));

    while (fighter1.hp > 0 && fighter2.hp > 0 && turn < 25) {
      const stepResult = await simulateBattleStep(
        fighter1,
        fighter2,
        fighters,
        currentFighter,
      );
      const event = stepResult.event;
      battleLog.push(event.narration);
      currentFighter = stepResult.newCurrentFighter;
      turn++;

      const progressEmbed = new EmbedBuilder()
        .setColor("#35C2FF")
        .setTitle("⚔️ BATTLE IN PROGRESS")
        .setDescription(
          `**Turn ${turn}** - The battle rages on!\n\n` +
            `**Current HP:**\n` +
            `🔴 **${fighter1.name}**: ${fighter1.hp}/${fighter1.maxHp} HP\n` +
            `${createHpBar(fighter1.hp, fighter1.maxHp)}\n\n` +
            `🔵 **${fighter2.name}**: ${fighter2.hp}/${fighter2.maxHp} HP\n` +
            `${createHpBar(fighter2.hp, fighter2.maxHp)}\n\n` +
            `**The Battle:**\n` +
            battleLog.slice(-5).join("\n"),
        )
        .setImage("attachment://deathbattle.png")
        .setFooter({ text: "Battle continues..." });

      await interaction.editReply({ embeds: [progressEmbed] });

      if (fighter1.hp <= 0 || fighter2.hp <= 0) {
        break;
      }

      await new Promise((resolve) => setTimeout(resolve, 2000));
    }

    const loser = fighter1.hp <= 0 ? fighter1 : fighter2;
    const winner = fighter1.hp > 0 ? fighter1 : fighter2;

    const deathNarration = battleNarrations.death[
      Math.floor(Math.random() * battleNarrations.death.length)
    ].replace("{fighter}", `**${loser.name}**`);
    battleLog.push(`💀 ${deathNarration}`);

    const victoryNarration = battleNarrations.victory[
      Math.floor(Math.random() * battleNarrations.victory.length)
    ].replace("{winner}", `**${winner.name}**`);
    battleLog.push(`🏆 ${victoryNarration}`);

    const finalImageBuffer = await createBattleImage(
      fighter1User,
      fighter2User,
      fighter1DisplayName,
      fighter2DisplayName,
      winner.user,
    );
    const finalAttachment = new AttachmentBuilder(finalImageBuffer, {
      name: "deathbattle-final.png",
    });

    const finalEmbed = new EmbedBuilder()
      .setColor("#FFD700")
      .setTitle("🏆 THE DEATHBATTLE HAS CONCLUDED")
      .setDescription(
        `**${winner.name}** emerges victorious after ${turn} turns!\n\n` +
          `**Final Results:**\n` +
          `🏆 **Victor:** ${winner.name} (${winner.hp}/${winner.maxHp} HP)\n` +
          `💀 **Defeated:** ${loser.name} (0/${loser.maxHp} HP)\n\n` +
          `**Battle Conclusion:**\n` +
          battleLog.slice(-3).join("\n") +
          "\n\n" +
          `*The arena falls silent as ${winner.name} stands triumphant...*`,
      )
      .setImage("attachment://deathbattle-final.png")
      .setFooter({
        text: `Battle lasted ${turn} turns | The heavens shall remember this epic clash`,
      })
      .setTimestamp();

    await interaction.editReply({
      embeds: [finalEmbed],
      files: [finalAttachment],
    });
  } catch (error) {
    await interaction.editReply({
      content:
        "**THE DIVINE POWERS HAVE FAILED TO MANIFEST THE BATTLE! The arena remains empty.**",
    });
  }
}
