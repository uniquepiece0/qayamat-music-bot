
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

    # Node.js Search Bot se song link receive karo
    @client.on_message(filters.bot & filters.regex(r"^/qplay\s+"))
    async def receive_song(_, message):

        try:
            text = message.text or ""
            parts = text.split(maxsplit=1)

            if len(parts) < 2:
                return

            video_url = parts[1].strip()

            # Internal message delete karo
            try:
                await message.delete()
            except Exception:
                pass

            process = await asyncio.create_subprocess_exec(
                "yt-dlp",
                "--no-warnings",
                "--no-playlist",
                "--socket-timeout", "20",
                "--retries", "2",
                "-g",
                "-f", "bestaudio/best",
                video_url,
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
                return

            urls = stdout.decode().strip().splitlines()

            if process.returncode != 0 or not urls:
                return

            await calls.play(
                message.chat.id,
                MediaStream(
                    urls[0],
                    AudioQuality.HIGH,
                    VideoQuality.HD_720p,
                    video_flags=MediaStream.Flags.IGNORE
                )
            )

            print("Song started in Voice Chat!", flush=True)

        except Exception as e:
            print(f"Playback error: {e}", flush=True)

    # Silent controls
    @client.on_message(filters.command("pause"))
    async def pause_song(_, message):
        try:
            await calls.pause(message.chat.id)
        except Exception as e:
            print(e, flush=True)

    @client.on_message(filters.command("resume"))
    async def resume_song(_, message):
        try:
            await calls.resume(message.chat.id)
        except Exception as e:
            print(e, flush=True)

    @client.on_message(filters.command("stop"))
    async def stop_song(_, message):
        try:
            await calls.leave_call(message.chat.id)
        except Exception as e:
            print(e, flush=True)

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
        
