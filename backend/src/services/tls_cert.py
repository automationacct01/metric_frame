"""TLS certificate generation for MetricFrame.

Generates self-signed X.509 certificates for local HTTPS support.
Used by both Docker (via CLI) and Desktop (via import) platforms.

Usage (CLI):
    python -m src.services.tls_cert /path/to/output/dir [cert_name]
"""

import ipaddress
import logging
import os
import sys
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Tuple

from cryptography import x509
from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.asymmetric import rsa
from cryptography.x509.oid import NameOID

logger = logging.getLogger(__name__)


class TLSCertificateManager:
    """Manages self-signed TLS certificate generation and validation."""

    DEFAULT_VALIDITY_DAYS = 365
    DEFAULT_KEY_SIZE = 2048

    @staticmethod
    def generate_certificate(
        cert_path: Path,
        key_path: Path,
        common_name: str = "localhost",
        validity_days: int = DEFAULT_VALIDITY_DAYS,
    ) -> Tuple[Path, Path]:
        """Generate a self-signed TLS certificate and private key.

        Args:
            cert_path: Where to write the certificate PEM file.
            key_path: Where to write the private key PEM file.
            common_name: Certificate CN (default: localhost).
            validity_days: How long the certificate is valid.

        Returns:
            Tuple of (cert_path, key_path).
        """
        logger.info(f"Generating TLS certificate for CN={common_name}")

        cert_path = Path(cert_path)
        key_path = Path(key_path)
        cert_path.parent.mkdir(parents=True, exist_ok=True)
        key_path.parent.mkdir(parents=True, exist_ok=True)

        # Generate RSA private key
        private_key = rsa.generate_private_key(
            public_exponent=65537,
            key_size=TLSCertificateManager.DEFAULT_KEY_SIZE,
        )

        # Build certificate
        subject = issuer = x509.Name([
            x509.NameAttribute(NameOID.COMMON_NAME, common_name),
            x509.NameAttribute(NameOID.ORGANIZATION_NAME, "MetricFrame"),
            x509.NameAttribute(NameOID.ORGANIZATIONAL_UNIT_NAME, "Self-Signed"),
        ])

        now = datetime.now(timezone.utc)
        cert = (
            x509.CertificateBuilder()
            .subject_name(subject)
            .issuer_name(issuer)
            .public_key(private_key.public_key())
            .serial_number(x509.random_serial_number())
            .not_valid_before(now)
            .not_valid_after(now + timedelta(days=validity_days))
            .add_extension(
                x509.SubjectAlternativeName([
                    x509.DNSName("localhost"),
                    x509.IPAddress(ipaddress.IPv4Address("127.0.0.1")),
                ]),
                critical=False,
            )
            .sign(private_key, hashes.SHA256())
        )

        # Write private key
        with open(key_path, "wb") as f:
            f.write(
                private_key.private_bytes(
                    encoding=serialization.Encoding.PEM,
                    format=serialization.PrivateFormat.TraditionalOpenSSL,
                    encryption_algorithm=serialization.NoEncryption(),
                )
            )

        # Write certificate
        with open(cert_path, "wb") as f:
            f.write(cert.public_bytes(serialization.Encoding.PEM))

        # Restrictive permissions on private key
        os.chmod(key_path, 0o600)
        os.chmod(cert_path, 0o644)

        logger.info(f"Certificate generated (valid {validity_days} days): {cert_path}")
        return (cert_path, key_path)

    @staticmethod
    def check_certificate_valid(cert_path: Path) -> bool:
        """Check if a certificate file exists and has not expired.

        Returns True if the certificate is present and still valid.
        """
        cert_path = Path(cert_path)
        if not cert_path.exists():
            return False

        try:
            with open(cert_path, "rb") as f:
                cert = x509.load_pem_x509_certificate(f.read())

            now = datetime.now(timezone.utc)
            if now < cert.not_valid_before_utc:
                logger.warning("Certificate not yet valid")
                return False
            if now > cert.not_valid_after_utc:
                logger.warning("Certificate expired")
                return False

            days_left = (cert.not_valid_after_utc - now).days
            if days_left < 30:
                logger.warning(f"Certificate expires in {days_left} days")

            return True
        except Exception as e:
            logger.error(f"Failed to validate certificate: {e}")
            return False

    @staticmethod
    def ensure_certificate(
        cert_dir: Path,
        cert_name: str = "metricframe",
        force: bool = False,
    ) -> Tuple[Path, Path]:
        """Ensure a valid certificate exists, generating one if needed.

        Args:
            cert_dir: Directory to store cert and key files.
            cert_name: Base filename (produces cert_name.crt and cert_name.key).
            force: Regenerate even if a valid certificate exists.

        Returns:
            Tuple of (cert_path, key_path).
        """
        cert_dir = Path(cert_dir)
        cert_path = cert_dir / f"{cert_name}.crt"
        key_path = cert_dir / f"{cert_name}.key"

        if not force and TLSCertificateManager.check_certificate_valid(cert_path) and key_path.exists():
            logger.info(f"Valid certificate found: {cert_path}")
            return (cert_path, key_path)

        logger.info("Generating new certificate")
        return TLSCertificateManager.generate_certificate(cert_path, key_path)


def main():
    """CLI entry point for certificate generation.

    Usage:
        python -m src.services.tls_cert <output_dir> [cert_name]
    """
    logging.basicConfig(level=logging.INFO, format="[%(levelname)s] %(message)s")

    if len(sys.argv) < 2:
        print("Usage: python -m src.services.tls_cert <output_dir> [cert_name]", file=sys.stderr)
        sys.exit(1)

    output_dir = Path(sys.argv[1])
    cert_name = sys.argv[2] if len(sys.argv) > 2 else "metricframe"

    try:
        cert_path, key_path = TLSCertificateManager.ensure_certificate(output_dir, cert_name)
        print(f"Certificate: {cert_path}")
        print(f"Private key: {key_path}")
    except Exception as e:
        print(f"Error: {e}", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
