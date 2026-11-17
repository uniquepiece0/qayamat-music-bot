
const { Telegraf, Markup } = require("telegraf");
const yts = require("yt-search");

const BOT_TOKEN = process.env.BOT_TOKEN;

if (!BOT_TOKEN) {
  console.error("BOT_TOKEN missing!");
  process.exit(1);
}

const bot = new Telegraf(BOT_TOKEN);

// Har group ki alag music queue
const music = {};

function getMusic(chatId) {
  if (!music[chatId]) {
    music[chatId] = {
      current: null,
      queue: [],
      playerMessageId: null
    };
  }
  return music[chatId];
}

function playerButtons() {
  return Markup.inlineKeyboard([
    [
      Markup.button.callback("⏸ Pause", "pause"),
      Markup.button.callback("▶️ Resume", "resume")
    ],
    [
      Markup.button.callback("⏭ Skip", "skip"),
      Markup.button.callback("⏹ Stop", "stop")
    ],
    [
      Markup.button.callback("📋 Queue", "queue"),
      Markup.button.callback("❌ Cancel", "cancel")
    ]
  ]);
}

async function playNext(ctx, chatId) {
  const data = getMusic(chatId);
  const song = data.queue.shift();

  if (!song) {
    data.current = null;
    return false;
  }

  data.current = song;

  await ctx.telegram.sendMessage(
    chatId,
    `/qplay ${song.url}`
  );

  const text = `🎧 QAYAMAT MUSIC PLAYER\n\n🎵 ${song.title}\n\n<escape>▶️</escape> Now Playing`;

  if (data.playerMessageId) {
    try {
      await ctx.telegram.editMessageText(
        chatId,
        data.playerMessageId,
        undefined,
        text,
        playerButtons()
      );
      return true;
    } catch (e) {}
  }

  const msg = await ctx.telegram.sendMessage(
    chatId,
    text,
    playerButtons()
  );

  data.playerMessageId = msg.message_id;
  return true;
}

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

  const chatId = ctx.chat.id;
  const data = getMusic(chatId);

  const status = await ctx.reply("🔎 Song search ho raha hai...");

  try {
    const results = await yts(query);
    const video = results.videos[0];

    if (!video) {
      await ctx.telegram.deleteMessage(chatId, status.message_id);
      return ctx.reply("❌ Song nahi mila.");
    }

    data.queue.push({
      title: video.title,
      url: video.url
    });

    await ctx.telegram.deleteMessage(chatId, status.message_id);

    if (!data.current) {
      await playNext(ctx, chatId);
    } else {
      await ctx.reply(`📋 Queue mein add hua:\n🎵 ${video.title}`);
    }

  } catch (error) {
    console.error(error);
    await ctx.telegram.deleteMessage(chatId, status.message_id).catch(() => {});
    await ctx.reply("❌ Search error.");
  }
});

bot.action("pause", async (ctx) => {
  await ctx.answerCbQuery("⏸ Pausing...");
  await ctx.telegram.sendMessage(ctx.chat.id, "/qpause");
});

bot.action("resume", async (ctx) => {
  await ctx.answerCbQuery("▶️ Resuming...");
  await ctx.telegram.sendMessage(ctx.chat.id, "/qresume");
});

bot.action("stop", async (ctx) => {
  const data = getMusic(ctx.chat.id);
  data.queue = [];
  data.current = null;

  await ctx.answerCbQuery("⏹ Music stopped");
  await ctx.telegram.sendMessage(ctx.chat.id, "/qstop");
});

bot.action("skip", async (ctx) => {
  const chatId = ctx.chat.id;
  const data = getMusic(chatId);

  if (!data.queue.length) {
    return ctx.answerCbQuery("❌ Queue mein agla song nahi hai.");
  }

  await ctx.answerCbQuery("⏭ Skipping...");
  await ctx.telegram.sendMessage(chatId, "/qstop");
  await playNext(ctx, chatId);
});

bot.action("queue", async (ctx) => {
  const data = getMusic(ctx.chat.id);

  const songs = data.queue.length
    ? data.queue.map((song, i) => `${i + 1}. ${song.title}`).join("\n")
    : "Queue khaali hai.";

  await ctx.answerCbQuery();
  await ctx.reply(`📋 SONG QUEUE\n\n${songs}`);
});

bot.action("cancel", async (ctx) => {
  const data = getMusic(ctx.chat.id);
  data.queue = [];
  data.current = null;

  await ctx.answerCbQuery("❌ Player cancelled");
  await ctx.telegram.sendMessage(ctx.chat.id, "/qstop");

  if (data.playerMessageId) {
    await ctx.telegram.deleteMessage(
      ctx.chat.id,
      data.playerMessageId
    ).catch(() => {});

    data.playerMessageId = null;
  }
});

bot.launch();
console.log("Qayamat Music Bot Started!");
