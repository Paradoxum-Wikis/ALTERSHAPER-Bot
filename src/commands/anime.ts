import {
  ChatInputCommandInteraction,
  SlashCommandBuilder,
  EmbedBuilder,
  AttachmentBuilder,
} from "discord.js";

export const data = new SlashCommandBuilder()
  .setName("anime")
  .setDescription("Summon a random anime image from the archives")
  .addStringOption((option) =>
    option
      .setName("include")
      .setDescription(
        "Include specific tags (comma-separated, e.g: girl, long_hair)",
      )
      .setRequired(false),
  )
  .addStringOption((option) =>
    option
      .setName("exclude")
      .setDescription(
        "Exclude specific tags (comma-separated, e.g: boy, short_hair)",
      )
      .setRequired(false),
  )
  .addIntegerOption((option) =>
    option
      .setName("min_size")
      .setDescription("Minimum image size (width/height)")
      .setMinValue(100)
      .setMaxValue(4000)
      .setRequired(false),
  )
  .addIntegerOption((option) =>
    option
      .setName("max_size")
      .setDescription("Maximum image size (width/height)")
      .setMinValue(500)
      .setMaxValue(8000)
      .setRequired(false),
  )
  .addBooleanOption((option) =>
    option
      .setName("high_quality")
      .setDescription("Use high quality (non-compressed) images")
      .setRequired(false),
  );

interface AnimeImageResponse {
  file_url: string;
  md5: string;
  tags: string[];
  width: number;
  height: number;
  source?: string;
  author?: string;
  has_children: boolean;
  _id: number;
}

const API_BASE_URL = "https://pic.re";

export async function execute(
  interaction: ChatInputCommandInteraction,
): Promise<void> {
  await interaction.deferReply();

  try {
    const includeParam = interaction.options.getString("include");
    const excludeParam = interaction.options.getString("exclude");
    const minSize = interaction.options.getInteger("min_size");
    const maxSize = interaction.options.getInteger("max_size");
    const highQuality = interaction.options.getBoolean("high_quality") ?? false;
    const params = new URLSearchParams();

    if (includeParam) {
      const includeTags = includeParam
        .split(",")
        .map((tag) => tag.trim().toLowerCase())
        .filter((tag) => tag.length > 0);
      if (includeTags.length > 0) {
        params.append("in", includeTags.join(","));
      }
    }

    if (excludeParam) {
      const excludeTags = excludeParam
        .split(",")
        .map((tag) => tag.trim().toLowerCase())
        .filter((tag) => tag.length > 0);
      if (excludeTags.length > 0) {
        params.append("nin", excludeTags.join(","));
      }
    }

    if (minSize) {
      params.append("min_size", minSize.toString());
    }

    if (maxSize) {
      params.append("max_size", maxSize.toString());
    }

    if (!highQuality) {
      params.append("compress", "true");
    }

    const metadataUrl = `${API_BASE_URL}/image.json${params.toString() ? "?" + params.toString() : ""}`;
    console.log(`[ANIME] Fetching metadata from: ${metadataUrl}`);

    const response = await fetch(metadataUrl);

    if (!response.ok) {
      throw new Error(`API responded with status: ${response.status}`);
    }

    const imageData = (await response.json()) as AnimeImageResponse;

    let imageUrl = imageData.file_url;
    if (!imageUrl.startsWith("http://") && !imageUrl.startsWith("https://")) {
      imageUrl = `https://${imageUrl}`;
    }

    console.log(`[ANIME] Fetching image from: ${imageUrl}`);
    const imageResponse = await fetch(imageUrl);

    if (!imageResponse.ok) {
      throw new Error(
        `Image fetch failed with status: ${imageResponse.status}`,
      );
    }

    const imageBuffer = Buffer.from(await imageResponse.arrayBuffer());
    const urlParts = imageUrl.split(".");
    const extension = urlParts[urlParts.length - 1].split("?")[0] || "jpg";
    const attachment = new AttachmentBuilder(imageBuffer, {
      name: `anime_${imageData._id}.${extension}`,
    });

    const embed = new EmbedBuilder()
      .setColor("#ff90c8")
      .setTitle("🎨 ARTWORK SUMMONED")
      .setDescription("**An image has been retrieved from the archives!**")
      .setImage(`attachment://anime_${imageData._id}.${extension}`)
      .addFields({
        name: "📊 Details",
        value: `**Dimensions:** ${imageData.width} × ${imageData.height}px`,
        inline: true,
      })
      .setFooter({
        text: "Sacred archives of pic.re",
      })
      .setTimestamp();

    if (imageData.author) {
      embed.addFields({
        name: "👤 Artist",
        value: imageData.author,
        inline: true,
      });
    }

    if (imageData.source) {
      embed.addFields({
        name: "🔗 Source",
        value: `[Original Artwork](${imageData.source})`,
        inline: true,
      });
    }

    if (imageData.tags && imageData.tags.length > 0) {
      const displayTags = imageData.tags.slice(0, 20);
      const tagString = displayTags.map((tag) => `\`${tag}\``).join(", ");
      const moreTagsText =
        imageData.tags.length > 20
          ? ` and ${imageData.tags.length - 20} more...`
          : "";

      embed.addFields({
        name: `🏷️ Tags (${imageData.tags.length})`,
        value: tagString + moreTagsText,
        inline: false,
      });
    }

    await interaction.editReply({
      embeds: [embed],
      files: [attachment],
    });
  } catch (error) {
    console.error("Error fetching image:", error);

    let errorMessage = "**THE ARCHIVES HAVE FAILED TO RESPOND!**";

    // i may make these ephemerals in the future,
    // but for now i want to know errors in pubs too
    // in case the moment someone run into this issue
    if (error instanceof Error) {
      if (error.message.includes("404")) {
        errorMessage =
          "**NO IMAGES FOUND MATCHING YOUR CRITERIA!** Try different tags or remove some filters.";
      } else if (error.message.includes("403")) {
        errorMessage =
          "**ACCESS TO THE ARCHIVES IS FORBIDDEN!** The API may be temporarily unavailable.";
      } else if (error.message.includes("timeout")) {
        errorMessage =
          "**THE ARCHIVES ARE TAKING TOO LONG TO RESPOND!** Please try again.";
      }
    }

    await interaction.editReply({
      content: errorMessage,
    });
  }
}
