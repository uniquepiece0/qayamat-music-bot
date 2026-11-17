
import subprocess
import os
import asyncio
import time

from pyrogram import Client, filters
import pyrogram.errors
import static_ffmpeg

static_ffmpeg.add_paths()

print(
    "YT-DLP VERSION:",
    subprocess.check_output(["yt-dlp", "--version"], text=True).strip(),
    flush=True
)

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

    # Prepared audio URL cache
    prepared_urls = {}
    preparing_tasks = {}

    async def extract_audio_url(video_url):

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
                process.communicate(),
                timeout=120
            )

        except asyncio.TimeoutError:
            process.kill()
            await process.communicate()
            raise TimeoutError("YouTube audio URL timeout!")

        urls = stdout.decode().strip().splitlines()

        if process.returncode != 0 or not urls:
            error = stderr.decode(errors="replace")
            raise RuntimeError(error[-1000:] or "Audio URL nahi mila!")

        return urls[0]

    async def prepare_audio_url(chat_id, video_url):

        key = (chat_id, video_url)

        cached = prepared_urls.get(key)

        if cached:
            audio_url, saved_time = cached

            if time.time() - saved_time < 600:
                return audio_url

            prepared_urls.pop(key, None)

        task = preparing_tasks.get(key)

        if task is None:
            task = asyncio.create_task(
                extract_audio_url(video_url)
            )
            preparing_tasks[key] = task

        try:
            audio_url = await task
            prepared_urls[key] = (audio_url, time.time())
            return audio_url

        finally:
            if preparing_tasks.get(key) is task and task.done():
                preparing_tasks.pop(key, None)

    # Prepare next song in advance
    @client.on_message(
        filters.bot & filters.regex(r"^/qprepare(?:@\w+)?\s+")
    )
    async def prepare_next_song(_, message):

        try:
            parts = (message.text or "").split(maxsplit=1)

            if len(parts) < 2:
                return

            video_url = parts[1].strip()

            try:
                await message.delete()
            except Exception:
                pass

            print("Next song ka URL pehle se prepare ho raha hai...", flush=True)

            await prepare_audio_url(message.chat.id, video_url)

            print("Next song ka audio URL READY hai!", flush=True)

        except Exception as e:
            print(f"Prefetch error: {e}", flush=True)

    # Auto Next
    @calls.on_update(call_filters.stream_end())
    async def stream_end_handler(_, update):

        try:
            print(f"Song ended in {update.chat_id}", flush=True)

            await client.send_message(
                update.chat_id,
                "/qnext@Qyamatmusicbot"
            )

        except Exception as e:
            print(f"Auto-Next error: {e}", flush=True)

    # Receive and play song
    @client.on_message(
        filters.bot & filters.regex(r"^/qplay(?:@\w+)?\s+")
    )
    async def receive_song(_, message):

        try:
            parts = (message.text or "").split(maxsplit=1)

            if len(parts) < 2:
                return

            video_url = parts[1].strip()

            try:
                await message.delete()
            except Exception:
                pass

            key = (message.chat.id, video_url)
            cached = prepared_urls.get(key)

            if cached and time.time() - cached[1] < 600:

                audio_url = cached[0]
                prepared_urls.pop(key, None)

                print("Prepared URL cache se mil gaya!", flush=True)

            else:

                print("YouTube audio URL nikal rahe hain...", flush=True)

                audio_url = await prepare_audio_url(
                    message.chat.id,
                    video_url
                )

                prepared_urls.pop(key, None)

            print("Audio URL mil gaya! VC par play kar rahe hain...", flush=True)

            await calls.play(
                message.chat.id,
                MediaStream(
                    audio_url,
                    AudioQuality.HIGH,
                    VideoQuality.HD_720p,
                    video_flags=MediaStream.Flags.IGNORE
                )
            )

            print("Song started!", flush=True)

            # Notify Node bot that playback has started
            try:
                await client.send_message(
                    message.chat.id,
                    f"/qplaying {video_url}"
                )
            except Exception as e:
                print(f"Playing status notify error: {e}", flush=True)

        except Exception as e:
            print(f"Playback error: {e}", flush=True)

    # Pause
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

    # Resume
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

    # Stop
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
