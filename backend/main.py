import os
from pathlib import Path

import httpx
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, Query

load_dotenv(Path(__file__).parent.parent / ".env.local")
load_dotenv(Path(__file__).parent / ".env", override=True)

app = FastAPI()


async def _mint_signed_url(api_key: str, agent_id: str) -> str:
    async with httpx.AsyncClient() as client:
        res = await client.get(
            "https://api.elevenlabs.io/v1/convai/conversation/get-signed-url",
            params={"agent_id": agent_id},
            headers={"xi-api-key": api_key},
        )
    if res.status_code != 200:
        raise HTTPException(
            status_code=500,
            detail=f"ElevenLabs error: {res.status_code} {res.text}",
        )
    return res.json()["signed_url"]


@app.get("/api/signed-url")
async def signed_url(game: str = Query(default="maze")):
    api_key = os.getenv("ELEVENLABS_API_KEY")

    if game == "boss":
        agent_id = os.getenv("ELEVENLABS_BOSS_AGENT_ID") or os.getenv("ELEVENLABS_AGENT_ID")
    else:
        agent_id = os.getenv("ELEVENLABS_AGENT_ID")

    if not api_key or not agent_id:
        raise HTTPException(status_code=500, detail="Missing ELEVENLABS_API_KEY or ELEVENLABS_AGENT_ID")
    return {"signedUrl": await _mint_signed_url(api_key, agent_id)}


@app.get("/api/signed-url/spell")
async def signed_url_spell():
    api_key = os.getenv("ELEVENLABS_API_KEY")
    agent_id = os.getenv("ELEVNLABS_AGENT_SPELL_ID")
    if not api_key or not agent_id:
        raise HTTPException(status_code=500, detail="Missing ELEVENLABS_API_KEY or ELEVNLABS_AGENT_SPELL_ID")
    return {"signedUrl": await _mint_signed_url(api_key, agent_id)}
