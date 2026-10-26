// Plans & entitlements. Pure logic, no I/O, so it is easy to test.
// Enforcement is OFF unless PLANS_ENFORCED=true, so existing users keep full access
// until billing is live.
'use strict';

const RANK = { none: 0, basic: 1, standard: 2, pro: 3, advanced: 4 };
const TIERS = Object.keys(RANK);

// Templates by tier (ids from public/app.js TEMPLATES). Higher tiers include lower ones.
const BASIC_TPL = ['classic-teal', 'modern-indigo', 'ats-plain'];
const STANDARD_TPL = BASIC_TPL.concat(['exec-navy', 'minimal-slate', 'forest-pro', 'ocean-blue', 'graphite', 'emerald', 'steel-corp']);

// feature -> minimum tier
const FEATURE_MIN = {
  save: 'standard',        // save to account / reopen anytime
  publish: 'pro',          // public URL
  coverLetters: 'pro',
  tailor: 'pro',           // Job Tailor
  atsScore: 'advanced',    // ATS match score, fit analysis
  download: 'basic'        // paid to download (enforced client-side + billing stage)
};

function enforced(env = process.env){ return String(env.PLANS_ENFORCED || '').toLowerCase() === 'true'; }

function adminEmails(env = process.env){
  return String(env.ADMIN_EMAILS || '').split(',').map(s => s.trim().toLowerCase()).filter(Boolean);
}

// Current effective tier for a user record.
function tierOf(user, now = Date.now()){
  const p = user && user.plan;
  if (!p || !RANK[p.tier]) return 'none';
  if (p.validUntil && new Date(p.validUntil).getTime() < now) return 'none';
  if (p.status && !['active', 'trialing'].includes(p.status)) return 'none';
  return p.tier;
}

function can(tier, feature, env = process.env){
  if (!enforced(env)) return true;
  const min = FEATURE_MIN[feature];
  if (!min) return false;
  return RANK[tier] >= RANK[min];
}

function allowedTemplates(tier, env = process.env){
  if (!enforced(env)) return null;            // null = all
  if (RANK[tier] >= RANK.pro) return null;
  if (tier === 'standard') return STANDARD_TPL.slice();
  return BASIC_TPL.slice();                   // basic / none
}

function templateAllowed(tier, id, env = process.env){
  const a = allowedTemplates(tier, env);
  return !a || a.includes(id);
}

// What the client needs to render locks.
function describe(user, env = process.env){
  const tier = tierOf(user);
  const feats = {};
  Object.keys(FEATURE_MIN).forEach(f => { feats[f] = can(tier, f, env); });
  return {
    enforced: enforced(env),
    tier,
    validUntil: (user && user.plan && user.plan.validUntil) || null,
    features: feats,
    templates: allowedTemplates(tier, env)
  };
}

module.exports = { RANK, TIERS, FEATURE_MIN, BASIC_TPL, STANDARD_TPL, enforced, adminEmails, tierOf, can, allowedTemplates, templateAllowed, describe };
