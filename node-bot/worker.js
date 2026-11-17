const { Telegraf } = require("telegraf");
const yts = require("yt-search");

const BOT_TOKEN = process.env.BOT_TOKEN;

if (!BOT_TOKEN) {
  console.error("BOT_TOKEN missing!");
  process.exit(1);
}

const bot = new Telegraf(BOT_TOKEN);

bot.start((ctx) => {
  ctx.reply("🎧 Welcome to Qayamat Music!\n\n/play song name");
});

bot.command("ping", (ctx) => {
  ctx.reply("🏓 Qayamat Music is Online!");
});

bot.command("play", async (ctx) => {
  const query = ctx.message.text.split(" ").slice(1).join(" ").trim();

  if (!query) {
    return ctx.reply("🎵 Example: /play Kesariya");
  }

  await ctx.reply("🔎 Song search ho raha hai...");

  try {
    const results = await yts(query);
    const video = results.videos[0];

    if (!video) return ctx.reply("❌ Song nahi mila.");

    await ctx.reply(
      `🎵 ${video.title}\n⏱ ${video.timestamp}\n🔗 ${video.url}`
    );
  } catch (error) {
    console.error(error);
    await ctx.reply("❌ Search error.");
  }
});

bot.launch();
console.log("Qayamat Music Bot Started!");
