"""Desktop launcher for MetricFrame backend.

This is the PyInstaller entry point. It avoids relative import issues
by using absolute imports from the src package.

Supports:
  - SSL/TLS via SSL_KEYFILE and SSL_CERTFILE environment variables
  - Certificate generation via --generate-cert <dir> [name] flag
"""
import sys
import os

# Ensure the src package is importable when running from PyInstaller
if getattr(sys, 'frozen', False):
    base_path = sys._MEIPASS
    if base_path not in sys.path:
        sys.path.insert(0, base_path)


def generate_cert():
    """Generate a TLS certificate and exit. Called by Electron before server start."""
    from src.services.tls_cert import TLSCertificateManager
    from pathlib import Path

    # --generate-cert <dir> [name]
    if len(sys.argv) < 3:
        print("Usage: metricframe-backend --generate-cert <output_dir> [cert_name]", file=sys.stderr)
        sys.exit(1)

    output_dir = Path(sys.argv[2])
    cert_name = sys.argv[3] if len(sys.argv) > 3 else "metricframe"

    try:
        cert_path, key_path = TLSCertificateManager.ensure_certificate(output_dir, cert_name)
        print(f"Certificate: {cert_path}")
        print(f"Private key: {key_path}")
    except Exception as e:
        print(f"Error generating certificate: {e}", file=sys.stderr)
        sys.exit(1)

    sys.exit(0)


if __name__ == "__main__":
    # Handle --generate-cert flag (used by Electron to generate certs before server start)
    if len(sys.argv) > 1 and sys.argv[1] == "--generate-cert":
        generate_cert()

    import uvicorn
    from src.main import app

    port = int(os.environ.get("PORT", 8000))

    ssl_keyfile = os.environ.get("SSL_KEYFILE")
    ssl_certfile = os.environ.get("SSL_CERTFILE")

    if ssl_keyfile and ssl_certfile and os.path.exists(ssl_keyfile) and os.path.exists(ssl_certfile):
        print(f"Starting backend with TLS on port {port}")
        uvicorn.run(app, host="127.0.0.1", port=port, ssl_keyfile=ssl_keyfile, ssl_certfile=ssl_certfile)
    else:
        uvicorn.run(app, host="127.0.0.1", port=port)
