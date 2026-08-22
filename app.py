from fastapi import FastAPI
from fastapi.responses import HTMLResponse

app = FastAPI()


@app.get("/", response_class=HTMLResponse)
async def read_root():
    """
    Root ("/") directory response handler.
    Returns an HTML (string) response
    """

    return """
    <html>
        <body>
            <h1>Hello, world!</h1>
        </body>
    </html>
    """
