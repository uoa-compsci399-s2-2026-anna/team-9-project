from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles

app = FastAPI()

app.mount("/src", StaticFiles(directory="src"), name="src")
app.mount("/dist", StaticFiles(directory="dist"), name="dist")
