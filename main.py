from fastapi import FastAPI
from fastapi.responses import HTMLResponse
import uvicorn

app = FastAPI()

@app.get("/", response_class=HTMLResponse)
async def read_root():
    return """
    <html>
        <body>
            <h1>Hello, world!</h1>
        </body>
    </html>
    """

if __name__ == "__main__":
    url = "127.0.0.1"
    port = 5000
    print(f"http://{url}:{port}")

    uvicorn.run("main:app", host=url, port=port, reload=True)