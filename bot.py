
import os
import asyncio

from pyrogram import Client, filters
import pyrogram.errors
import static_ffmpeg

static_ffmpeg.add_paths()

pyrogram.errors.GroupcallForbidden = pyrogram.errors.Forbidden
pyrogram.errors.GroupcallInvalid = pyrogram.errors.BadRequest

from pytgcalls import PyTgCalls, idle
from pytgcalls.types import MediaStream, AudioQuality, VideoQuality


async def main():

    client = Client(
        "qayamat",
        api_id=int(os.environ["API_ID"]),
        api_hash=os.environ["API_HASH"],
        session_string=os.environ["SESSION_STRING"]
    )

    calls = PyTgCalls(client)

    @client.on_message(filters.command("ping"))
    async def ping(_, message):
        await message.reply("🎧 Qayamat Music Engine Online!")

    @client.on_message(filters.command("play"))
    async def play_song(_, message):

        if len(message.command) < 2:
            await message.reply("❌ Song name likho. Example: /play Arijit Singh")
            return

        query = " ".join(message.command[1:])
        status = await message.reply(f"🔎 Searching: {query}")

        try:
            process = await asyncio.create_subprocess_exec(
                "yt-dlp",
                "--no-warnings",
                "--no-playlist",
                "--socket-timeout", "15",
                "--retries", "2",
                "-g",
                "-f", "bestaudio/best",
                f"ytsearch1:{query}",
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE
            )

            try:
                stdout, stderr = await asyncio.wait_for(
                    process.communicate(), timeout=60
                )
            except asyncio.TimeoutError:
                process.kill()
                await process.communicate()
                await status.edit("❌ YouTube search timeout.")
                return

            output = stdout.decode().strip()
            video_url = output.splitlines()

            if process.returncode != 0 or not video_url:
                error = stderr.decode().strip()
                await status.edit(f"❌ Song nahi mila.\n{error[:250]}")
                return

            await status.edit("🎧 Voice Chat mein music start ho raha hai...")

            await calls.play(
                message.chat.id,
                MediaStream(
                    video_url[0],
                    AudioQuality.HIGH,
                    VideoQuality.HD_720p,
                    video_flags=MediaStream.Flags.IGNORE
                )
            )

            await status.edit(f"🎶 Now Playing: {query}")

        except Exception as e:
            await status.edit(f"❌ Playback error: {str(e)[:300]}")

    @client.on_message(filters.command("pause"))
    async def pause_song(_, message):
        try:
            await calls.pause(message.chat.id)
            await message.reply("⏸ Music Paused!")
        except Exception as e:
            await message.reply(f"❌ Error: {str(e)[:200]}")

    @client.on_message(filters.command("resume"))
    async def resume_song(_, message):
        try:
            await calls.resume(message.chat.id)
            await message.reply("▶️ Music Resumed!")
        except Exception as e:
            await message.reply(f"❌ Error: {str(e)[:200]}")

    @client.on_message(filters.command("stop"))
    async def stop_song(_, message):
        try:
            await calls.leave_call(message.chat.id)
            await message.reply("⏹ Music Stopped!")
        except Exception as e:
            await message.reply(f"❌ Error: {str(e)[:200]}")

    await client.start()
    await calls.start()

    print("Qayamat Music Engine Started!", flush=True)

    try:
        await idle()
    finally:
        await calls.stop()
        await client.stop()


if __name__ == "__main__":
    asyncio.run(main())
    
