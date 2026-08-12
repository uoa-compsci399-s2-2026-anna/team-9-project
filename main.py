from http.server import HTTPServer, BaseHTTPRequestHandler


class SimpleHTTPRequestHandler(BaseHTTPRequestHandler):
    def do_GET(self):
        """
        Handles incoming GET requests.
        Writes text/html response
        """
        # Send the HTTP status code (200 OK)
        self.send_response(200)

        # Set headers to tell the browser what content to expect
        self.send_header("Content-type", "text/html")
        self.end_headers()


if __name__ == "__main__":
    # Define host and port
    server_address = ("localhost", 8080)

    # Initialize and start the web server
    httpd = HTTPServer(server_address, SimpleHTTPRequestHandler)
    print("http://localhost:8080")

    # Serve the server
    httpd.serve_forever()
