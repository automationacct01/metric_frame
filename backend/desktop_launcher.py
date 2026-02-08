"""Desktop launcher for MetricFrame backend.

This is the PyInstaller entry point. It avoids relative import issues
by using absolute imports from the src package.
"""
import sys
import os

# Ensure the src package is importable when running from PyInstaller
if getattr(sys, 'frozen', False):
    base_path = sys._MEIPASS
    if base_path not in sys.path:
        sys.path.insert(0, base_path)

import uvicorn
from src.main import app

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run(app, host="127.0.0.1", port=port)
