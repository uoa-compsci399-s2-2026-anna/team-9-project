import signal
import time
from fastapi import FastAPI, HTTPException, status
from fastapi.staticfiles import StaticFiles
import sys
import rebound
import os

app = FastAPI()

if sys.argv[-1] == "packaged":
    app.mount("/src", StaticFiles(directory="resources/src"), name="src")
    app.mount("/dist", StaticFiles(directory="resources/dist"), name="dist")
else:
    app.mount("/src", StaticFiles(directory="src"), name="src")
    app.mount("/dist", StaticFiles(directory="dist"), name="dist")

cached_system = ""
valid_systems = ["solar"]


@app.get("/system")
async def get_system_data(name: str = "", t: int = -1):
    if t == -1 or name.lower() not in valid_systems:
        raise HTTPException(status.HTTP_400_BAD_REQUEST)

    return {"positions": []}
