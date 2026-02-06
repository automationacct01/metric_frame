"""Desktop entry point for PyInstaller.

This wrapper properly bootstraps the src package so that
relative imports in src/main.py work correctly.
"""

import sys
import os

# Ensure the bundled directory is on the path
if getattr(sys, 'frozen', False):
    # Running as PyInstaller bundle
    base_dir = sys._MEIPASS
else:
    base_dir = os.path.dirname(os.path.abspath(__file__))

sys.path.insert(0, base_dir)

import uvicorn
from src.main import app

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run(app, host="127.0.0.1", port=port)
