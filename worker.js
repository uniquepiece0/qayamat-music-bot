
const { Telegraf } = require("telegraf");

const BOT_TOKEN = process.env.BOT_TOKEN;

if (!BOT_TOKEN) {
  console.error("BOT_TOKEN missing!");
  process.exit(1);
}

const bot = new Telegraf(BOT_TOKEN);

bot.start((ctx) => {
  ctx.reply(
    "🎵 Welcome to Qayamat Music Bot!\n\n" +
    "Music Bot mein aapka swagat hai.\n\n" +
    "🎧 Music features jald hi aayenge!"
  );
});

bot.command("help", (ctx) => {
  ctx.reply(
    "🎵 Qayamat Music Bot Help\n\n" +
    "/start - Start bot\n" +
    "/help - Help menu\n" +
    "/ping - Check bot status"
  );
});

bot.command("ping", (ctx) => {
  ctx.reply("🏓 Qayamat Music Bot is Online!");
});

bot.launch();

console.log("Qayamat Music Bot Started!");

process.once("SIGINT", () => bot.stop("SIGINT"));
process.once("SIGTERM", () => bot.stop("SIGTERM"));
    
