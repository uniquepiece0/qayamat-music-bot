
const { Telegraf, Markup } = require("telegraf");
const yts = require("yt-search");

const BOT_TOKEN = process.env.BOT_TOKEN;

if (!BOT_TOKEN) {
  console.error("BOT_TOKEN missing!");
  process.exit(1);
}

const bot = new Telegraf(BOT_TOKEN);

// Start
bot.start((ctx) => {
  ctx.reply(
    "🎧 Welcome to Qayamat × Beats!\n\n" +
    "🎵 Audio ke liye:\n" +
    "/play song name\n\n" +
    "🎬 Video ke liye:\n" +
    "/vplay song name\n\n" +
    "Example:\n" +
    "/play Arijit Singh\n" +
    "/vplay Kesariya\n\n" +
    "/help - Help\n" +
    "/ping - Bot status"
  );
});

// Help
bot.command("help", (ctx) => {
  ctx.reply(
    "🎵 Qayamat × Beats Help\n\n" +
    "/play - Audio music search\n" +
    "/vplay - Video music search\n" +
    "/ping - Check bot status"
  );
});

// Ping
bot.command("ping", (ctx) => {
  ctx.reply("🏓 Qayamat × Beats is Online!");
});

// Search function
async function searchSongs(ctx, mode) {
  const query = ctx.message.text
    .split(" ")
    .slice(1)
    .join(" ")
    .trim();

  if (!query) {
    return ctx.reply(
      mode === "audio"
        ? "🎵 Song ka naam likho.\n\nExample:\n/play Kesariya"
        : "🎬 Song ka naam likho.\n\nExample:\n/vplay Kesariya"
    );
  }

  await ctx.reply("🔎 Song search ho raha hai...");

  try {
    const results = await yts(query);
    const videos = results.videos.slice(0, 5);

    if (!videos.length) {
      return ctx.reply("❌ Koi song nahi mila.");
    }

    for (let i = 0; i < videos.length; i++) {
      const video = videos[i];

      const buttonText =
        mode === "audio"
          ? "▶️ Play Audio"
          : "🎬 Play Video";

      await ctx.reply(
        `🎵 ${video.title}\n\n` +
        `⏱ Duration: ${video.timestamp}\n` +
        `👁 Views: ${video.views}\n\n` +
        `👇 Play karne ke liye button dabayein:`,
        Markup.inlineKeyboard([
          [
            Markup.button.callback(
              buttonText,
              `${mode}:${video.videoId}`
            )
          ]
        ])
      );
    }

  } catch (error) {
    console.error("Search error:", error);
    await ctx.reply(
      "❌ Search error. Thodi der baad try karo."
    );
  }
}

// Audio command
bot.command("play", async (ctx) => {
  await searchSongs(ctx, "audio");
});

// Video command
bot.command("vplay", async (ctx) => {
  await searchSongs(ctx, "video");
});

// Audio playback button
bot.action(/^audio:(.+)$/, async (ctx) => {
  try {
    const videoId = ctx.match[1];
    const videoUrl =
      `https://www.youtube.com/watch?v=${videoId}`;

    await ctx.answerCbQuery("🎵 Audio request bhej rahe hain...");

    await ctx.telegram.sendMessage(
      ctx.callbackQuery.message.chat.id,
      `/qplay ${videoUrl}`
    );

    await ctx.reply("🎧 Audio playback request sent!");

  } catch (error) {
    console.error("Audio play error:", error);
    await ctx.answerCbQuery("❌ Audio request failed.");
  }
});

// Video playback button
bot.action(/^video:(.+)$/, async (ctx) => {
  try {
    const videoId = ctx.match[1];
    const videoUrl =
      `https://www.youtube.com/watch?v=${videoId}`;

    await ctx.answerCbQuery("🎬 Video request bhej rahe hain...");

    await ctx.telegram.sendMessage(
      ctx.callbackQuery.message.chat.id,
      `/qvplay ${videoUrl}`
    );

    await ctx.reply("🎬 Video playback request sent!");

  } catch (error) {
    console.error("Video play error:", error);
    await ctx.answerCbQuery("❌ Video request failed.");
  }
});

// Launch bot
bot.launch();

console.log("Qayamat × Beats Started!");

process.once("SIGINT", () => bot.stop("SIGINT"));
process.once("SIGTERM", () => bot.stop("SIGTERM"));
             
