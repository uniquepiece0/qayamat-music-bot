
const { Telegraf, Markup } = require("telegraf");
const yts = require("yt-search");

const BOT_TOKEN = process.env.BOT_TOKEN;

if (!BOT_TOKEN) {
  console.error("BOT_TOKEN missing!");
  process.exit(1);
}

const bot = new Telegraf(BOT_TOKEN);

// Assistant ID (environment variable se load hoga)
let assistantId = process.env.ASSISTANT_ID
  ? Number(process.env.ASSISTANT_ID)
  : null;

// Har group ki invite setting
const invitePower = new Map();

// Start
bot.start((ctx) => {
  ctx.reply(
    "🎧 Welcome to Qayamat × Beats!\n\n" +
    "🎵 Audio: /play song name\n" +
    "🎬 Video: /vplay song name\n\n" +
    "/invite on - Assistant invite ON\n" +
    "/invite off - Assistant invite OFF\n" +
    "/registerassistant - Register assistant\n" +
    "/help - Help\n" +
    "/ping - Bot status"
  );
});

// Register assistant (assistant ke private chat se)
bot.command("registerassistant", async (ctx) => {
    if (ctx.chat.type !== "private") {
    return ctx.reply(
      "❌ Ye command assistant ko bot ke private chat mein bhejni hai."
    );
  }

  assistantId = ctx.from.id;

  console.log("ASSISTANT_ID:", assistantId);

  await ctx.reply(
    "✅ Assistant registered!\n\n" +
    "Assistant ID: " + assistantId + "\n\n" +
    "Ab hosting Variables mein ASSISTANT_ID naam se ye ID save kar dena."
  );
});

// Help
bot.command("help", (ctx) => {
  ctx.reply(
    "🎵 Qayamat × Beats Help\n\n" +
    "/play - Audio music search\n" +
    "/vplay - Video music search\n" +
    "/invite on - Assistant invite ON\n" +
    "/invite off - Assistant invite OFF\n" +
    "/ping - Bot status"
  );
});

// Ping
bot.command("ping", (ctx) => {
  ctx.reply("🏓 Qayamat × Beats is Online!");
});

// Check group admin
async function isGroupAdmin(ctx) {
  if (
    ctx.chat.type !== "group" &&
    ctx.chat.type !== "supergroup"
  ) {
    return false;
  }

  const member = await ctx.telegram.getChatMember(
    ctx.chat.id,
    ctx.from.id
  );

  return (
    member.status === "creator" ||
    member.status === "administrator"
  );
}

// Invite ON / OFF
bot.command("invite", async (ctx) => {
  try {
    if (
      ctx.chat.type !== "group" &&
      ctx.chat.type !== "supergroup"
    ) {
      return ctx.reply(
        "❌ Is command ko group mein use karo."
      );
    }

    if (!(await isGroupAdmin(ctx))) {
      return ctx.reply(
        "❌ Sirf group admins invite power change kar sakte hain."
      );
    }

    if (!assistantId) {
      return ctx.reply(
        "❌ Assistant registered nahi hai.\n" +
        "Assistant se bot ke private chat mein /registerassistant bhejwao."
      );
    }

    const args = ctx.message.text
      .split(" ")
      .slice(1)
      .join(" ")
      .trim()
      .toLowerCase();

    if (args === "off") {
      invitePower.set(ctx.chat.id, false);

      return ctx.reply(
        "🔴 Assistant Invite Power OFF!"
      );
    }

    if (args !== "on") {
      return ctx.reply(
        "Use:\n/invite on\n/invite off"
      );
    }

    invitePower.set(ctx.chat.id, true);

    // Single-use invite link, 10 minutes validity
    const invite = await ctx.telegram.createChatInviteLink(
      ctx.chat.id,
      {
        member_limit: 1,
        expire_date: Math.floor(Date.now() / 1000) + 600
      }
    );

    await ctx.telegram.sendMessage(
      assistantId,
      "🎧 QAYAMAT MUSIC PLAYER\n\n" +
      "Aapko group mein invite kiya gaya hai.\n\n" +
      "👇 Join karne ke liye link:\n" +
      invite.invite_link
    );

    await ctx.reply(
      "🟢 Assistant Invite Power ON!\n\n" +
      "✅ Invite link assistant ko private message kar diya hai."
    );

  } catch (error) {
    console.error("Invite error:", error);

    await ctx.reply(
      "❌ Invite error: " + error.message
    );
  }
});

// Search songs
async function searchSongs(ctx, mode) {
  const query = ctx.message.text
    .split(" ")
    .slice(1)
    .join(" ")
    .trim();

  if (!query) {
    return ctx.reply(
      mode === "audio"
        ? "🎵 Song ka naam likho.\n\n/play Kesariya"
        : "🎬 Song ka naam likho.\n\n/vplay Kesariya"
    );
  }

  await ctx.reply("🔎 Song search ho raha hai...");

  try {
    const results = await yts(query);
    const videos = results.videos.slice(0, 5);

    if (!videos.length) {
      return ctx.reply("❌ Koi song nahi mila.");
    }

    for (const video of videos) {
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

// Audio playback
bot.action(/^audio:(.+)$/, async (ctx) => {
  try {
    const videoUrl =
      `https://www.youtube.com/watch?v=${ctx.match[1]}`;

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

// Video playback
bot.action(/^video:(.+)$/, async (ctx) => {
  try {
    const videoUrl =
      `https://www.youtube.com/watch?v=${ctx.match[1]}`;

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

// Launch
bot.launch();

console.log("Qayamat × Beats Started!");

process.once("SIGINT", () => bot.stop("SIGINT"));
process.once("SIGTERM", () => bot.stop("SIGTERM"));
