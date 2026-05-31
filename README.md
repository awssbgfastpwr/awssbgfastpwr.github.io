# AWS Student Builder Group FAST Peshawar

Static website for AWS Student Builder Group FAST Peshawar, a student-led community at FAST NUCES Peshawar for AWS, AI, cloud engineering, DevOps, and security learning.

- Website: https://awssbgfastpwr.github.io
- Meetup: https://www.meetup.com/aws-sbg-at-nuces/
- LinkedIn: https://pk.linkedin.com/company/awsccfastpwr
- GitHub: https://github.com/awssbgfastpwr

## Project Structure

```text
data/                  Public website content in JSON
public/                Static assets, styles, client scripts, media, and brand files
scripts/build-site.mjs Static site generator that writes dist/
scripts/check-site.mjs Source and content validation
scripts/serve.mjs      Local build-and-serve development server
src/render.mjs         Shared HTML rendering helpers and components
```

The site is generated with Node.js and plain static assets. No frontend framework is required.

## Local Development

Requirements:

- Node.js 20 or newer
- npm

Run the site locally:

```sh
npm run dev
```

The dev server builds the site into `dist/` and serves it at `http://localhost:4173`.

Useful commands:

```sh
npm run build      # Generate the static site in dist/
npm run lint       # Validate required files, JSON content, URLs, and public data
npm run typecheck  # Check JavaScript syntax
npm test           # Runs the lint check
```

To refresh generated event data from the public Meetup page:

```sh
npm run sync:events
```

## Contributing

Contributions are welcome. Good first contributions include:

- Fixing typos or stale links
- Improving event, learning, project, partner, or team data
- Adding missing accessibility text
- Improving responsive layout or site performance
- Reporting broken pages or public data problems

Read [CONTRIBUTING.md](CONTRIBUTING.md) before opening a pull request.

## Public Data Rules

This repository is intended to be public. Do not commit:

- Private keys, API tokens, access tokens, or passwords
- Personal phone numbers, private email addresses, CNIC/passport numbers, student IDs, or other sensitive personal data
- Private event attendance lists
- Images that the group does not own or have permission to publish

Use `.env.example` as the reference for public configuration. The MVP should not require secrets.

## Deployment

GitHub Pages deployment is handled by `.github/workflows/deploy.yml` on pushes to `main`, scheduled daily event syncs, and manual workflow runs.

## License

No open-source license has been selected yet. Before accepting broad outside contributions, the maintainers should add a license that matches the project's goals.
