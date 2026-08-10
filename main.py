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

if __name__ == "__main__":
    """
    Entry point when run using "py", "python" or "python3" 
    This is where the program will enter from the Electron application
    """

    # Constant values of url and port
    url = "127.0.0.1"
    port = 5000

    # Print url plainly so the Electron app can easily parse it
    print(f"http://{url}:{port}")

    # Re-run the main application with the specified url and port so it is
    # consistent and predictable
    uvicorn.run("main:app", host=url, port=port, reload=True)