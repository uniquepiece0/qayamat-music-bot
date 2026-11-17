
const { Telegraf, Markup } = require("telegraf");
const yts = require("yt-search");

const BOT_TOKEN = process.env.BOT_TOKEN;

if (!BOT_TOKEN) {
  console.error("BOT_TOKEN missing!");
  process.exit(1);
}

const bot = new Telegraf(BOT_TOKEN);

const music = {};

function getMusic(chatId) {
  if (!music[chatId]) {
    music[chatId] = {
      current: null,
      queue: [],
      advancing: false,
      progressTimer: null
    };
  }
  return music[chatId];
}

function formatTime(seconds) {
  seconds = Math.max(0, Math.floor(seconds || 0));
  const min = Math.floor(seconds / 60);
  const sec = seconds % 60;
  return `${min}:${String(sec).padStart(2, "0")}`;
}

function progressBar(elapsed, duration) {
  const total = 12;
  const filled = duration > 0
    ? Math.min(total, Math.floor((elapsed / duration) * total))
    : 0;

  return "▰".repeat(filled) + "▱".repeat(total - filled);
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

function panelText(song, elapsed, status = "▶️ Playing") {
  return (
    `🎧 QAYAMAT MUSIC PLAYER\n\n` +
    `🎵 ${song.title}\n\n` +
    `👤 Requested by: ${song.requestedBy}\n\n` +
    `${progressBar(elapsed, song.duration)}\n` +
    `⏱ ${formatTime(elapsed)} / ${formatTime(song.duration)}\n\n` +
    `${status}`
  );
}

async function updateProgress(ctx, chatId) {
  const data = getMusic(chatId);
  const song = data.current;

  if (!song || !song.panelMessageId) return;

  const elapsed = Math.min(
    song.duration,
    Math.floor((Date.now() - song.startedAt) / 1000)
  );

  try {
    await ctx.telegram.editMessageText(
      chatId,
      song.panelMessageId,
      undefined,
      panelText(song, elapsed),
      playerButtons()
    );
  } catch (error) {
    // Same text ya Telegram edit error ko ignore karo
  }
}

function stopProgress(data) {
  if (data.progressTimer) {
    clearInterval(data.progressTimer);
    data.progressTimer = null;
  }
}

async function finishCurrent(ctx, chatId, status) {
  const data = getMusic(chatId);
  const song = data.current;

  stopProgress(data);

  if (song && song.panelMessageId) {
    try {
      await ctx.telegram.editMessageText(
        chatId,
        song.panelMessageId,
        undefined,
        panelText(song, song.duration, status)
      );
    } catch (error) {}
  }
}

async function playNext(ctx, chatId) {
  const data = getMusic(chatId);
  const song = data.queue.shift();

  if (!song) {
    data.current = null;
    return false;
  }

  stopProgress(data);

  data.current = song;
  song.startedAt = Date.now();

  await ctx.telegram.sendMessage(
    chatId,
    `/qplay ${song.url}`
  );

  // Har song ka alag player panel
  const msg = await ctx.telegram.sendMessage(
    chatId,
    panelText(song, 0),
    playerButtons()
  );

  song.panelMessageId = msg.message_id;

  // Har 10 second mein progress update
  data.progressTimer = setInterval(() => {
    updateProgress(ctx, chatId).catch(console.error);
  }, 10000);

  return true;
}

// Start
bot.start((ctx) => {
  ctx.reply("🎧 Welcome to Qayamat Music!\n\n/play song name");
});

// Ping
bot.command("ping", (ctx) => {
  ctx.reply("🏓 Qayamat Music is Online!");
});

// Play / Search
bot.command("play", async (ctx) => {
  const query = ctx.message.text
    .split(" ")
    .slice(1)
    .join(" ")
    .trim();

  if (!query) {
    return ctx.reply("🎵 Example: /play Kesariya");
  }

  const chatId = ctx.chat.id;
  const data = getMusic(chatId);

  const user = ctx.from;
  const requestedBy = user.username
    ? `@${user.username}`
    : [user.first_name, user.last_name].filter(Boolean).join(" ");

  const status = await ctx.reply("🔎 Song search ho raha hai...");

  try {
    const results = await yts({
  query: query,
  pages: 1
});
    const video = results.videos[0];

    if (!video) {
      await ctx.telegram.deleteMessage(chatId, status.message_id);
      return ctx.reply("❌ Song nahi mila.");
    }

    const duration = Number(video.seconds) || 0;

    if (!duration) {
      await ctx.telegram.deleteMessage(chatId, status.message_id);
      return ctx.reply("❌ Song ki duration nahi mili.");
    }

    data.queue.push({
      title: video.title,
      url: video.url,
      duration,
      requestedBy
    });

    await ctx.telegram.deleteMessage(chatId, status.message_id);

    if (!data.current && !data.advancing) {
      await playNext(ctx, chatId);
    } else {
      await ctx.reply(`📋 Queue mein add hua:\n🎵 ${video.title}`);
    }

  } catch (error) {
    console.error("Search error:", error);

    await ctx.telegram.deleteMessage(chatId, status.message_id).catch(() => {});
    await ctx.reply("❌ Search error.");
  }
});

// AUTO NEXT
bot.command("qnext", async (ctx) => {
  const chatId = ctx.chat.id;
  const data = getMusic(chatId);

  await ctx.deleteMessage().catch(() => {});

  if (data.advancing) return;

  data.advancing = true;

  try {
    await finishCurrent(ctx, chatId, "✅ Song Completed");

    if (data.queue.length > 0) {
      await playNext(ctx, chatId);
    } else {
      data.current = null;
      await ctx.telegram.sendMessage(chatId, "/qstop");
    }
  } catch (error) {
    console.error("Auto-Next error:", error);
  } finally {
    data.advancing = false;
  }
});

// Pause
bot.action("pause", async (ctx) => {
  await ctx.answerCbQuery("⏸ Pausing...");
  await ctx.telegram.sendMessage(ctx.chat.id, "/qpause");
});

// Resume
bot.action("resume", async (ctx) => {
  await ctx.answerCbQuery("▶️ Resuming...");
  await ctx.telegram.sendMessage(ctx.chat.id, "/qresume");
});

// Stop
bot.action("stop", async (ctx) => {
  const chatId = ctx.chat.id;
  const data = getMusic(chatId);

  data.queue = [];

  await finishCurrent(ctx, chatId, "⏹ Music Stopped");
  data.current = null;

  await ctx.answerCbQuery("⏹ Music stopped");
  await ctx.telegram.sendMessage(chatId, "/qstop");
});

// Skip
bot.action("skip", async (ctx) => {
  const chatId = ctx.chat.id;
  const data = getMusic(chatId);

  if (data.advancing) {
    return ctx.answerCbQuery("Please wait...");
  }

  if (!data.queue.length) {
    return ctx.answerCbQuery("❌ Queue mein agla song nahi hai.");
  }

  await ctx.answerCbQuery("⏭ Skipping...");
  data.advancing = true;

  try {
    await finishCurrent(ctx, chatId, "⏭ Song Skipped");
    await ctx.telegram.sendMessage(chatId, "/qstop");

    await new Promise(resolve => setTimeout(resolve, 1500));

    await playNext(ctx, chatId);
  } catch (error) {
    console.error("Skip error:", error);
  } finally {
    data.advancing = false;
  }
});

// Queue
bot.action("queue", async (ctx) => {
  const data = getMusic(ctx.chat.id);

  const songs = data.queue.length
    ? data.queue.map((song, i) => `${i + 1}. ${song.title}`).join("\n")
    : "Queue khaali hai.";

  await ctx.answerCbQuery();
  await ctx.reply(`📋 SONG QUEUE\n\n${songs}`);
});

// Cancel
bot.action("cancel", async (ctx) => {
  const chatId = ctx.chat.id;
  const data = getMusic(chatId);

  data.queue = [];

  await finishCurrent(ctx, chatId, "❌ Player Cancelled");
  data.current = null;

  await ctx.answerCbQuery("❌ Player cancelled");
  await ctx.telegram.sendMessage(chatId, "/qstop");
});

// Launch
bot.launch();

console.log("Qayamat Music Bot Started!");
