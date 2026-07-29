# Security Policy

## Reporting a Vulnerability

We take the security of QBANK seriously. If you discover a security vulnerability, please report it responsibly.

### How to Report

**Do NOT create a public GitHub issue for security vulnerabilities.**

Instead, please use one of these methods:

1. **GitHub Security Advisories** (Preferred)
   - Go to https://github.com/Xaruzo/qbank/security/advisories/new
   - Fill out the vulnerability report form
   - We will respond within 48 hours

2. **Email** (Alternative)
   - Contact the repository maintainers directly through GitHub

### What to Include

Please provide as much information as possible:

- Type of vulnerability (XSS, CSRF, SQL injection, etc.)
- Steps to reproduce the vulnerability
- Potential impact of the vulnerability
- Any suggested fixes or mitigations
- Your name/handle if you'd like to be credited

## Scope

### In Scope

The following are considered in scope for vulnerability reports:

- The QBANK web application at https://qbank-vr5s.onrender.com
- Source code in this repository
- Client-side vulnerabilities (XSS, CSRF, etc.)
- Authentication and authorization issues
- Data exposure or privacy concerns
- Dependency vulnerabilities with active exploits

### Out of Scope

The following are NOT considered vulnerabilities:

- Issues requiring physical access to a user's device
- Social engineering attacks against QBANK users
- Denial of Service (DoS) attacks
- Rate limiting issues
- Missing security headers without demonstrated impact
- Vulnerabilities in third-party services (Supabase, Render, etc.)
- Issues in outdated browsers or unsupported operating systems
- Self-XSS (requires user to paste malicious code)
- Clickjacking on pages with no sensitive actions
- SPF/DMARC/DKIM records

## Response Timeline

We aim to:

- **48 hours**: Acknowledge receipt of your report
- **7 days**: Provide an initial assessment and estimated timeline
- **30 days**: Resolve critical vulnerabilities
- **90 days**: Resolve medium/low severity issues

We will keep you informed of our progress throughout the process.

## Disclosure Policy

- We follow coordinated disclosure practices
- We ask that you do not publicly disclose the vulnerability until we have released a fix
- Once fixed, we may publish a security advisory crediting you (with your permission)
- We aim to fix critical issues within 30 days before public disclosure

## Security Best Practices

QBANK implements several security measures:

### Frontend Security
- Content Security Policy (CSP) headers
- XSS protection through React's built-in escaping
- HTTPS-only in production
- No inline scripts or styles
- Secure cookie settings

### Backend Security (Supabase)
- Row-Level Security (RLS) policies
- Authentication via Supabase Auth
- OAuth 2.0 with Google
- Encrypted connections (SSL/TLS)
- Regular security updates

### Data Privacy
- Minimal data collection
- User data isolated per account
- No sharing of personal information
- Compliance with data protection best practices

## Supported Versions

We provide security updates for:

| Version | Supported          |
| ------- | ------------------ |
| Latest  | :white_check_mark: |
| Older   | :x:                |

We recommend always using the latest version deployed at https://qbank-vr5s.onrender.com

## Safe Harbor

We support safe harbor for security researchers who:

- Make a good faith effort to avoid privacy violations and service disruption
- Only interact with accounts you own or with explicit permission
- Do not access or modify user data beyond what is necessary to demonstrate the vulnerability
- Give us reasonable time to fix the issue before public disclosure
- Do not use exploits for purposes other than verification

We will not pursue legal action against researchers who follow these guidelines.

## Acknowledgments

We would like to thank the following security researchers for responsibly disclosing vulnerabilities:

*No vulnerabilities reported yet*

---

**Last Updated**: 2026-07-29

For questions about this policy, please open a discussion on GitHub.
