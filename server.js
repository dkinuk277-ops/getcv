// ============================================================
// AI Resume Builder — Backend Server
// Endpoints:
//   POST /api/parse-resume   (multipart file: PDF or DOCX)
//   POST /api/enhance        (JSON: { text, context })
//   POST /api/fresher-build  (JSON: { name, field, education, skills })
//   GET  /api/health
// Serves frontend from /public
// ============================================================

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const mammoth = require('mammoth');
const Anthropic = require('@anthropic-ai/sdk');

const app = express();
const PORT = process.env.PORT || 3000;
const MODEL = process.env.CLAUDE_MODEL || 'claude-sonnet-4-6';

// ---- Anthropic client (API key stays on the server, never sent to browser)
if (!process.env.ANTHROPIC_API_KEY) {
  console.warn('⚠️  ANTHROPIC_API_KEY is not set. Copy .env.example to .env and add your key.');
}
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// ---- Middleware
app.use(cors()); // same-origin in production; open for local dev
app.use(express.json({ limit: '2mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// File upload: keep in memory (no disk writes), 10 MB cap
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const ok = ['application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/msword'].includes(file.mimetype)
      || /\.(pdf|docx|doc)$/i.test(file.originalname);
    cb(ok ? null : new Error('Only PDF and DOCX files are supported'), ok);
  }
});

// ============================================================
// Helpers
// ============================================================

async function extractPDF(buffer) {
  // Modern pdf.js — reliable across PDF generators, preserves line layout
  const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
  const fontPath = path.join(__dirname, 'node_modules/pdfjs-dist/standard_fonts/');
  const doc = await pdfjs.getDocument({
    data: new Uint8Array(buffer),
    standardFontDataUrl: fontPath,
    useSystemFonts: true
  }).promise;

  let text = '';
  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i);
    const tc = await page.getTextContent();
    let lastY = null, line = '';
    for (const item of tc.items) {
      const y = item.transform[5];
      if (lastY !== null && Math.abs(y - lastY) > 2) { text += line.trimEnd() + '\n'; line = ''; }
      line += item.str + ' ';
      lastY = y;
    }
    text += line.trimEnd() + '\n\n';
  }
  return text;
}

async function extractText(buffer, filename) {
  if (/\.pdf$/i.test(filename)) return extractPDF(buffer);
  if (/\.docx?$/i.test(filename)) {
    const result = await mammoth.extractRawText({ buffer });
    return result.value;
  }
  throw new Error('Unsupported file type');
}

function requireKey(res) {
  if (!process.env.ANTHROPIC_API_KEY) {
    res.status(503).json({ error: 'Server is missing ANTHROPIC_API_KEY — add it to the .env file and restart.' });
    return false;
  }
  return true;
}

// Ask Claude and force a clean JSON reply
async function claudeJSON(prompt, maxTokens = 4000) {
  const msg = await anthropic.messages.create({
    model: MODEL,
    max_tokens: maxTokens,
    messages: [{ role: 'user', content: prompt }]
  });
  const raw = msg.content
    .filter(b => b.type === 'text')
    .map(b => b.text)
    .join('\n');
  // Strip markdown fences if the model added them
  const clean = raw.replace(/```json|```/g, '').trim();
  // Find first { ... last } in case of any preamble
  const start = clean.indexOf('{');
  const end = clean.lastIndexOf('}');
  if (start === -1 || end === -1) throw new Error('Model did not return JSON');
  return JSON.parse(clean.slice(start, end + 1));
}

async function claudeText(prompt, maxTokens = 1500) {
  const msg = await anthropic.messages.create({
    model: MODEL,
    max_tokens: maxTokens,
    messages: [{ role: 'user', content: prompt }]
  });
  return msg.content.filter(b => b.type === 'text').map(b => b.text).join('\n').trim();
}

// Recalculate durations so tenure charts are always correct,
// even if the model leaves duration blank
function fixDurations(parsed) {
  const nowYear = new Date().getFullYear();
  (parsed.experience || []).forEach(job => {
    if (!job.duration || job.duration === 0) {
      const sy = parseInt(String(job.start || '').match(/\d{4}/)?.[0]);
      const eRaw = String(job.end || '');
      const ey = /present|current|now|till date|to date/i.test(eRaw)
        ? nowYear
        : parseInt(eRaw.match(/\d{4}/)?.[0]);
      if (sy && ey) job.duration = Math.max(ey - sy, 0) || 1;
    }
  });
  return parsed;
}

// ============================================================
// Routes
// ============================================================


// ============================================================
// AUTH — simple built-in email/password
// Passwords hashed with scrypt (never stored in plain text).
// Users persisted to data/users.json. Sessions are in-memory +
// mirrored to data/sessions.json so restarts keep users signed in.
// NOTE: behind HTTPS in production, set COOKIE_SECURE=true in .env
// ============================================================
const crypto = require('crypto');
const rateLimit = require('express-rate-limit');
// Trust Railway's proxy header so rate-limit sees real client IPs
app.set('trust proxy', 1);
// Signup/login: 20 attempts per 15 min per IP — stops brute-force credential stuffing
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, max: 20,
  standardHeaders: true, legacyHeaders: false,
  message: { error: 'Too many attempts — please wait 15 minutes and try again' }
});
// AI endpoints: 30 requests per hour per IP — protects your Anthropic bill from abuse
const aiLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, max: 30,
  standardHeaders: true, legacyHeaders: false,
  message: { error: 'AI rate limit reached — please wait an hour and try again' }
});
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, 'data');
const USERS_FILE = path.join(DATA_DIR, 'users.json');
const SESS_FILE = path.join(DATA_DIR, 'sessions.json');
const fsx = require('fs');
if (!fsx.existsSync(DATA_DIR)) fsx.mkdirSync(DATA_DIR, { recursive: true });

function loadJSON(f, fallback){ try { return JSON.parse(fsx.readFileSync(f, 'utf8')); } catch { return fallback; } }
function saveJSON(f, v){ fsx.writeFileSync(f, JSON.stringify(v, null, 2)); }

let users = loadJSON(USERS_FILE, {});          // email -> {name, salt, hash, created}
let sessions = loadJSON(SESS_FILE, {});        // token -> {email, created}

function hashPassword(pw, salt){
  salt = salt || crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(pw, salt, 64).toString('hex');
  return { salt, hash };
}
function verifyPassword(pw, rec){
  const h = crypto.scryptSync(pw, rec.salt, 64).toString('hex');
  try { return crypto.timingSafeEqual(Buffer.from(h), Buffer.from(rec.hash)); } catch { return false; }
}
function getToken(req){
  const m = (req.headers.cookie || '').match(/(?:^|;\s*)gcv_session=([A-Za-z0-9]+)/);
  return m ? m[1] : null;
}
function setSessionCookie(res, token){
  const secure = process.env.COOKIE_SECURE === 'true' ? '; Secure' : '';
  res.setHeader('Set-Cookie', `gcv_session=${token}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${60*60*24*30}${secure}`);
}
function clearSessionCookie(res){
  res.setHeader('Set-Cookie', 'gcv_session=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0');
}
function requireAuth(req, res, next){
  const t = getToken(req);
  const s = t && sessions[t];
  if (!s) return res.status(401).json({ error: 'Not signed in' });
  req.user = s;
  next();
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

app.post('/api/auth/signup', authLimiter, (req, res) => {
  const { name, email, password } = req.body || {};
  const em = String(email || '').trim().toLowerCase();
  if (!EMAIL_RE.test(em)) return res.status(400).json({ error: 'Please enter a valid email address' });
  if (!password || password.length < 8) return res.status(400).json({ error: 'Password must be at least 8 characters' });
  if (users[em]) return res.status(409).json({ error: 'An account with this email already exists — try signing in' });
  const { salt, hash } = hashPassword(password);
  users[em] = { name: String(name || '').trim().slice(0, 80), salt, hash, created: new Date().toISOString() };
  saveJSON(USERS_FILE, users);
  const token = crypto.randomBytes(24).toString('hex');
  sessions[token] = { email: em, created: Date.now() };
  saveJSON(SESS_FILE, sessions);
  setSessionCookie(res, token);
  res.json({ success: true, user: { email: em, name: users[em].name } });
});

app.post('/api/auth/login', authLimiter, (req, res) => {
  const { email, password } = req.body || {};
  const em = String(email || '').trim().toLowerCase();
  const rec = users[em];
  if (!rec || !verifyPassword(String(password || ''), rec)) {
    return res.status(401).json({ error: 'Incorrect email or password' });
  }
  const token = crypto.randomBytes(24).toString('hex');
  sessions[token] = { email: em, created: Date.now() };
  saveJSON(SESS_FILE, sessions);
  setSessionCookie(res, token);
  res.json({ success: true, user: { email: em, name: rec.name } });
});

app.post('/api/auth/logout', (req, res) => {
  const t = getToken(req);
  if (t && sessions[t]) { delete sessions[t]; saveJSON(SESS_FILE, sessions); }
  clearSessionCookie(res);
  res.json({ success: true });
});

// GDPR: user can delete their entire account + all saved resumes
app.post('/api/auth/delete-account', requireAuth, (req, res) => {
  const { password } = req.body || {};
  const rec = users[req.user.email];
  if (!rec || !verifyPassword(String(password || ''), rec)) {
    return res.status(401).json({ error: 'Incorrect password — account not deleted' });
  }
  const email = req.user.email;
  // remove all saved resumes for this user
  try { fsx.unlinkSync(resumesFile(email)); } catch {}
  // wipe every active session for this user
  Object.keys(sessions).forEach(t => { if (sessions[t].email === email) delete sessions[t]; });
  saveJSON(SESS_FILE, sessions);
  // delete the user record itself
  delete users[email];
  saveJSON(USERS_FILE, users);
  clearSessionCookie(res);
  res.json({ success: true });
});

app.get('/api/auth/me', (req, res) => {
  const t = getToken(req);
  const s = t && sessions[t];
  if (!s || !users[s.email]) return res.status(401).json({ error: 'Not signed in' });
  res.json({ success: true, user: { email: s.email, name: users[s.email].name } });
});


// ============================================================
// SAVED RESUMES — per-user storage in data/resumes/<email>.json
// ============================================================
const RES_DIR = path.join(DATA_DIR, 'resumes');
if (!fsx.existsSync(RES_DIR)) fsx.mkdirSync(RES_DIR, { recursive: true });
function resumesFile(email){
  return path.join(RES_DIR, email.replace(/[^a-z0-9@._-]/gi, '_') + '.json');
}
function loadResumes(email){ return loadJSON(resumesFile(email), []); }
function saveResumes(email, list){ saveJSON(resumesFile(email), list); }
const MAX_SAVED = 20;

// List (lightweight - no full data)
app.get('/api/resumes', requireAuth, (req, res) => {
  const list = loadResumes(req.user.email).map(r => ({
    id: r.id, name: r.name, template: r.template, updated: r.updated,
    who: r.data?.personal?.name || '', title: r.data?.experience?.[0]?.title || ''
  }));
  list.sort((a,b)=> (b.updated||'').localeCompare(a.updated||''));
  res.json({ success: true, resumes: list });
});

// Save / update
app.post('/api/resumes', requireAuth, (req, res) => {
  const { id, name, template, data } = req.body || {};
  if (!name || !name.trim()) return res.status(400).json({ error: 'Please give this resume a name' });
  if (!data || typeof data !== 'object') return res.status(400).json({ error: 'No resume data to save' });
  const list = loadResumes(req.user.email);
  const now = new Date().toISOString();
  const existing = id && list.find(r => r.id === id);
  if (existing) {
    existing.name = name.trim().slice(0, 80);
    existing.template = template || existing.template;
    existing.data = data;
    existing.updated = now;
  } else {
    if (list.length >= MAX_SAVED) return res.status(400).json({ error: `Maximum ${MAX_SAVED} saved resumes — delete one first` });
    list.push({ id: crypto.randomBytes(8).toString('hex'), name: name.trim().slice(0, 80),
      template: template || 'exec-navy', data, created: now, updated: now });
  }
  saveResumes(req.user.email, list);
  const saved = existing || list[list.length - 1];
  res.json({ success: true, id: saved.id });
});

// Load one (full data)
app.get('/api/resumes/:id', requireAuth, (req, res) => {
  const r = loadResumes(req.user.email).find(x => x.id === req.params.id);
  if (!r) return res.status(404).json({ error: 'Resume not found' });
  res.json({ success: true, resume: r });
});

// Delete
app.delete('/api/resumes/:id', requireAuth, (req, res) => {
  const list = loadResumes(req.user.email);
  const idx = list.findIndex(x => x.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Resume not found' });
  list.splice(idx, 1);
  saveResumes(req.user.email, list);
  res.json({ success: true });
});

app.get('/api/health', (req, res) => {
  res.json({ ok: true, model: MODEL, keyConfigured: !!process.env.ANTHROPIC_API_KEY });
});

// ---- 1. Parse an uploaded resume ---------------------------
app.post('/api/parse-resume', aiLimiter, requireAuth, upload.single('resume'), async (req, res) => {
  try {
    if (!requireKey(res)) return;
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

    const text = await extractText(req.file.buffer, req.file.originalname);
    if (!text || text.trim().length < 50) {
      return res.status(422).json({
        error: 'Could not extract readable text. If this is a scanned/image PDF, OCR is needed.'
      });
    }

    // Send the FULL text (server side has no browser limits).
    // Cap at 60k chars as a sanity limit — far beyond any real resume.
    const resumeText = text.slice(0, 60000);

    const prompt = `You are a resume parsing engine. Parse the resume text below into JSON.

CRITICAL RULES:
1. Extract EVERY job role in the work history — do not skip or merge any. Scan the ENTIRE document for company names, job titles, and date ranges.
2. Order experience from most recent to oldest.
3. Detect ALL sections present, including non-standard ones (Publications, Patents, Research, Volunteer Work, Board Roles, Speaking, Side Projects, etc.) and put them in extra_sections.
4. Keep every bullet point of each role in "desc" (join with newlines).
4b. DATES: return every "start" and "end" in "MMM/YYYY" format (e.g. "Mar/2021", "Jan/2016"). If only a year is known, return "YYYY". Use exactly "Present" for a current role's end.
5. SUB-SECTIONS INSIDE A ROLE: many resumes group a role's bullets under sub-headings (e.g. "Governance", "Risk Management", "Key Achievements", "Stakeholder Engagement"). When the original resume has such groupings, preserve them: write the sub-heading as its own line in "desc" prefixed with "## " (e.g. "## Governance"), followed by that group's bullet lines. Detect sub-headings by formatting cues in the text: short standalone lines (1-4 words) that are not sentences, often bold/underlined in the original, followed by related bullets. NEVER invent sub-headings that are not in the resume.
6. If a field is absent in the resume, use an empty string or empty array — never invent data.
7. Respond ONLY with the JSON object. No preamble, no markdown fences.

CONTACT DETAILS — scan carefully in the top ~15 lines and any footer:
- "linkedin": full LinkedIn URL. Look for anything containing linkedin.com/in/, "LinkedIn:", or the LinkedIn handle. Include the full https:// URL if the domain is present, otherwise the path.
- "location": city and country/region (e.g. "Manchester, UK", "Bangalore, India"). Never leave blank if any city name appears near the contact block.
- "website": personal site, portfolio, GitHub profile URL, etc.
- "phone": including country code if present.

HEADLINE: a one-line professional strapline derived from the resume, e.g. "GRC Leader · Risk & Compliance · AI Governance". Build it from the person's current title and specialisms if not explicitly present.

SKILLS TAGGING (important for career analytics):
For each job in "experience", also fill "skills_used": an array of skills from the person's overall skills list that are demonstrated in that role's description or that a reasonable reader would infer from the role title/responsibilities. This lets us chart when each skill was first acquired. If unsure, still assign it — earlier roles usually introduce foundational skills.

DOMAIN EXPERTISE (important for career analytics — works for ANY profession):
Fill "domains": group this person's career into 3-8 expertise domains, in the vocabulary of THEIR profession (a GRC professional gets "Risk Management", "Audits — ISO / SOC1 / SOC2 / ITGC"; a nurse gets "Patient Care"; a developer gets "Backend Engineering"). Rules:
- Each domain: { "name", "start_year" (when first practised, infer from which roles mention it), "end_year" (null if still current), "detail" (short metric if evidenced: "team of 6", "TPRM framework" — else empty string) }
- If one broad domain changed character across companies, SPLIT it into two rows sharing the family name (e.g. "Audits — Internal / Regulatory" 2012-2019 and "Audits — ISO / SOC1 / ITGC" 2019-null).
- Order by start_year ascending. Never invent domains a sparse resume can't support — return [] if unsure.

JSON schema:
{
  "personal": { "name": "", "headline": "", "email": "", "phone": "", "location": "", "linkedin": "", "website": "" },
  "summary": "",
  "experience": [ { "title": "", "company": "", "location": "", "start": "", "end": "", "duration": 0, "desc": "", "skills_used": [] } ],
  "education": [ { "degree": "", "institution": "", "year": "", "grade": "" } ],
  "skills": [],
  "certifications": [ { "name": "", "issuer": "", "year": "" } ],
  "languages": [],
  "projects": [ { "name": "", "desc": "" } ],
  "accomplishments": [],
  "courses": [ { "name": "", "provider": "", "year": "" } ],
  "domains": [ { "name": "", "start_year": 0, "end_year": null, "detail": "" } ],
  "extra_sections": [ { "heading": "", "items": [] } ]
}

"accomplishments": notable awards, recognitions, quantified wins found anywhere in the resume — one string each. Empty array if none.
"courses": training courses, MOOCs, bootcamps, workshops (distinct from formal education and certifications). Empty array if none.

RESUME TEXT:
${resumeText}`;

    let parsed = await claudeJSON(prompt, 8000);
    parsed = fixDurations(parsed);
    res.json({ success: true, data: parsed });
  } catch (err) {
    console.error('parse-resume error:', err.message);
    res.status(500).json({ error: err.message || 'Parsing failed' });
  }
});

// ---- 2. Enhance a section of text --------------------------
app.post('/api/enhance', aiLimiter, requireAuth, async (req, res) => {
  try {
    const { text, context } = req.body;
    if (!requireKey(res)) return;
    if (!text) return res.status(400).json({ error: 'No text provided' });

    const prompt = `Rewrite the following resume ${context || 'section'} to be more impactful and professional.
Use strong action verbs, quantify achievements where the original implies numbers, keep it truthful — do not invent facts.
Keep roughly the same length. Respond with ONLY the rewritten text, no preamble.

TEXT:
${text.slice(0, 4000)}`;

    const enhanced = await claudeText(prompt);
    res.json({ success: true, text: enhanced });
  } catch (err) {
    console.error('enhance error:', err.message);
    res.status(500).json({ error: err.message || 'Enhancement failed' });
  }
});

// ---- 3. Build a fresher resume from scratch -----------------
app.post('/api/fresher-build', aiLimiter, requireAuth, async (req, res) => {
  try {
    const { name, field, education, skills } = req.body;
    if (!requireKey(res)) return;
    if (!field) return res.status(400).json({ error: 'Field/domain is required' });

    const prompt = `Create a starter resume for a fresher (no work experience) in JSON.
Candidate name: ${name || 'Candidate'}
Target field: ${field}
Education: ${education || 'not specified'}
Known skills: ${skills || 'suggest relevant beginner skills'}

Write a strong summary, suggest 6-10 relevant skills, and 2 sample academic/personal projects appropriate for this field. Do not invent work experience.
Respond ONLY with JSON matching:
{
  "personal": { "name": "", "email": "", "phone": "", "location": "", "linkedin": "", "website": "" },
  "summary": "",
  "experience": [],
  "education": [ { "degree": "", "institution": "", "year": "", "grade": "" } ],
  "skills": [],
  "certifications": [],
  "languages": [],
  "projects": [ { "name": "", "desc": "" } ],
  "extra_sections": []
}`;

    const parsed = await claudeJSON(prompt, 4000);
    res.json({ success: true, data: parsed });
  } catch (err) {
    console.error('fresher-build error:', err.message);
    res.status(500).json({ error: err.message || 'Build failed' });
  }
});

// ---- 4. Single field AI suggestion ------------------------
app.post('/api/ask-field', aiLimiter, requireAuth, async (req, res) => {
  try {
    if (!requireKey(res)) return;
    const { field, value, context } = req.body;
    if (!field) return res.status(400).json({ error: 'Field name required' });

    const prompt = `You are helping a job seeker refine one field of their resume.
Field: "${field}"
Context: ${context || 'no extra context'}
Current value: "${value || '(empty)'}"

Suggest a stronger, more polished value for this field. Rules:
- Keep it factually anchored to what's given — do not invent employers, dates, credentials.
- Match typical resume style (concise, professional, active voice).
- If it's a job title, suggest a clear industry-standard version.
- If it's a headline/strapline, use " · " as separators.
- If it's a description, keep to 2-4 short bullet-worthy lines separated by newlines.
- Respond with ONLY the suggested text, no preamble, no quotes around it.`;

    const suggestion = await claudeText(prompt, 500);
    res.json({ success: true, text: suggestion });
  } catch (err) {
    console.error('ask-field error:', err.message);
    res.status(500).json({ error: err.message || 'Suggestion failed' });
  }
});

// SPA fallback
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`✅ AI Resume Builder running at http://localhost:${PORT}`);
  console.log(`   Model: ${MODEL} | API key configured: ${!!process.env.ANTHROPIC_API_KEY}`);
});
