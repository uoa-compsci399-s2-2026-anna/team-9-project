from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
import sys

app = FastAPI()

if sys.argv[-1] == "packaged":
    app.mount("/src", StaticFiles(directory="resources/src"), name="src")
    app.mount("/dist", StaticFiles(directory="resources/dist"), name="dist")
else:
    app.mount("/src", StaticFiles(directory="src"), name="src")
    app.mount("/dist", StaticFiles(directory="dist"), name="dist")
