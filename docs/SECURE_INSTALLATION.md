# Secure Installation Guide

This guide explains the security measures in place for MetricFrame downloads and how to verify your installation.

---

## Security Features

### 1. SHA256 Checksum Verification

All downloadable files include SHA256 checksums for verification:

- **Docker installation files**: `checksums.sha256`
- **Offline bundle**: `metricframe-offline-bundle.tar.gz.sha256`
- **Docker images tarball**: `metricframe-docker-images.tar.gz.sha256`

### 2. HTTPS Everywhere

All downloads are served over HTTPS:
- Installation scripts: `https://get.metricframe.ai/install.sh`
- Docker images: `ghcr.io` (GitHub Container Registry)
- Releases: `https://github.com/.../releases`

### 3. No Root Required

The installer:
- Installs to `~/metricframe` (user's home directory)
- Does not require `sudo` or root privileges
- Only needs Docker to be installed and running

### 4. Transparent Source Code

All installation scripts are open source and can be reviewed:
- Repository: https://github.com/automationacct01/metric_frame
- Install script: `install.sh`
- Docker Compose: `docker-compose.prod.yml`

---

## Installation Options

### Option 1: Quick Install (Trusted Environments)

For development machines or trusted environments:

```bash
curl -fsSL https://get.metricframe.ai/install.sh | bash
```

### Option 2: Verify Before Running (Recommended)

For production or security-conscious environments:

```bash
# Download the script
curl -fsSL https://get.metricframe.ai/install.sh -o install.sh

# Download checksums
curl -fsSL https://get.metricframe.ai/checksums.sha256 -o checksums.sha256

# Verify the checksum
sha256sum -c checksums.sha256 --ignore-missing

# Review the script
less install.sh

# Make executable and run
chmod +x install.sh
./install.sh
```

### Option 3: Offline Installation (Air-Gapped Networks)

For networks without internet access:

1. **On a machine with internet access:**

```bash
# Download the offline bundle
curl -LO https://github.com/automationacct01/metric_frame/releases/latest/download/metricframe-offline-bundle.tar.gz
curl -LO https://github.com/automationacct01/metric_frame/releases/latest/download/metricframe-offline-bundle.tar.gz.sha256

# Verify the download
sha256sum -c metricframe-offline-bundle.tar.gz.sha256
```

2. **Transfer to the air-gapped machine** (USB drive, etc.)

3. **On the air-gapped machine:**

```bash
# Extract the bundle
tar -xzvf metricframe-offline-bundle.tar.gz

# Run the offline installer
cd metricframe-offline
./install-offline.sh
```

---

## Verifying Checksums

### macOS

```bash
# Using shasum
shasum -a 256 -c checksums.sha256

# Or manually compare
shasum -a 256 install.sh
cat checksums.sha256 | grep install.sh
```

### Linux

```bash
# Using sha256sum
sha256sum -c checksums.sha256

# Or manually compare
sha256sum install.sh
cat checksums.sha256 | grep install.sh
```

### Windows (PowerShell)

```powershell
# Calculate hash
Get-FileHash install.sh -Algorithm SHA256

# Compare with expected
Get-Content checksums.sha256
```

---

## What the Install Script Does

The `install.sh` script performs these actions:

1. **Checks prerequisites**
   - Verifies Docker is installed
   - Verifies Docker Compose is available
   - Checks Docker daemon is running

2. **Creates installation directory**
   - Default: `~/metricframe`
   - Customizable via `METRICFRAME_HOME` environment variable

3. **Downloads configuration**
   - Fetches `docker-compose.prod.yml` from GitHub
   - Verifies SHA256 checksum (if available)

4. **Creates secure configuration**
   - Generates `.env` file with random database password
   - Uses `openssl rand` for secure password generation

5. **Starts containers**
   - Pulls latest Docker images
   - Starts MetricFrame services

The script does NOT:
- Require or use sudo/root
- Modify system files outside `~/metricframe`
- Send telemetry or phone home
- Install anything globally

---

## Environment Variables

Customize the installation with these environment variables:

| Variable | Default | Description |
|----------|---------|-------------|
| `METRICFRAME_HOME` | `~/metricframe` | Installation directory |
| `METRICFRAME_VERSION` | `latest` | Version to install |

Example:
```bash
METRICFRAME_HOME=/opt/metricframe ./install.sh
```

---

## Reporting Security Issues

If you discover a security vulnerability, please:

1. **Do not** open a public GitHub issue
2. Email security concerns to the maintainers
3. Allow time for a fix before public disclosure

---

## Verifying Docker Images

Docker images are published to GitHub Container Registry with content trust:

```bash
# Pull with digest verification
docker pull ghcr.io/automationacct01/metric_frame/frontend:latest
docker pull ghcr.io/automationacct01/metric_frame/backend:latest

# Inspect image digests
docker images --digests | grep metric_frame
```

---

## Checking for Updates

The install script checks for the latest version. To manually update:

```bash
cd ~/metricframe
docker compose pull
docker compose up -d
```

Or re-run the installer:
```bash
curl -fsSL https://get.metricframe.ai/install.sh | bash
```
