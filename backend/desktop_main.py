"""Desktop application entry point for MetricFrame backend.

This wrapper handles the package imports correctly for PyInstaller.
"""
import sys
import os

def get_resource_path(relative_path):
    """Get path to resource, works for dev and for PyInstaller."""
    if hasattr(sys, '_MEIPASS'):
        # Running in PyInstaller bundle
        return os.path.join(sys._MEIPASS, relative_path)
    return os.path.join(os.path.dirname(__file__), relative_path)

# Setup paths for frozen app
if hasattr(sys, '_MEIPASS'):
    # When frozen, add the _MEIPASS to path first
    base_path = sys._MEIPASS
    sys.path.insert(0, base_path)
else:
    base_path = os.path.dirname(os.path.abspath(__file__))
    sys.path.insert(0, base_path)

# Change to the base path so relative imports work
os.chdir(base_path)

if __name__ == "__main__":
    import uvicorn

    # Use string import path for uvicorn to properly handle the module loading
    uvicorn.run(
        "src.main:app",
        host="127.0.0.1",
        port=8000,
        log_level="info"
    )
