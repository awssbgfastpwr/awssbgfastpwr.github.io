# Security Policy

## Reporting A Vulnerability

If you find a security issue, do not open a public issue with exploit details.

Use one of these safer routes:

- Contact the maintainers through the official community contact path listed on the website.
- If GitHub security advisories are enabled for this repository, open a private advisory.

Include:

- A short description of the issue
- Steps to reproduce
- Potential impact
- Affected files, URLs, or workflows
- Any suggested fix, if available

## Public Repo Safety

This repository is intended to be public. Do not commit:

- API keys, private keys, passwords, tokens, or cookies
- Private student, attendee, organizer, speaker, or partner data
- Internal documents or private event materials
- Unlicensed images, logos, or media
- Generated files containing secrets or local paths

The validation script checks for some private key patterns in `data/`, but it is not a complete secret scanner. Review changes manually before opening a pull request.

## Supported Surface

The current project is a static website generated from local JSON data and public assets. Security-sensitive areas include:

- Contact form endpoints in `data/site.json`
- Certificate verification API links
- External links in public content
- GitHub Pages deployment workflow
- Public images and team profile data

## Maintainer Response

Maintainers should acknowledge credible reports, investigate the impact, prepare a fix, and publish a short note when public disclosure is appropriate.
