from fastapi import FastAPI
from fastapi.responses import HTMLResponse
import uvicorn

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


def main():
    """
    Entry point when run using "py", "python" or "python3"
    This is where the program will enter from the Electron application
    """

    # Configure the app and set the server object up
    config = uvicorn.Config("main:app", port=0)
    server = uvicorn.Server(config)

    # Run the server
    server.run()


if __name__ == "__main__":
    main()
