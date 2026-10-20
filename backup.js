// Encrypted offsite backups of the data folder (accounts, resumes, cover letters,
// published pages) to any S3-compatible bucket (Cloudflare R2, AWS S3, Backblaze B2...).
//
// Configure with environment variables (all required to enable it):
//   BACKUP_S3_ENDPOINT           e.g. https://<account-id>.r2.cloudflarestorage.com
//   BACKUP_S3_BUCKET             bucket name
//   BACKUP_S3_ACCESS_KEY_ID
//   BACKUP_S3_SECRET_ACCESS_KEY
//   BACKUP_ENCRYPTION_KEY        long random passphrase (32+ chars). KEEP A COPY OFFLINE:
//                                without it a backup cannot be decrypted.
// Optional:
//   BACKUP_HOUR_UTC (default 3)  hour of day for the daily backup
//   BACKUP_KEEP     (default 30) number of backups to keep
//   BACKUP_S3_REGION (default 'auto')
//
// Files are gzipped, then encrypted with AES-256-GCM before upload, because they
// contain personal data and password hashes. sessions.json is NOT backed up.
//
// CLI:  node backup.js now                      run a backup now
//       node backup.js list                     list backups in the bucket
//       node backup.js restore <key> <dir>      download + decrypt into <dir> (empty dir)
'use strict';
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const crypto = require('crypto');

const MAGIC = Buffer.from('RVBK1');
const PREFIX = 'backups/';
const EXCLUDE = new Set(['sessions.json']);

function cfg(env = process.env){
  const c = {
    endpoint: env.BACKUP_S3_ENDPOINT, bucket: env.BACKUP_S3_BUCKET,
    accessKeyId: env.BACKUP_S3_ACCESS_KEY_ID, secretAccessKey: env.BACKUP_S3_SECRET_ACCESS_KEY,
    passphrase: env.BACKUP_ENCRYPTION_KEY, region: env.BACKUP_S3_REGION || 'auto',
    hour: Number.isFinite(+env.BACKUP_HOUR_UTC) && env.BACKUP_HOUR_UTC !== '' && env.BACKUP_HOUR_UTC != null ? +env.BACKUP_HOUR_UTC : 3,
    keep: Math.max(1, parseInt(env.BACKUP_KEEP, 10) || 30)
  };
  c.enabled = !!(c.endpoint && c.bucket && c.accessKeyId && c.secretAccessKey && c.passphrase && c.passphrase.length >= 32);
  return c;
}

function deriveKey(passphrase){ return crypto.scryptSync(passphrase, 'reeve-backup-v1', 32); }

function walk(dir, base = dir, out = {}){
  for (const name of fs.readdirSync(dir)) {
    const full = path.join(dir, name);
    const rel = path.relative(base, full).split(path.sep).join('/');
    const st = fs.statSync(full);
    if (st.isDirectory()) walk(full, base, out);
    else if (!EXCLUDE.has(rel)) out[rel] = fs.readFileSync(full).toString('base64');
  }
  return out;
}

function pack(dataDir, passphrase){
  const payload = JSON.stringify({ version: 1, created: new Date().toISOString(), files: walk(dataDir) });
  const gz = zlib.gzipSync(Buffer.from(payload));
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', deriveKey(passphrase), iv);
  const enc = Buffer.concat([cipher.update(gz), cipher.final()]);
  return Buffer.concat([MAGIC, iv, cipher.getAuthTag(), enc]);
}

function unpack(buf, passphrase){
  if (!buf.subarray(0, MAGIC.length).equals(MAGIC)) throw new Error('Not a Reeve backup file');
  const iv = buf.subarray(5, 17), tag = buf.subarray(17, 33), enc = buf.subarray(33);
  const d = crypto.createDecipheriv('aes-256-gcm', deriveKey(passphrase), iv);
  d.setAuthTag(tag);
  const gz = Buffer.concat([d.update(enc), d.final()]); // throws on wrong key / tampering
  return JSON.parse(zlib.gunzipSync(gz).toString());
}

function restoreTo(snapshot, targetDir){
  fs.mkdirSync(targetDir, { recursive: true });
  if (fs.readdirSync(targetDir).length) throw new Error('Target folder is not empty: ' + targetDir);
  let n = 0;
  for (const [rel, b64] of Object.entries(snapshot.files)) {
    const dest = path.resolve(targetDir, rel);
    if (!dest.startsWith(path.resolve(targetDir) + path.sep)) throw new Error('Unsafe path in backup: ' + rel);
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.writeFileSync(dest, Buffer.from(b64, 'base64'));
    n++;
  }
  return n;
}

function makeClient(c){
  const { S3Client } = require('@aws-sdk/client-s3');
  return new S3Client({ region: c.region, endpoint: c.endpoint, forcePathStyle: true,
    credentials: { accessKeyId: c.accessKeyId, secretAccessKey: c.secretAccessKey } });
}

async function listBackups(client, c){
  const { ListObjectsV2Command } = require('@aws-sdk/client-s3');
  const out = []; let token;
  do {
    const r = await client.send(new ListObjectsV2Command({ Bucket: c.bucket, Prefix: PREFIX, ContinuationToken: token }));
    (r.Contents || []).forEach(o => out.push({ key: o.Key, size: o.Size, modified: o.LastModified }));
    token = r.IsTruncated ? r.NextContinuationToken : undefined;
  } while (token);
  return out.sort((a, b) => String(b.key).localeCompare(String(a.key))); // newest first
}

async function runBackup(dataDir, c = cfg(), client){
  if (!c.enabled) throw new Error('Backups are not configured');
  client = client || makeClient(c);
  const { PutObjectCommand, DeleteObjectsCommand } = require('@aws-sdk/client-s3');
  const buf = pack(dataDir, c.passphrase);
  const key = PREFIX + 'reeve-' + new Date().toISOString().replace(/[:.]/g, '-') + '.bak';
  await client.send(new PutObjectCommand({ Bucket: c.bucket, Key: key, Body: buf, ContentType: 'application/octet-stream' }));
  // prune old backups (never the one we just wrote)
  const all = await listBackups(client, c);
  const old = all.slice(c.keep);
  if (old.length) {
    await client.send(new DeleteObjectsCommand({ Bucket: c.bucket, Delete: { Objects: old.map(o => ({ Key: o.key })) } }));
  }
  return { key, bytes: buf.length, pruned: old.length };
}

const status = { configured: false, lastOk: null, lastError: null };

function startScheduler(dataDir, env = process.env){
  const c = cfg(env);
  status.configured = c.enabled;
  if (!c.enabled) {
    console.log('ℹ️  Offsite backups are OFF (set BACKUP_* variables to enable).');
    return status;
  }
  const client = makeClient(c);
  let running = false;
  async function tick(force){
    if (running) return;
    running = true;
    try {
      const list = await listBackups(client, c);
      const last = list[0] && new Date(list[0].modified).getTime();
      if (last) status.lastOk = status.lastOk || new Date(last).toISOString();
      const now = new Date();
      const dueByAge = !last || (Date.now() - last) > 24 * 3600 * 1000;
      const dueByClock = now.getUTCHours() === c.hour && (!last || (Date.now() - last) > 20 * 3600 * 1000);
      if (force || dueByAge || dueByClock) {
        const r = await runBackup(dataDir, c, client);
        status.lastOk = new Date().toISOString(); status.lastError = null;
        console.log(`💾 Backup uploaded: ${r.key} (${r.bytes} bytes, pruned ${r.pruned})`);
      }
    } catch (e) {
      status.lastError = String(e.message || e).slice(0, 200);
      console.error('❌ Backup failed:', status.lastError);
    } finally { running = false; }
  }
  setTimeout(() => tick(false), 60 * 1000).unref();           // shortly after start
  setInterval(() => tick(false), 60 * 60 * 1000).unref();     // then hourly check
  console.log(`✅ Offsite backups ON → bucket "${c.bucket}", daily at ~${c.hour}:00 UTC, keeping ${c.keep}`);
  return status;
}

module.exports = { cfg, pack, unpack, restoreTo, runBackup, listBackups, startScheduler, status };

// ---- CLI ------------------------------------------------------------
if (require.main === module) {
  require('dotenv').config();
  (async () => {
    const [cmd, a, b] = process.argv.slice(2);
    const dataDir = process.env.DATA_DIR || path.join(__dirname, 'data');
    const c = cfg();
    if (!c.enabled) { console.error('Set the BACKUP_* environment variables first.'); process.exit(1); }
    const client = makeClient(c);
    if (cmd === 'now') {
      console.log(await runBackup(dataDir, c, client));
    } else if (cmd === 'list') {
      (await listBackups(client, c)).forEach(o => console.log(o.key, o.size, new Date(o.modified).toISOString()));
    } else if (cmd === 'restore' && a && b) {
      const { GetObjectCommand } = require('@aws-sdk/client-s3');
      const r = await client.send(new GetObjectCommand({ Bucket: c.bucket, Key: a }));
      const buf = Buffer.from(await r.Body.transformToByteArray());
      console.log('Restored', restoreTo(unpack(buf, c.passphrase), b), 'files into', b);
    } else {
      console.log('Usage: node backup.js now | list | restore <key> <empty-dir>');
    }
  })().catch(e => { console.error(e.message); process.exit(1); });
}
