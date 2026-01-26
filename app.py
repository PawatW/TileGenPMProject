from pathlib import Path
from flask import Flask, send_from_directory

app = Flask(__name__)
BASE_DIR = Path(__file__).resolve().parent


@app.route("/")
def index():
    return send_from_directory(BASE_DIR, "floor.html")


@app.route("/<path:filename>")
def static_files(filename: str):
    return send_from_directory(BASE_DIR, filename)


if __name__ == "__main__":
    app.run(host="127.0.0.1", port=5001, debug=True)
