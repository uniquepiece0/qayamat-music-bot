
const { Telegraf } = require("telegraf");
const yts = require("yt-search");

const BOT_TOKEN = process.env.BOT_TOKEN;

if (!BOT_TOKEN) {
  console.error("BOT_TOKEN missing!");
  process.exit(1);
}

const bot = new Telegraf(BOT_TOKEN);

bot.start((ctx) => {
  ctx.reply(
    "🎧 Welcome to Qayamat × Beats!\n\n" +
    "🎵 Song search ke liye:\n" +
    "/play song name\n\n" +
    "Example:\n" +
    "/play Arijit Singh songs\n\n" +
    "/help - Help\n" +
    "/ping - Bot status"
  );
});

bot.command("help", (ctx) => {
  ctx.reply(
    "🎵 Qayamat × Beats Help\n\n" +
    "/start - Start bot\n" +
    "/play - Search song\n" +
    "/ping - Check bot status"
  );
});

bot.command("ping", (ctx) => {
  ctx.reply("🏓 Qayamat × Beats is Online!");
});

bot.command("play", async (ctx) => {
  const query = ctx.message.text.split(" ").slice(1).join(" ").trim();

  if (!query) {
    return ctx.reply(
      "🎵 Song ka naam likho.\n\nExample:\n/play Kesariya"
    );
  }

  await ctx.reply("🔎 Song search ho raha hai...");

  try {
    const results = await yts(query);
    const videos = results.videos.slice(0, 5);

    if (!videos.length) {
      return ctx.reply("❌ Koi song nahi mila.");
    }

    let message = "🎵 Search Results\n\n";

    videos.forEach((video, index) => {
      message +=
        `${index + 1}. ${video.title}\n` +
        `⏱ ${video.timestamp}\n` +
        `🔗 ${video.url}\n\n`;
    });

    await ctx.reply(message);
  } catch (error) {
    console.error("Search error:", error);
    await ctx.reply("❌ Search error. Thodi der baad try karo.");
  }
});

bot.launch();

console.log("Qayamat × Beats Started!");

process.once("SIGINT", () => bot.stop("SIGINT"));
process.once("SIGTERM", () => bot.stop("SIGTERM"));
