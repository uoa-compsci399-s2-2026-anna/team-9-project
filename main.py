from http.server import HTTPServer, BaseHTTPRequestHandler


if __name__ == "__main__":
    # Define host and port
    server_address = ("localhost", 8080)

    # Initialize and start the web server
    httpd = HTTPServer(server_address, SimpleHTTPRequestHandler)
    print("http://localhost:8080")

    # Serve the server
    httpd.serve_forever()
