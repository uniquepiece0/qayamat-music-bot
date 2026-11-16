import os
from pyrogram import Client, filters

import pyrogram.errors

pyrogram.errors.GroupcallForbidden = pyrogram.errors.Forbidden
pyrogram.errors.GroupcallInvalid = pyrogram.errors.BadRequest
from pytgcalls import PyTgCalls, idle

API_ID = int(os.environ["API_ID"])
API_HASH = os.environ["API_HASH"]
SESSION_STRING = os.environ["SESSION_STRING"]

client = Client(
    "qayamat",
    api_id=API_ID,
    api_hash=API_HASH,
    session_string=SESSION_STRING
)

calls = PyTgCalls(client)

@client.on_message(filters.command("ping"))
async def ping(_, message):
    await message.reply("🎧 Qayamat Music Engine Online!")

async def main():
    await client.start()
    await calls.start()
    print("Qayamat Music Engine Started!")
    await idle()

if __name__ == "__main__":
    import asyncio
    asyncio.run(main())
