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


def server_started(server):
    """
    On server started event.
    Prints the ip and port for electron to use.
    Only 1 server is spun up.
    """
    for server in server.servers:
        for socket in server.sockets:
            ip, port = socket.getsockname()
            print(f"http://{ip}:{port}")


def main():
    """
    Entry point when run using "py", "python" or "python3"
    This is where the program will enter from the Electron application
    """

    # Configure the app and set the server object up
    config = uvicorn.Config("main:app", port=0)
    server = uvicorn.Server(config)

    # Get the log started message event listenter
    orig_log_started_message = server._log_started_message

    def patch_log_started_message(listeners):
        """
        Event that triggers when the started server message is logged.
        Triggers a print out (into STDOUT) of the server ip and port.
        """
        orig_log_started_message(listeners)
        # Print the server ip and port
        server_started(server)

    # Attach the event listener to the event
    server._log_started_message = patch_log_started_message

    server.run()


if __name__ == "__main__":
    main()
