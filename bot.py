
import os
import asyncio

from pyrogram import Client, filters
import pyrogram.errors
import static_ffmpeg

static_ffmpeg.add_paths()

pyrogram.errors.GroupcallForbidden = pyrogram.errors.Forbidden
pyrogram.errors.GroupcallInvalid = pyrogram.errors.BadRequest

from pytgcalls import PyTgCalls, idle
from pytgcalls import filters as call_filters
from pytgcalls.types import MediaStream, AudioQuality, VideoQuality


async def main():

    client = Client(
        "qayamat",
        api_id=int(os.environ["API_ID"]),
        api_hash=os.environ["API_HASH"],
        session_string=os.environ["SESSION_STRING"]
    )

    calls = PyTgCalls(client)
    
    @calls.on_update(call_filters.stream_end())
    async def stream_end_handler(_, update):
        try:
            print(f"Song ended in {update.chat_id}", flush=True)

            # Node.js Bot ko agla song chalane ka signal
            await client.send_message(
                update.chat_id,
                "/qnext"
            )

        except Exception as e:
            print(f"Auto-Next error: {e}", flush=True)
            

    # Node.js Bot se song receive karo
    @client.on_message(
        filters.bot & filters.regex(r"^/qplay(?:@\w+)?\s+")
    )
    async def receive_song(_, message):

        try:
            parts = (message.text or "").split(maxsplit=1)

            if len(parts) < 2:
                return

            video_url = parts[1].strip()

            # Internal message delete
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
                print("Song search timeout!", flush=True)
                return

            urls = stdout.decode().strip().splitlines()

            if process.returncode != 0 or not urls:
                print("Song URL nahi mila!", flush=True)
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

            print("Song started!", flush=True)

        except Exception as e:
            print(f"Playback error: {e}", flush=True)

    # Pause button
    @client.on_message(
        filters.bot & filters.regex(r"^/qpause$")
    )
    async def pause_song(_, message):
        try:
            await message.delete()
            await calls.pause(message.chat.id)
            print("Music Paused!", flush=True)
        except Exception as e:
            print(f"Pause error: {e}", flush=True)

    # Resume button
    @client.on_message(
        filters.bot & filters.regex(r"^/qresume$")
    )
    async def resume_song(_, message):
        try:
            await message.delete()
            await calls.resume(message.chat.id)
            print("Music Resumed!", flush=True)
        except Exception as e:
            print(f"Resume error: {e}", flush=True)

    # Stop button
    @client.on_message(
        filters.bot & filters.regex(r"^/qstop$")
    )
    async def stop_song(_, message):
        try:
            await message.delete()
            await calls.leave_call(message.chat.id)
            print("Music Stopped!", flush=True)
        except Exception as e:
            print(f"Stop error: {e}", flush=True)

    
    await client.start()
    await calls.start()

    print("Qayamat Music Engine Started!", flush=True)

    try:
        await idle()
    finally:
        await client.stop()


if __name__ == "__main__":
    asyncio.run(main())
    
