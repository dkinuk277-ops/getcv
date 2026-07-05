# GetCV — AI Resume Builder

An AI-powered resume builder by DeCompliance (www.decompliance.uk).

## Local development

```bash
npm install
cp .env.example .env
# Edit .env and add your ANTHROPIC_API_KEY
npm start
```

Then open http://localhost:3000

## Environment variables

- `ANTHROPIC_API_KEY` (required) — your Anthropic API key
- `CLAUDE_MODEL` (optional) — defaults to `claude-sonnet-4-6`
- `DATA_DIR` (optional) — where user data is stored. Defaults to `./data` locally. On Railway, set this to the mount path of your persistent volume (e.g. `/data`).
- `COOKIE_SECURE` (optional) — set to `true` in production so session cookies are HTTPS-only
- `PORT` (optional) — defaults to `3000`

## Production checklist

- [ ] `ANTHROPIC_API_KEY` set as an environment variable (not committed)
- [ ] `DATA_DIR` pointed at a persistent volume mount
- [ ] `COOKIE_SECURE=true`
- [ ] Privacy Policy live at `/privacy-policy`
- [ ] Terms of Use live at `/terms-of-use`
- [ ] Regular backups of `DATA_DIR` configured
