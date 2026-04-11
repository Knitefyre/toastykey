# Security Policy

## Supported Versions

| Version | Supported |
|---------|-----------|
| 1.0.x   | ✅ Yes    |
| 0.4.x   | ⚠️ Critical fixes only |
| < 0.4.0 | ❌ No     |

## Reporting a Vulnerability

**Please do not report security vulnerabilities through public GitHub issues.**

If you discover a security vulnerability in ToastyKey, please report it privately:

**Email:** Open a [private security advisory](https://github.com/Knitefyre/toastykey/security/advisories/new) on GitHub, or contact [@premmuditc](https://instagram.com/premmuditc) on Instagram.

Include in your report:
- Description of the vulnerability
- Steps to reproduce
- Potential impact
- Suggested fix (if you have one)

### Response SLA

| Milestone | Target |
|-----------|--------|
| Acknowledgement | Within 48 hours |
| Initial assessment | Within 5 business days |
| Patch released | Within 14 days for critical issues |
| Public disclosure | After patch is available |

We follow responsible disclosure. We ask that you:
1. Give us reasonable time to fix the issue before public disclosure
2. Not access or modify data that isn't yours
3. Not disrupt the service for other users

## Security Design

ToastyKey is designed to be local-first and privacy-preserving:

- **API keys** are encrypted with AES-256-GCM before being written to disk
- **Encryption key** is derived from your machine's unique identifier — never stored in plaintext
- **Zero telemetry** — no data is ever sent anywhere; everything stays on your machine
- **Local SQLite** — all call logs stay on your machine
- **No cloud dependency** — ToastyKey works entirely offline

## PGP

Contact via GitHub security advisories or [@premmuditc](https://instagram.com/premmuditc) for secure communication.
