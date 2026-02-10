# Security Architecture

> **Last Updated:** February 2026

---

## Overview

MetricFrame is designed with security as a core principle. This document explains the network architecture, data flow, and security measures that protect your data and API credentials.

## Network Architecture

```
┌─────────────────────────────────────────────────────────────┐
│  YOUR COMPUTER (localhost)                                  │
│                                                             │
│  Browser ──HTTP──► Frontend ──HTTP──► Backend ──► Redis     │
│  (localhost:3000)   (nginx)          (FastAPI)   (sessions) │
│                                           │                 │
└───────────────────────────────────────────│─────────────────┘
                                            │
                                            ▼ HTTPS (TLS 1.3 encrypted)
                                    ┌───────────────────┐
                                    │   INTERNET        │
                                    │                   │
                                    │ api.openai.com    │
                                    │ api.anthropic.com │
                                    │ api.together.xyz  │
                                    │ (other AI APIs)   │
                                    └───────────────────┘
```

### Key Points

| Traffic Type | Protocol | Encrypted | Leaves Computer |
|--------------|----------|-----------|-----------------|
| Browser → Frontend | HTTP | No* | No |
| Frontend → Backend | HTTP | No* | No |
| Backend → Redis | TCP | No* | No |
| Backend → AI APIs | HTTPS | Yes (TLS 1.3) | Yes |

*Local traffic does not leave your machine via the network interface, though other processes on the same host can access it. See [details and options below](#local-http-traffic--what-you-should-know).

## Local HTTP Traffic — What You Should Know

### The Loopback Interface

When you access `localhost:3000`, your browser communicates with the app through your computer's **loopback interface** (127.0.0.1). This traffic:

1. **Does not leave your machine** - It stays within your computer's memory and is not routed to any network interface
2. **Is not visible to other devices** - No external device on your network can observe loopback traffic
3. **Is isolated by the OS** - The operating system prevents loopback traffic from being transmitted externally

For a single-user machine where only you have access, this provides reasonable protection for local traffic. However, localhost HTTP is **not the same as encrypted traffic**, and there are scenarios where it may not be sufficient.

### Residual Risks of Unencrypted Localhost

Even though loopback traffic doesn't leave your machine over the network, you should be aware of the following:

| Scenario | Risk | Who Should Care |
|----------|------|-----------------|
| **Shared machines** | Other user accounts on the same system can access open localhost ports | Multi-user servers, shared workstations |
| **Binding to 0.0.0.0** | If the service binds to all interfaces instead of `127.0.0.1`, traffic is exposed on your local network | Docker deployments on shared networks |
| **Local malware** | Compromised software running on your machine can intercept localhost traffic or make requests to localhost services | High-security environments |
| **Endpoint monitoring** | Corporate DLP or endpoint agents may inspect local HTTP traffic | Regulated industries, corporate environments |
| **DNS rebinding** | A malicious website could potentially craft requests to your localhost services | Users who browse untrusted sites while MetricFrame is running |

### Our Recommendation

For most users running MetricFrame on a personal machine or a dedicated server, the default HTTP configuration provides adequate protection. The risks above are edge cases, not everyday threats.

That said, if you operate in a high-security environment, run MetricFrame on a shared system, or simply prefer defense in depth — we recommend [adding TLS to your deployment](#adding-tls-to-your-deployment). The setup takes a few minutes and eliminates these residual risks.

## Outbound API Calls (The Internet Connection)

The **only traffic that reaches the internet** is from the backend to AI provider APIs. This connection is:

### Always Encrypted

```python
# The Python SDK libraries enforce HTTPS
from anthropic import Anthropic
client = Anthropic(api_key="...")
# All requests go to https://api.anthropic.com (TLS encrypted)
```

The official Python SDKs for OpenAI, Anthropic, Together.ai, and other providers:
- Only accept HTTPS connections
- Verify SSL certificates by default
- Use TLS 1.3 when available
- Reject unencrypted connections

### What Gets Sent

When you use the AI Assistant, only the following leaves your computer:

| Data Sent | Encrypted |
|-----------|-----------|
| Your prompt/question | Yes (TLS) |
| Your API key (in header) | Yes (TLS) |
| Context from your metrics | Yes (TLS) |

### What Never Leaves

| Data | Reason |
|------|--------|
| Your database | Local PostgreSQL only |
| Your passwords | Stored locally with bcrypt |
| Full metrics catalog | Only relevant context sent to AI |
| User information | Never transmitted |

## API Key Security

### Storage

Your AI API keys are protected through multiple layers:

1. **Fernet Encryption**: Keys are encrypted before storage using the `cryptography` library
2. **Master Key**: A unique master encryption key is generated for your deployment
3. **Local Storage**: Encrypted keys stored in PostgreSQL (never in plaintext)

```
User enters API key → Fernet encryption → Stored in database
                                              ↓
Database retrieval → Fernet decryption → Used for API call
                                              ↓
                                    Sent via HTTPS to API provider
```

### Key Handling Best Practices

| Practice | Implementation |
|----------|----------------|
| Encryption at rest | Fernet symmetric encryption |
| No logging | API keys excluded from logs |
| Memory handling | Keys cleared after use |
| HTTPS only | Keys only sent over TLS |

## Session Storage

MetricFrame uses Redis for session storage in production deployments, enabling multiple backend workers to share session state.

### Architecture

```
┌─────────────────────────────────────────────────────────────┐
│  Production (4 uvicorn workers)                             │
│                                                             │
│  Worker 1 ─┐                                                │
│  Worker 2 ─┼──► Redis (6379) ◄── All sessions shared        │
│  Worker 3 ─┤                                                │
│  Worker 4 ─┘                                                │
└─────────────────────────────────────────────────────────────┘
```

### Session Data

| Field | Description |
|-------|-------------|
| `email` | User identifier |
| `created_at` | Session creation timestamp |
| `last_accessed` | Last activity (for TTL) |

### Security Features

| Feature | Implementation |
|---------|----------------|
| **Token Generation** | `secrets.token_urlsafe(32)` - 256 bits of entropy |
| **Session TTL** | 24-hour sliding window (configurable) |
| **Automatic Expiration** | Redis native TTL handles cleanup |
| **Bulk Invalidation** | All user sessions revoked on password change/deactivation |
| **Graceful Fallback** | In-memory storage if Redis unavailable |

### Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| `REDIS_URL` | (none) | Redis connection URL. If not set, uses in-memory storage |
| `SESSION_TTL_HOURS` | 24 | Session expiration time in hours |

## Port Selection: Why 3000?

MetricFrame uses port 3000 for the web interface:

| Reason | Explanation |
|--------|-------------|
| **Non-privileged** | Ports above 1024 don't require root/admin access |
| **Industry standard** | React, Next.js, Node.js apps commonly use 3000 |
| **Not externally exposed** | By default, only accessible on localhost |
| **Memorable** | Easy to remember and type |

### Avoiding Common Ports

We deliberately avoid:
- **Port 80**: Privileged, associated with unencrypted web traffic
- **Port 443**: Requires TLS certificates
- **Port 8080**: Often used by proxies, may conflict

## Data Privacy

### 100% Local Deployment

MetricFrame runs entirely on your infrastructure:

- **No cloud dependencies** (except optional AI APIs you configure)
- **No phone home** - We don't receive any data from your installation
- **No telemetry** - No usage tracking, analytics, or monitoring
- **No accounts required** - No registration with us needed

### What We Never See

| Data | Status |
|------|--------|
| Your metrics | Never leaves your system |
| Your API keys | Encrypted locally, never transmitted to us |
| Your users | Managed entirely by you |
| Your usage | No tracking or analytics |
| Your IP address | No connections to our servers |

## Security Headers

The nginx configuration includes standard security headers:

```nginx
X-Frame-Options: SAMEORIGIN           # Prevents clickjacking
X-Content-Type-Options: nosniff       # Prevents MIME sniffing
X-XSS-Protection: 1; mode=block       # XSS filter
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: geolocation=(), microphone=(), camera=()
Content-Security-Policy: [configured for React app]
```

## Role-Based Access Control

MetricFrame implements role-based security:

| Role | Capabilities |
|------|-------------|
| **Admin** | Full access, user management, system configuration |
| **Editor** | Create/modify metrics, use AI features |
| **Viewer** | Read-only access, AI explanations and reports only |

See [User Management](user-management.md) for details.

## Recommendations for Production Deployment

If deploying MetricFrame on a server accessible by multiple users:

### For Local Network (Intranet)

HTTP on a local network means traffic between machines is **unencrypted**. Anyone on the same network segment could potentially observe it.

1. Consider [adding TLS](#adding-tls-to-your-deployment) if your network carries sensitive metric data or API credentials
2. Ensure firewall rules block external access to port 3000
3. Restrict access to trusted hosts only (e.g., bind to a specific interface rather than `0.0.0.0`)
4. Use network-level authentication (802.1X, VPN) where possible

### For Internet-Facing Deployment

1. Place behind a reverse proxy (nginx, Traefik, Caddy)
2. **Configure HTTPS with proper certificates** (Let's Encrypt recommended)
3. Use a VPN or zero-trust network
4. Implement additional authentication layers

## Adding TLS to Your Deployment

MetricFrame includes built-in TLS setup for both Docker and Desktop platforms. No manual certificate generation or configuration file editing required — certificates are generated automatically using Python's `cryptography` library.

### Docker

#### During Installation

When you run the install script, you'll be prompted to enable HTTPS:

```bash
curl -fsSL https://get.metricframe.ai/install.sh | bash
```

The installer will ask:

```
Optional: Enable HTTPS for encrypted local connections?
Enable HTTPS? [y/N]
```

Type `y` and the installer will automatically:
1. Generate a self-signed TLS certificate
2. Configure nginx for HTTPS on port 443
3. Set up HTTP-to-HTTPS redirect
4. Update CORS origins

Access MetricFrame at `https://localhost`. Your browser will show a certificate warning on first visit — this is expected for self-signed certificates. Click "Advanced" then "Proceed" to continue.

#### After Installation

If you initially chose not to enable HTTPS, you can enable it anytime:

```bash
cd ~/metricframe
curl -fsSL https://get.metricframe.ai/enable-tls.sh | bash
```

To disable HTTPS later:

```bash
cd ~/metricframe
rm docker-compose.override.yml nginx-tls.conf
docker compose down && docker compose up -d
```

### Desktop

1. Open MetricFrame Desktop
2. Go to **Settings** → **General** tab
3. Find the **Encrypted Connections** section
4. Toggle **Enable encrypted connections (HTTPS)** to ON
5. Restart the application

The certificate is generated automatically on next launch. Electron trusts the certificate transparently — you won't see any browser warnings.

### Certificate Details

| Property | Value |
|----------|-------|
| **Type** | Self-signed X.509 |
| **Key** | RSA 2048-bit |
| **Validity** | 365 days |
| **Subject** | `CN=localhost, O=MetricFrame` |
| **SAN** | `localhost`, `127.0.0.1` |
| **Docker location** | `~/metricframe/certs/` |
| **Desktop location** | `~/Library/Application Support/metricframe/certs/` (macOS) |

### Adding to System Trust Store (Optional)

To suppress browser certificate warnings in Docker mode, you can add the certificate to your system's trust store:

**macOS:**
```bash
sudo security add-trusted-cert -d -r trustRoot \
  -k /Library/Keychains/System.keychain ~/metricframe/certs/metricframe.crt
```

**Linux (Debian/Ubuntu):**
```bash
sudo cp ~/metricframe/certs/metricframe.crt /usr/local/share/ca-certificates/
sudo update-ca-certificates
```

After adding to the trust store and restarting your browser, the certificate warning will no longer appear.

### Troubleshooting TLS

**Port 443 already in use (Docker):** Edit `docker-compose.override.yml` and change the port mapping to `"8443:443"`, then access via `https://localhost:8443`.

**Certificate expired (after 1 year):** Docker: run `enable-tls.sh` again. Desktop: disable and re-enable HTTPS in Settings, then restart.

**Cannot connect after enabling (Desktop):** Check logs at `~/Library/Application Support/metricframe/logs/metricframe.log`. Try disabling HTTPS, restarting, then re-enabling.

**For internet-facing deployments:** Self-signed certificates are intended for localhost and local networks only. For production deployments exposed to the internet, use a proper CA-signed certificate (Let's Encrypt recommended) behind a reverse proxy.

---

## Deployment-Specific Security

### Docker Deployment

Docker deployment is designed for multi-user team environments:

| Feature | Implementation |
|---------|----------------|
| **Session Storage** | Redis-backed for multi-worker consistency |
| **Database** | PostgreSQL with persistent volumes |
| **Workers** | 4 uvicorn workers behind nginx |
| **Port** | 3000 (configurable) |
| **Container Isolation** | Services run in isolated containers |

**Security Considerations:**
- Sessions persist across container restarts (Redis AOF persistence)
- All workers share session state via Redis
- Database credentials in environment variables (use secrets in production)
- Network isolation via Docker bridge network

### Desktop App

The desktop app is optimized for single-user local use:

| Feature | Implementation |
|---------|----------------|
| **Session Storage** | In-memory (single process) |
| **Database** | SQLite (local file) |
| **Workers** | Single uvicorn process |
| **Port** | Dynamic (Electron-managed) |
| **Isolation** | OS-level process isolation |

**Security Considerations:**
- No Redis required - sessions stored in process memory
- Database file stored in user's application data directory
- API keys encrypted in SQLite using same Fernet encryption
- No network exposure - Electron manages all connections
- Session persists only while app is running

### Comparison

| Aspect | Docker | Desktop |
|--------|--------|---------|
| Multi-user support | Yes | No (single user) |
| Session persistence | Redis (survives restarts) | Memory (cleared on close) |
| Database | PostgreSQL | SQLite |
| Network access | Configurable | Localhost only |
| AI API calls | HTTPS to providers | HTTPS to providers |
| API key storage | Encrypted in PostgreSQL | Encrypted in SQLite |

## Summary

| Component | Security Measure |
|-----------|-----------------|
| Local traffic | Isolated on loopback interface |
| AI API calls | TLS 1.3 encryption |
| API keys | Fernet encryption at rest |
| Passwords | bcrypt hashing |
| Sessions | Redis (Docker) / In-memory (Desktop) |
| Access control | Role-based permissions |
| Web security | Standard security headers |

---

**Questions?** See [Troubleshooting](troubleshooting.md) or open an issue on GitHub.
