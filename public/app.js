// ============================================================
// Reeve frontend — powered by Decompliance · AI GRC Intelligence
// ============================================================
const API = ''; // same origin; set to full URL if frontend hosted separately

// ---------- State ----------
const DEFAULT_SECTION_ORDER = ['skills','certifications','languages','projects','accomplishments','courses','summary','experience','education'];
const CRED_KEYS = ['certifications','education']; // print in the header credentials area — grouped at top of the editor

let R = emptyResume();

// ---------- 15 Resume templates ----------
// Structure of the resume is LOCKED (same sections, same order).
// Templates only change the visual skin: colours, border, header layout, fonts.
const TEMPLATES = [
  {id:'exec-navy',   name:'Executive Navy',      main:'#1E3A8A', soft:'#E3E9F8', dark:'#172B63', border:'double',   header:'split',  serif:true },
  {id:'classic-teal',name:'Classic Teal',        main:'#0F766E', soft:'#E6F2F0', dark:'#134E4A', border:'double',   header:'split',  serif:true },
  {id:'modern-indigo',name:'Modern Indigo',      main:'#4338CA', soft:'#EAE8FB', dark:'#312E81', border:'topband',  header:'center', serif:false},
  {id:'minimal-slate',name:'Minimal Slate',      main:'#334155', soft:'#EAEEF3', dark:'#1E293B', border:'hairline', header:'left',   serif:false},
  {id:'bold-burgundy',name:'Bold Burgundy',      main:'#9F1239', soft:'#FBE7EC', dark:'#6E0B26', border:'solid',    header:'split',  serif:true },
  {id:'forest-pro',  name:'Forest Professional', main:'#166534', soft:'#E4F3E9', dark:'#0F4A25', border:'double',   header:'split',  serif:true },
  {id:'violet-edge', name:'Violet Edge',         main:'#6D28D9', soft:'#EFE9FB', dark:'#4C1D95', border:'sideband', header:'left',   serif:false},
  {id:'graphite',    name:'Graphite Mono',       main:'#111827', soft:'#F3F4F6', dark:'#030712', border:'hairline', header:'left',   serif:false},
  {id:'ocean-blue',  name:'Ocean Blue',          main:'#0369A1', soft:'#E0F2FE', dark:'#075985', border:'topband',  header:'split',  serif:false},
  {id:'amber-accent',name:'Amber Accent',        main:'#B45309', soft:'#FBEEDC', dark:'#7C3A06', border:'solid',    header:'split',  serif:true },
  {id:'rose-quartz', name:'Rose Quartz',         main:'#BE185D', soft:'#FCE7F3', dark:'#831843', border:'hairline', header:'center', serif:true },
  {id:'emerald',     name:'Emerald Clean',       main:'#059669', soft:'#D1FAE5', dark:'#065F46', border:'topband',  header:'left',   serif:false},
  {id:'royal-purple',name:'Royal Purple',        main:'#7C3AED', soft:'#F3E8FF', dark:'#5B21B6', border:'double',   header:'center', serif:true },
  {id:'steel-corp',  name:'Steel Corporate',     main:'#475569', soft:'#E2E8F0', dark:'#334155', border:'solid',    header:'split',  serif:false},
  {id:'crimson',     name:'Crimson Impact',      main:'#B91C1C', soft:'#FEE2E2', dark:'#7F1D1D', border:'sideband', header:'left',   serif:false},
  // 5 structural templates — different layouts, not just colours
  {id:'banner-sky',   name:'Banner Sky',          main:'#0284C7', soft:'#E0F2FE', dark:'#075985', border:'none',     header:'split',  serif:false, layout:'banner'},
  {id:'sidebar-slate',name:'Sidebar Slate',       main:'#334155', soft:'#E2E8F0', dark:'#1E293B', border:'hairline', header:'left',   serif:false, layout:'sidebar'},
  {id:'duo-column',   name:'Duo Column',          main:'#0F766E', soft:'#E6F2F0', dark:'#134E4A', border:'solid',    header:'split',  serif:true,  layout:'twocol'},
  {id:'compact-exec', name:'Compact Executive',   main:'#1E3A8A', soft:'#E3E9F8', dark:'#172B63', border:'hairline', header:'split',  serif:false, layout:'compact'},
  {id:'monoline',     name:'Monoline',            main:'#111827', soft:'#F3F4F6', dark:'#030712', border:'mono',     header:'left',   serif:false, layout:'mono'}
];
let selectedTemplate = TEMPLATES[0].id;
const getTemplate = () => TEMPLATES.find(t => t.id === selectedTemplate) || TEMPLATES[0];

function emptyResume(){
  return {
    personal:{name:'',email:'',phone:'',location:'',linkedin:'',website:'',headline:''},
    section_order: DEFAULT_SECTION_ORDER.slice(),
    section_collapsed: {},
    summary:'',
    experience:[], education:[], skills:[],
    certifications:[], languages:[], projects:[], accomplishments:[], courses:[],
    domains:[], extra_sections:[],
    chart_prefs:{timeline:true, domains:true, tenure:false},
    section_prefs:{summary:true, skills:true, certifications:true, languages:true,
      projects:true, accomplishments:true, courses:true, experience:true, education:true}
  };
}

const SECTION_META = [
  {key:'insights', label:'Career Insights'},
  {key:'personal', label:'Personal details', always:true},
  {key:'skills', label:'Skills'},
  {key:'certifications', label:'Certifications'},
  {key:'languages', label:'Languages'},
  {key:'projects', label:'Projects'},
  {key:'accomplishments', label:'Accomplishments'},
  {key:'courses', label:'Courses'},
  {key:'summary', label:'Profile / Summary', always:true},
  {key:'experience', label:'Experience'},
  {key:'education', label:'Education'},
];

// ---------- Helpers ----------
const $ = s => document.querySelector(s);
const el = (tag, attrs={}, html='') => {
  const e = document.createElement(tag);
  Object.entries(attrs).forEach(([k,v]) => k==='class' ? e.className=v : e.setAttribute(k,v));
  if(html) e.innerHTML = html;
  return e;
};
const esc = s => String(s??'').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

function toast(msg, ms=3500){
  const t = $('#toast'); t.textContent = msg; t.style.display='block';
  clearTimeout(t._t); t._t = setTimeout(()=> t.style.display='none', ms);
}

async function api(path, opts={}){
  const res = await fetch(API + path, opts);
  const data = await res.json().catch(()=>({error:'Server returned a non-JSON response'}));
  if(!res.ok || data.error) throw new Error(data.error || `Request failed (${res.status})`);
  return data;
}

// ============================================================
// Upload flow
// ============================================================
const dz = $('#dropzone'), fi = $('#fileInput');
dz.addEventListener('click', ()=> fi.click());
dz.addEventListener('keydown', e=>{ if(e.key==='Enter'||e.key===' ') fi.click(); });
dz.addEventListener('dragover', e=>{ e.preventDefault(); dz.classList.add('drag'); });
dz.addEventListener('dragleave', ()=> dz.classList.remove('drag'));
dz.addEventListener('drop', e=>{
  e.preventDefault(); dz.classList.remove('drag');
  if(e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0]);
});
fi.addEventListener('change', ()=>{ if(fi.files[0]) handleFile(fi.files[0]); });

// ---- Animated progress ----
let _pct = 0, _target = 0, _creep = null;

function setProgress(step, target, statusText){
  $('#progressWrap').style.display = 'block';
  document.querySelectorAll('.pstep').forEach(p=>{
    const s = +p.dataset.step;
    p.classList.toggle('active', s===step);
    p.classList.toggle('done', s<step);
  });
  if(statusText) $('#pstatusText').textContent = statusText;
  $('#pspin').classList.remove('finished');
  $('#pstatus').classList.remove('finished');
  _target = target;
  if(!_creep){
    _creep = setInterval(()=>{
      if(_pct < _target){
        // move quickly at first, then creep as it approaches target — never looks frozen
        _pct = Math.min(_pct + Math.max((_target - _pct) * 0.06, 0.15), _target);
        $('#pbarFill').style.width = _pct.toFixed(1) + '%';
        $('#ppct').textContent = Math.round(_pct) + '%';
      }
    }, 120);
  }
}

function finishProgress(message){
  clearInterval(_creep); _creep = null;
  _pct = 100;
  document.querySelectorAll('.pstep').forEach(p=>{
    p.classList.remove('active'); p.classList.add('done');
  });
  $('#pbarFill').style.width = '100%';
  $('#ppct').textContent = '100%';
  $('#pstatusText').textContent = message || 'Done — resume imported';
  $('#pspin').classList.add('finished');
  $('#pstatus').classList.add('finished');
  // keep the Done state on screen for a while, then tidy it away
  setTimeout(()=>{ $('#progressWrap').style.display = 'none'; }, 6000);
}

function resetProgress(){
  clearInterval(_creep); _creep = null;
  _pct = 0; _target = 0;
  $('#pbarFill').style.width = '0%';
  $('#progressWrap').style.display = 'none';
}

async function handleFile(file){
  const name = String(file.name || '');
  // Reject the legacy .doc format explicitly — mammoth can't read it
  if(/\.doc$/i.test(name)){
    return showUploadError(
      'This file is in the old <b>.doc</b> format, which we can\'t read.',
      'Open your file in Microsoft Word (or Google Docs) and save it as <b>.docx</b>, or export it as a <b>PDF</b>. Then try uploading again.'
    );
  }
  if(!/\.(pdf|docx)$/i.test(name)){
    return showUploadError(
      'Only PDF and .docx files are supported.',
      'Please choose a resume file that ends in <b>.pdf</b> or <b>.docx</b>.'
    );
  }
  // 10 MB limit matches the server — catch it here so we don\'t waste a round-trip
  if(file.size > 10 * 1024 * 1024){
    return showUploadError(
      'This file is too large ('+(file.size/1024/1024).toFixed(1)+' MB).',
      'Please keep resumes under <b>10 MB</b>. If your file is a PDF with lots of images, save a lighter version and try again.'
    );
  }
  try{
    _pct = 0;
    setProgress(0, 10, 'Uploading ' + file.name + '…');
    const fd = new FormData();
    fd.append('resume', file);

    // The server does extraction + AI parsing in one call.
    // Stage the status messages while we wait — AI parsing is the long part.
    const t1 = setTimeout(()=> setProgress(1, 28, 'Extracting text from your file…'), 900);
    const t2 = setTimeout(()=> setProgress(2, 55, 'AI is reading your resume — finding every role and section…'), 2600);
    const t3 = setTimeout(()=> setProgress(2, 80, 'Still parsing — longer resumes take up to a minute…'), 16000);

    const out = await api('/api/parse-resume', { method:'POST', body: fd });
    [t1,t2,t3].forEach(clearTimeout);

    setProgress(3, 96, 'Building your editable form…');
    R = normalize(out.data);
    moveEditorTo('pro');
    buildEditor();
    const msg = `Done — imported ${R.experience.length} role${R.experience.length===1?'':'s'} and ${countSections()} sections ✓`;
    finishProgress(msg);
    toast(msg);
  }catch(err){
    resetProgress();
    // Server sends actionable messages via {error: "..."} JSON — surface them properly
    const raw = String(err.message || '').trim();
    // Common message → nudge pair
    let title = raw, hint = '';
    if(/\.doc format|older \.doc/i.test(raw)){
      title = 'The old .doc format is not supported.';
      hint = 'Open your file in Word and <b>Save As → .docx</b>, or export it as a <b>PDF</b>, then try again.';
    } else if(/does not appear to be a valid \.docx|central directory/i.test(raw)){
      title = 'We couldn\'t read this file.';
      hint = 'It may be the older <b>.doc</b> format, corrupted, or password-protected. Please save it as <b>.docx</b> or export as <b>PDF</b> and try again.';
    } else if(/password-protected/i.test(raw)){
      title = 'This file is password-protected.';
      hint = 'Please remove the password from the file and try again.';
    } else if(/scanned|OCR|image-only/i.test(raw)){
      title = 'This looks like a scanned or image-only PDF.';
      hint = 'Please upload a <b>text-based PDF</b> or a <b>.docx</b> — resumes typed in Word or exported from LinkedIn work best.';
    } else if(/exceptionally detailed|exceeded our AI/i.test(raw)){
      title = 'Your resume was read — but it\'s too detailed to structure in one go.';
      hint = 'Please trim the <b>oldest roles</b> (or split the document) and upload again. Your recent roles keep every bullet — older entries can be added by hand inside the builder.';
    } else if(/unexpected format while structuring/i.test(raw)){
      title = 'One-off AI formatting hiccup.';
      hint = 'Please upload the <b>same file</b> again — the second attempt almost always succeeds.';
    } else if(/scanned or image-only PDF|could not find selectable text/i.test(raw)){
      title = 'This looks like a scanned or image-only PDF.';
      hint = 'Open the PDF and try to <b>highlight a sentence</b>. If you can\'t, run it through a free OCR tool (Adobe\'s free online OCR, or open it in Google Docs) and upload the result — or upload the original <b>.docx</b>.';
    } else if(/AI service is busy|overloaded/i.test(raw)){
      title = 'The AI service is busy right now.';
      hint = 'Please wait a minute and try again — this usually clears quickly.';
    } else if(/timed out|timeout/i.test(raw)){
      title = 'The request timed out.';
      hint = 'Very long resumes can take a while. Please try again, or upload a shorter version.';
    } else if(/too large|10 MB/i.test(raw)){
      title = 'This file is too large.';
      hint = 'Please keep resumes under <b>10 MB</b>.';
    } else if(/rate limit|Too many/i.test(raw)){
      title = 'You\'ve hit our rate limit.';
      hint = 'Please wait a few minutes before uploading again.';
    } else if(/Not signed in|401/i.test(raw)){
      title = 'Your session has expired.';
      hint = 'Please log in again to continue.';
    } else if(!raw || /failed to fetch|network/i.test(raw)){
      title = 'Could not reach the server.';
      hint = 'Check your internet connection and try again.';
    } else if(!hint){
      hint = 'Please try a different format (<b>PDF</b> works best) or a shorter version.';
    }
    showUploadError(title, hint);
  }
}

// Show a proper actionable error card in place of the dropzone, so the message
// doesn\'t disappear like a toast. Includes a Try again button.
function showUploadError(title, hint){
  const host = $('#startArea');
  if(!host) return toast(title + ' ' + hint.replace(/<[^>]+>/g,''), 8000);
  host.classList.remove('hidden');
  host.innerHTML = `<div class="upload-error">
    <div class="upload-error-icon">⚠️</div>
    <h3>${title}</h3>
    <p>${hint}</p>
    <button class="btn btn-primary" type="button" id="uploadTryAgain">Choose a different file</button>
    <div class="upload-error-help">Need help? Email <a href="mailto:hello@decompliance-uk.com">hello@decompliance-uk.com</a></div>
  </div>`;
  $('#uploadTryAgain').addEventListener('click', ()=>{
    // Restore the original dropzone
    host.innerHTML = `<div class="dropzone" id="dropzone" tabindex="0" role="button" aria-label="Upload resume">
      <h2>Upload your resume</h2>
      <p>PDF or DOCX &middot; drag &amp; drop or click to browse</p>
      <p style="margin-top:8px;font-size:12.5px">Every section is detected automatically — including publications, patents, volunteer work and more.</p>
      <input type="file" id="fileInput" accept=".pdf,.docx" hidden>
    </div>`;
    rebindDropzone();
  });
  // scroll it into view in case the page was scrolled
  if(typeof host.scrollIntoView === 'function') host.scrollIntoView({behavior:'smooth', block:'center'});
}

// Rebind dropzone events after we replace the DOM
function rebindDropzone(){
  const dz = $('#dropzone'), fi = $('#fileInput');
  if(!dz || !fi) return;
  dz.addEventListener('click', ()=> fi.click());
  dz.addEventListener('keydown', e=>{ if(e.key==='Enter'||e.key===' ') fi.click(); });
  dz.addEventListener('dragover', e=>{ e.preventDefault(); dz.classList.add('drag'); });
  dz.addEventListener('dragleave', ()=> dz.classList.remove('drag'));
  dz.addEventListener('drop', e=>{
    e.preventDefault(); dz.classList.remove('drag');
    if(e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0]);
  });
  fi.addEventListener('change', ()=>{ if(fi.files[0]) handleFile(fi.files[0]); });
}

function normalize(d){
  const base = emptyResume();
  const out = {...base, ...d};
  out.personal = {...base.personal, ...(d.personal||{})};
  ['experience','education','skills','certifications','languages','projects','accomplishments','courses','domains','extra_sections']
    .forEach(k => { if(!Array.isArray(out[k])) out[k] = []; });
  // Ensure each experience has skills_used array (backend may or may not populate)
  out.experience.forEach(j => { if(!Array.isArray(j.skills_used)) j.skills_used = []; });
  out.chart_prefs = {timeline:true, domains:true, tenure:false, ...(d.chart_prefs||{})};
  out.section_prefs = {summary:true, skills:true, certifications:true, languages:true,
    projects:true, accomplishments:true, courses:true, experience:true, education:true,
    ...(d.section_prefs||{})};
  // section_order: keep only known keys, then append any missing (older saves)
  const known = DEFAULT_SECTION_ORDER;
  const so = Array.isArray(d.section_order) ? d.section_order.filter(k=>known.includes(k)) : [];
  known.forEach(k=>{ if(!so.includes(k)) so.push(k); });
  out.section_order = so;
  out.section_collapsed = (d.section_collapsed && typeof d.section_collapsed === 'object') ? {...d.section_collapsed} : {};
  return out;
}

// ---------- Per-field "Ask AI" helper ----------
async function askField(btn, field, getVal, setVal, context){
  const value = getVal();
  const orig = btn.innerHTML;
  btn.disabled = true; btn.innerHTML = '<span class="spin"></span>';
  try{
    const out = await api('/api/ask-field', {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ field, value, context })
    });
    setVal(out.text);
    toast('Suggestion applied ✦');
  }catch(err){ toast('AI failed: '+err.message, 5000); }
  btn.disabled = false; btn.innerHTML = orig;
}

// Build a label + optional AI button
// label + (optional) standard Ask AI button that opens the popover.
// askSpec = {key, label, read, write}  — nothing is applied without review.
function fieldHead(labelText, askSpec){
  const wrap = el('div',{class:'field-head'});
  wrap.appendChild(el('label',{},labelText));
  if(askSpec){
    const b = el('button',{type:'button',class:'sec-askai',title:'Ask AI about this block'}, '✦ Ask AI');
    b.addEventListener('click', (ev) => { ev.stopPropagation(); toggleAskPop(b, askSpec); });
    wrap.appendChild(b);
  }
  return wrap;
}

function countSections(){
  let n = 2; // personal + summary
  SECTION_META.slice(2).forEach(m => { if(R[m.key] && R[m.key].length) n++; });
  n += R.extra_sections.length;
  return n;
}

// ============================================================
// Fresher flow
// ============================================================
$('#btnFresher').addEventListener('click', async ()=>{
  const field = $('#frField').value.trim();
  if(!field) return toast('Please enter your target field');
  const btn = $('#btnFresher');
  btn.disabled = true; btn.innerHTML = '<span class="spin"></span> Building…';
  try{
    const out = await api('/api/fresher-build', {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({
        name: $('#frName').value.trim(),
        field, education: $('#frEdu').value.trim(), skills: $('#frSkills').value.trim()
      })
    });
    R = normalize(out.data);
    if($('#frName').value.trim()) R.personal.name = $('#frName').value.trim();
    moveEditorTo('fresher');
    buildEditor();
    toast('Starter resume created — fill in your details');
  }catch(err){ toast('Build failed: ' + err.message, 6000); }
  btn.disabled = false; btn.textContent = 'Build my starter resume';
});

// ============================================================
// Editor rendering
// ============================================================
// ============================================================
// Career Insights — three interactive charts
// ============================================================
const nowYear = new Date().getFullYear();

function parseYear(str, fallback){
  if(!str) return fallback;
  if(/present|current|now|till|to date/i.test(str)) return nowYear;
  const m = String(str).match(/\d{4}/);
  return m ? parseInt(m[0]) : fallback;
}

// Build a chronological list of roles (oldest first) with parsed years
function chronoRoles(){
  const roles = R.experience.map(j => ({
    company: j.company||'?', title: j.title||'', desc: j.desc||'',
    skills_used: j.skills_used||[],
    startY: parseYear(j.start, null),
    endY:   parseYear(j.end, nowYear)
  })).filter(r => r.startY);
  roles.sort((a,b)=> a.startY - b.startY);
  return roles;
}

// ============================================================
// Career trend charts — LOCKED v4 design
// Typography: semibold (600) labels in near-black, medium (500)
// secondary text in slate — visible through contrast, not weight.
// ============================================================

// One row per experience entry (company period), oldest first, with live refs
function companyPeriods(){
  const list = R.experience.map(j => ({
    ref: j, name: j.company || '', 
    startY: parseYear(j.start, null),
    endY: parseYear(j.end, nowYear)
  })).filter(c => c.name && c.startY).sort((a,b)=> a.startY - b.startY);
  // merge consecutive periods at the same company (two roles at one employer = one span)
  const merged = [];
  list.forEach(c=>{
    const prev = merged[merged.length-1];
    if(prev && prev.name.trim().toLowerCase() === c.name.trim().toLowerCase() && c.startY <= prev.endY + 1){
      prev.endY = Math.max(prev.endY, c.endY);
    } else merged.push({...c});
  });
  return merged;
}

// ---- Full-width landscape career timeline: dots on a year axis ----
function careerTimelineSVG(t, tips){
  const all = companyPeriods();
  if(!all.length) return '';
  const cs = all.length > 8 ? all.slice(-8) : all;   // most recent 8 if very long career
  const earlier = all.length - cs.length;
  const minY = Math.min(...cs.map(c=>c.startY));
  const maxY = nowYear;
  const span = Math.max(maxY - minY, 1);
  const X0 = 20, X1 = 720, BASE = 64;
  const xFor = y => X0 + ((y - minY)/span) * (X1 - X0);

  let ticks = '';
  const step = span > 20 ? 5 : span > 8 ? 2 : 1;
  for(let y = minY; y <= maxY; y += step){
    const tx = xFor(y);
    if(tx > X1 - 34) continue; // never collide with the fixed end-year label
    ticks += `<line x1="${tx}" y1="61" x2="${tx}" y2="67" stroke="${t.main}" stroke-opacity=".45"/>
      <text x="${tx}" y="83" font-size="9.5" font-weight="500" fill="#64748B" text-anchor="middle">${y}</text>`;
  }
  ticks += `<text x="${X1-10}" y="83" font-size="9.5" font-weight="500" fill="#64748B" text-anchor="middle">${nowYear}</text>`;

  let segs = '';
  cs.forEach((c,i)=>{
    segs += `<line x1="${xFor(c.startY)}" y1="${BASE}" x2="${xFor(c.endY)}" y2="${BASE}"
      stroke="${t.main}" stroke-width="6" stroke-opacity="${(0.22 + 0.55*(i+1)/cs.length).toFixed(2)}"/>`;
  });

  // Short label = FIRST word of the company (two words if the first is tiny),
  // so "Bosch Global Software Technologies" → "Bosch"
  const firstWord = (name)=>{
    const words = name.trim().split(/\s+/);
    let s = words[0] || '';
    if(s.length < 4 && words[1]) s += ' ' + words[1];
    return s.length > 12 ? s.slice(0,11).trimEnd() + '…' : s;
  };

  let dots = '';
  // collision-aware placement: two label levels, greedy pick whichever has room
  const levels = [
    { name: 22, date: 34, lastEnd: -Infinity },   // upper (dashed connector down to the line)
    { name: 45, date: 57, lastEnd: -Infinity }    // lower (sits just above the line)
  ];
  cs.forEach((c,i)=>{
    const x = xFor(c.startY);
    const dur = Math.max(c.endY - c.startY, 1);
    const dates = `${c.startY} – ${c.endY} · ${dur} yr${dur===1?'':'s'}`;
    const shortName = firstWord(c.name);
    const w = Math.max(shortName.length * 6.4, dates.length * 5.1);   // label width estimate

    // clamp at the edges so nothing ever clips out of the chart
    let anchor = 'middle';
    if(x - w/2 < X0 - 6) anchor = 'start';
    else if(x + w/2 > X1 + 6) anchor = 'end';
    const startX = anchor === 'start' ? x : anchor === 'end' ? x - w : x - w/2;
    const endX = startX + w;

    // choose a level with horizontal room; prefer alternating for rhythm
    const pref = i % 2, alt = 1 - pref;
    let lv;
    if(startX > levels[pref].lastEnd + 10) lv = pref;
    else if(startX > levels[alt].lastEnd + 10) lv = alt;
    else lv = levels[pref].lastEnd <= levels[alt].lastEnd ? pref : alt;  // most room
    levels[lv].lastEnd = Math.max(levels[lv].lastEnd, endX);
    const ly = levels[lv].name, ly2 = levels[lv].date;

    const tip = tips ? ` data-tip="${esc(c.name)} · ${dates}" style="cursor:pointer"` : '';
    const hit = tips ? `<rect x="${Math.max(startX-6,0)}" y="10" width="${w+12}" height="76" fill="#fff" fill-opacity="0" pointer-events="all"/>` : '';
    dots += `<g${tip}>
      ${hit}
      <circle cx="${x}" cy="${BASE}" r="6" fill="${t.main}" stroke="#fff" stroke-width="2"/>
      <text x="${x}" y="${ly}" font-size="11" font-weight="600" fill="#1E293B" text-anchor="${anchor}">${esc(shortName)}</text>
      <text x="${x}" y="${ly2}" font-size="9.5" font-weight="500" fill="#64748B" text-anchor="${anchor}">${dates}</text>
      ${lv===0?`<line x1="${x}" y1="${ly2+4}" x2="${x}" y2="${BASE-9}" stroke="${t.main}" stroke-opacity=".45" stroke-dasharray="2 2"/>`:''}
    </g>`;
  });

  const earlierNote = earlier > 0
    ? `<text x="${X0}" y="12" font-size="9" font-weight="500" fill="#94A3B8">+ ${earlier} earlier role${earlier===1?'':'s'} not shown</text>` : '';

  return `<svg viewBox="0 0 740 96" xmlns="http://www.w3.org/2000/svg">
    <line x1="${X0}" y1="${BASE}" x2="${X1}" y2="${BASE}" stroke="${t.main}" stroke-width="2.5"/>
    ${ticks}${segs}${dots}${earlierNote}
  </svg>`;
}

// ---- Domain expertise: hierarchical rows on the same year axis ----
function domainsSVG(t, tips){
  const ds = (R.domains||[]).filter(d => d.name && d.start_year).slice(0,8)
    .sort((a,b)=> a.start_year - b.start_year || (a.end_year||nowYear) - (b.end_year||nowYear));
  if(!ds.length) return '';
  const minY = Math.min(...ds.map(d=>d.start_year));
  const span = Math.max(nowYear - minY, 1);
  const X0 = 230, X1 = 718;
  const xFor = y => X0 + ((y - minY)/span) * (X1 - X0);
  const ROW = 30, TOP = 20;
  const H = TOP + ds.length * ROW + 8;
  const OPAC = ['.85','.62','.48','.72'];

  let grid = '';
  const step = span > 20 ? 5 : span > 8 ? 4 : 2;
  for(let y = minY; y <= nowYear; y += step){
    const gx = xFor(y);
    if(gx > X1 - 32) continue; // never collide with the fixed end-year label
    grid += `<line x1="${gx}" y1="16" x2="${gx}" y2="${H-4}" stroke="${t.soft}"/>
      <text x="${gx}" y="11" font-size="9.5" font-weight="500" fill="#94A3B8" text-anchor="middle">${y}</text>`;
  }
  grid += `<line x1="${X1}" y1="16" x2="${X1}" y2="${H-4}" stroke="${t.soft}"/>
    <text x="${X1-8}" y="11" font-size="9.5" font-weight="500" fill="#94A3B8" text-anchor="middle">${nowYear}</text>`;

  const CHAR_W = 5.2;
  const LBL_MAX = 38; // chars that fit in the 222px label gutter at 10.5px semibold

  // wrap a long name into up to 2 lines at the nearest space
  const wrapName = name => {
    if(name.length <= LBL_MAX) return [name];
    let cut = name.lastIndexOf(' ', LBL_MAX);
    if(cut < 12) cut = LBL_MAX;
    const l2 = name.slice(cut).trim();
    return [name.slice(0,cut).trim(), l2.length > LBL_MAX ? l2.slice(0,LBL_MAX-1)+'…' : l2];
  };

  const rows = ds.map((d,i)=>{
    const y = TOP + i*ROW + 10;
    const endY = (!d.end_year || d.end_year >= nowYear) ? nowYear : d.end_year;
    const x1 = xFor(d.start_year), x2 = Math.max(xFor(endY), x1+14);
    const yrs = Math.max(endY - d.start_year, 1);
    const fullText = d.detail ? `${yrs} yrs · ${d.detail}` : `${yrs} yrs`;
    const roomAfter = X1 - x2, barWidth = x2 - x1;
    // 3-tier placement: after bar → above bar (full) → above bar (years only). Never dropped.
    let ann;
    if(roomAfter > fullText.length * CHAR_W + 12)
      ann = `<text x="${x2+9}" y="${y+3.5}" font-size="9" font-weight="600" fill="${t.dark}">${esc(fullText)}</text>`;
    else if(barWidth > fullText.length * CHAR_W + 8)
      ann = `<text x="${(x1+x2)/2}" y="${y-6.5}" font-size="9" font-weight="600" fill="${t.dark}" text-anchor="middle">${esc(fullText)}</text>`;
    else
      ann = `<text x="${(x1+x2)/2}" y="${y-6.5}" font-size="9" font-weight="600" fill="${t.dark}" text-anchor="middle">${yrs} yrs</text>`;
    const tip = tips ? ` data-tip="${esc(d.name)} · ${d.start_year} – ${(!d.end_year||d.end_year>=nowYear)?'Present':d.end_year} · ${esc(fullText)}" style="cursor:pointer"` : '';
    // label: single line vertically centred, or two lines stacked around the bar's y
    const nameLines = wrapName(d.name);
    const label = nameLines.length === 1
      ? `<text x="222" y="${y+3.5}" font-size="10.5" font-weight="600" fill="#1E293B" text-anchor="end">${esc(nameLines[0])}</text>`
      : `<text x="222" y="${y-2}" font-size="10" font-weight="600" fill="#1E293B" text-anchor="end">${esc(nameLines[0])}</text>
         <text x="222" y="${y+9}" font-size="10" font-weight="600" fill="#1E293B" text-anchor="end">${esc(nameLines[1])}</text>`;
    const hit = tips ? `<rect x="0" y="${y-14}" width="740" height="28" fill="#fff" fill-opacity="0" pointer-events="all"/>` : '';
    return `<g${tip}>
      ${hit}
      ${label}
      <line x1="${x1}" y1="${y}" x2="${x2}" y2="${y}" stroke="${t.main}" stroke-width="5" stroke-opacity="${OPAC[i%OPAC.length]}" stroke-linecap="round"/>
      <circle cx="${x1}" cy="${y}" r="4.5" fill="${t.main}" stroke="#fff" stroke-width="1.5"/>
      <circle cx="${x2}" cy="${y}" r="4.5" fill="${t.main}" stroke="#fff" stroke-width="1.5"/>
      ${ann}
    </g>`;
  }).join('');

  return `<svg viewBox="0 0 740 ${H}" xmlns="http://www.w3.org/2000/svg">${grid}${rows}</svg>`;
}

// ---- Tenure ranking: companies sorted by duration, highest → lowest ----
function tenureRankingSVG(t, tips){
  const roles = companyPeriods().map(r => ({...r, dur: Math.max(r.endY - r.startY, 0.5)}));
  if(!roles.length) return '';
  roles.sort((a,b)=> b.dur - a.dur);
  const shown = roles.slice(0, 8);
  const maxDur = Math.max(...shown.map(r=>r.dur));
  const X0 = 190, X1 = 660, ROW = 28, TOP = 8;
  const H = TOP + shown.length * ROW + 6;
  const rows = shown.map((r,i)=>{
    const y = TOP + i*ROW + 10;
    const wBar = Math.max((r.dur / maxDur) * (X1 - X0), 14);
    const durText = r.dur < 1 ? '<1 yr' : Math.round(r.dur) + ' yrs';
    const shortName = r.name.length > 20 ? r.name.slice(0,19).trimEnd()+'…' : r.name;
    const tip = tips ? ` data-tip="#${i+1} ${esc(r.name)} · ${durText} · ${r.startY} – ${r.endY}" style="cursor:pointer"` : '';
    const hit = tips ? `<rect x="0" y="${y-13}" width="740" height="26" fill="#fff" fill-opacity="0" pointer-events="all"/>` : '';
    return `<g${tip}>
      ${hit}
      <text x="${X0-8}" y="${y+4}" font-size="10" font-weight="600" fill="#1E293B" text-anchor="end">${esc(shortName)}</text>
      <rect x="${X0}" y="${y-6}" width="${wBar}" height="13" rx="6" fill="${t.main}" fill-opacity="${(0.9 - i*0.08).toFixed(2)}"/>
      <text x="${X0+wBar+8}" y="${y+4}" font-size="9" font-weight="600" fill="${t.dark}">${durText}</text>
    </g>`;
  }).join('');
  return `<svg viewBox="0 0 740 ${H}" xmlns="http://www.w3.org/2000/svg">${rows}</svg>`;
}

// ---- Timeline editor save: syncs chart edits back into Work Experience ----
function saveTimelineRows(rows){
  const kept = new Set();
  rows.forEach(r=>{
    if(!r.name || !r.name.trim() || !r.start) return;
    if(r._ref){
      kept.add(r._ref);
      if(r.name.trim() !== r._ref.company) r._ref.company = r.name.trim();
      if(parseYear(r._ref.start, null) !== r.start) r._ref.start = String(r.start);
      const curEnd = parseYear(r._ref.end, nowYear);
      const newEnd = r.end || nowYear;
      if(newEnd !== curEnd) r._ref.end = r.end ? String(r.end) : 'Present';
    } else {
      const j = {title:'', company:r.name.trim(), location:'', start:String(r.start),
        end: r.end ? String(r.end) : 'Present', duration:0, desc:'', skills_used:[]};
      R.experience.push(j); kept.add(j);
    }
  });
  // remove experience entries whose timeline row was deleted (only row-mappable ones)
  R.experience = R.experience.filter(j => kept.has(j) || !(j.company && parseYear(j.start, null)));
  // keep resume order: most recent first
  R.experience.sort((a,b)=> parseYear(b.start,0) - parseYear(a.start,0));
}

function saveDomainRows(rows){
  R.domains = rows
    .filter(r => r.name && r.name.trim() && r.start)
    .slice(0,8)
    .map(r => ({name:r.name.trim(), start_year:r.start, end_year:r.end||null, detail:(r.detail||'').trim()}));
}

// ---- Career Insights card: both charts, each with an inline editor ----
function insightsCard(){
  const t = getTemplate();
  const tl = careerTimelineSVG(t, true);
  const dm = domainsSVG(t, true);
  const tr = tenureRankingSVG(t, true);
  
  // Array of separate insight cards
  const cards = [];
  
  // ---- CAREER INSIGHTS CARD ----
  const cInsights = el('div',{class:'card',id:'sec-insights','data-seckey':'insights'});
  cInsights.innerHTML = `
    <h2 style="position:relative">
      <span class="titlec">Career Insights</span>
      <span class="tools-right">
        <label class="switch ${R.chart_prefs.timeline?'on':''}" title="Display in exported resume">
          <input type="checkbox" data-pref="timeline" ${R.chart_prefs.timeline?'checked':''}>
          <span class="slider"></span>
        </label>
        <button class="chev" type="button">▾</button>
      </span>
    </h2>
    <div class="body">
      <button class="edit-btn" data-ed="tl" type="button" style="margin-bottom:8px">✎ Edit timeline</button>
      <div data-holder="tl">${tl || '<div class="chart-empty">Add work experience with dates to see your timeline.</div>'}</div>
      <div class="ins-editor" data-panel="tl"></div>
    </div>`;
  cards.push(cInsights);
  
  // ---- DOMAIN EXPERTISE CARD ----
  const cDomain = el('div',{class:'card collapsed',id:'sec-domain','data-seckey':'domain'});
  cDomain.innerHTML = `
    <h2 style="position:relative">
      <span class="titlec">Domain Expertise</span>
      <span class="tools-right">
        <label class="switch ${R.chart_prefs.domains?'on':''}" title="Display in exported resume">
          <input type="checkbox" data-pref="domains" ${R.chart_prefs.domains?'checked':''}>
          <span class="slider"></span>
        </label>
        <button class="chev" type="button">▾</button>
      </span>
    </h2>
    <div class="body">
      <button class="edit-btn" data-ed="dm" type="button" style="margin-bottom:8px">✎ Edit domains</button>
      <div data-holder="dm">${dm || '<div class="chart-empty">No domains yet — click ✎ Edit domains to add rows like &ldquo;Risk Management · 2015 – Present&rdquo;.</div>'}</div>
      <div class="ins-editor" data-panel="dm"></div>
    </div>`;
  cards.push(cDomain);
  
  // ---- TENURE RANKING CARD ----
  const cTenure = el('div',{class:'card collapsed',id:'sec-tenure','data-seckey':'tenure'});
  cTenure.innerHTML = `
    <h2 style="position:relative">
      <span class="titlec">Tenure Ranking</span>
      <span class="tools-right">
        <label class="switch ${R.chart_prefs.tenure?'on':''}" title="Display in exported resume">
          <input type="checkbox" data-pref="tenure" ${R.chart_prefs.tenure?'checked':''}>
          <span class="slider"></span>
        </label>
        <button class="chev" type="button">▾</button>
      </span>
    </h2>
    <div class="body">
      <div data-holder="tr">${tr || '<div class="chart-empty">Add work experience with dates to see tenure ranking.</div>'}</div>
    </div>`;
  cards.push(cTenure);
  
  // Wire up toggle switches for all three cards
  cards.forEach(card => {
    card.querySelectorAll('.switch input').forEach(cb=>{
      cb.addEventListener('change', ()=>{
        R.chart_prefs[cb.dataset.pref] = cb.checked;
        cb.closest('.switch').classList.toggle('on');
        toast(cb.checked ? 'Chart will appear in your resume' : 'Chart removed from your resume (still visible here)');
        renderLivePreview();
      });
    });
  });
  
  // Wire up chevron collapse buttons for all three cards
  cards.forEach(card => {
    const chevBtn = card.querySelector('.chev');
    if(chevBtn) {
      chevBtn.addEventListener('click', e => {
        e.stopPropagation();
        card.classList.toggle('collapsed');
      });
    }
    // Title bar click to collapse (except button clicks)
    const h2 = card.querySelector('h2');
    if(h2) {
      h2.addEventListener('click', e => {
        if(!e.target.closest('.chev, .switch')) card.classList.toggle('collapsed');
      });
    }
  });
  
  // ----- Editor wiring -----
  const editors = {
    tl: {
      cols: [['name','Company',''],['start','From','yr'],['end','To (blank = Present)','yr']],
      rows: ()=> companyPeriods().map(p => ({name:p.name, start:p.startY, end:p.endY===nowYear?null:p.endY, _ref:p.ref})),
      blank: ()=> ({name:'', start:null, end:null}),
      max: 0,
      save: rows => { saveTimelineRows(rows); buildEditor(); toast('Timeline saved — Work Experience updated to match'); }
    },
    dm: {
      cols: [['name','Domain name',''],['start','From','yr'],['end','To (blank = Present)','yr'],['detail','Detail (e.g. \"team of 9\")','']],
      rows: ()=> (R.domains||[]).map(d => ({name:d.name, start:d.start_year, end:d.end_year, detail:d.detail||''})),
      blank: ()=> ({name:'', start:null, end:null, detail:''}),
      max: 8,
      save: rows => { saveDomainRows(rows); buildEditor(); toast('Domains saved'); }
    }
  };
  
  cards.forEach(card => {
    card.querySelectorAll('[data-ed]').forEach(btn=>{
      const key = btn.dataset.ed, cfg = editors[key];
      const panel = card.querySelector(`[data-panel="${key}"]`);
      let working = [];

      const renderRows = ()=>{
        const table = el('table');
        table.innerHTML = `<thead><tr>${cfg.cols.map(([,lab])=>`<th>${lab}</th>`).join('')}<th></th></tr></thead>`;
        const tb = el('tbody');
        working.forEach((row,i)=>{
          const tr = el('tr');
          tr.innerHTML = cfg.cols.map(([f,,cls])=>
            `<td><input ${cls?`class="${cls}"`:''} value="${esc(row[f]??'')}" data-i="${i}" data-f="${f}" ${cls==='yr'?'inputmode="numeric" placeholder="'+(f==='end'?'Present':'')+'"':''}></td>`
          ).join('') + `<td><button class="rm" data-rm="${i}" type="button" title="Remove">×</button></td>`;
          tb.appendChild(tr);
        });
        table.appendChild(tb);
        panel.innerHTML = '';
        panel.appendChild(table);
        const actions = el('div',{class:'ed-actions'},
          `<button class="btn btn-ghost" data-act="add" type="button">+ Add</button>
           <button class="btn btn-primary" data-act="save" type="button">Save &amp; redraw</button>`);
        panel.appendChild(actions);
        panel.querySelectorAll('input').forEach(inp=>{
          inp.addEventListener('input', ()=>{
            const row = working[+inp.dataset.i], f = inp.dataset.f;
            row[f] = inp.classList.contains('yr') ? (parseInt(inp.value)||null) : inp.value;
          });
        });
        panel.querySelectorAll('[data-rm]').forEach(b=>
          b.addEventListener('click', ()=>{ working.splice(+b.dataset.rm,1); renderRows(); }));
        actions.querySelector('[data-act="add"]').addEventListener('click', ()=>{
          if(cfg.max && working.length >= cfg.max) return toast('Maximum '+cfg.max+' entries');
          working.push(cfg.blank()); renderRows();
        });
        actions.querySelector('[data-act="save"]').addEventListener('click', ()=> cfg.save(working));
      };

      btn.addEventListener('click', ()=>{
        const opening = !panel.classList.contains('open');
        card.querySelectorAll('.ins-editor').forEach(p=>p.classList.remove('open'));
        if(opening){ working = cfg.rows(); renderRows(); panel.classList.add('open'); }
      });
    });
  });
  
  // Return a container div with all three cards
  const container = el('div');
  cards.forEach(c => container.appendChild(c));
  return container;
}



const SEC_COLOURS = ['#0F766E','#4338CA','#BE185D','#B45309','#166534','#7C3AED','#0E7490','#9F1239','#0284C7'];

// New order: header info → skills-band-ish → projects → summary → experience → education → the rest
const EDITOR_ORDER = ['personal','skills','certifications','languages','projects','accomplishments','courses','summary','experience','education'];




// ---- Quality Score Analysis (Vocabulary, Grammar, Context) ----
function analyzeQualityScore(){
  var errs=[], eid=0, vs=100, gs=100, cs=100;
  var WEAK = {
    'very':{p:3,s:'use "highly" or remove'},'good':{p:5,s:'replace with specific adjective'},
    'bad':{p:5,s:'use "ineffective" or "problematic"'},'stuff':{p:8,s:'replace with specific term'},
    'things':{p:8,s:'be specific about what'},'did':{p:5,s:'use "led", "managed", "spearheaded"'},
    'make':{p:5,s:'use "develop", "create", "build"'},'help':{p:3,s:'use "assisted", "facilitated"'},
    'lot':{p:5,s:'use a specific number or metric'},'many':{p:3,s:'specify the amount'},
    'able to':{p:4,s:'use direct verb form'},'responsible for':{p:2,s:'use active voice (led, managed)'},
    'in charge of':{p:4,s:'use "managed", "directed"'},'good work':{p:6,s:'be specific about achievements'},
    'did various':{p:6,s:'use "Conducted", "Executed"'},'very good at':{p:6,s:'use "advanced" or "expert-level"'},
    'skill set':{p:8,s:'use "skills"'},'skillset':{p:8,s:'use "skills"'}
  };
  var vocabSections = {
    summary:{text:R.summary||'',label:'Profile / Summary'},
    skills:{text:(R.skills||[]).join(', '),label:'Skills'},
    accomplishments:{text:(R.accomplishments||[]).join(' '),label:'Accomplishments'}
  };
  (R.experience||[]).forEach(function(e,i){
    vocabSections['experience_'+i]={text:(e.desc||''),label:'Experience \u2014 '+(e.title||'Job '+(i+1))};
  });
  Object.keys(vocabSections).forEach(function(secKey){
    var info=vocabSections[secKey], sec=secKey.replace(/_\d+$/,'');
    // Longest phrases first so "very good at" wins over "very"/"good"; overlaps are skipped
    var consumed=[];
    var wordsSorted=Object.keys(WEAK).sort(function(a,b){return b.length-a.length;});
    wordsSorted.forEach(function(word){
      var w=WEAK[word], re=new RegExp('\\b'+word.replace(/\s+/g,'\\s+')+'\\b','gi'), m;
      while((m=re.exec(info.text))!==null){
        var s0=m.index, e0=m.index+m[0].length, overlaps=false;
        for(var ci=0;ci<consumed.length;ci++){
          if(s0<consumed[ci][1] && e0>consumed[ci][0]){ overlaps=true; break; }
        }
        if(overlaps) continue;
        consumed.push([s0,e0]);
        errs.push({id:'q'+(eid++),type:'vocab',section:sec,secKey:secKey,
          location:info.label,match:m[0],desc:'"'+m[0]+'" \u2014 '+w.s,fixed:false});
        vs-=3;
      }
    });
  });
  var grammarSections={
    summary:{text:R.summary||'',label:'Profile / Summary'},
    accomplishments:{text:(R.accomplishments||[]).join('\n'),label:'Accomplishments'}
  };
  (R.experience||[]).forEach(function(e,i){
    grammarSections['experience_'+i]={text:e.desc||'',label:'Experience \u2014 '+(e.title||'Job '+(i+1))};
  });
  Object.keys(grammarSections).forEach(function(secKey){
    var info=grammarSections[secKey], sec=secKey.replace(/_\d+$/,'');
    if(/\s{2,}/.test(info.text)){
      var dm=info.text.match(/\S+\s{2,}\S+/);
      errs.push({id:'q'+(eid++),type:'grammar',section:sec,secKey:secKey,
        location:info.label,match:dm?dm[0]:'',desc:'Double space detected \u2014 remove extra space',fixed:false});
      gs-=4;
    }
    if(info.text && !info.text.trim().match(/[.!?]$/)){
      errs.push({id:'q'+(eid++),type:'grammar',section:sec,secKey:secKey,
        location:info.label,match:'',desc:'Missing punctuation at end',fixed:false});
      gs-=3;
    }
  });
  (R.experience||[]).forEach(function(e,i){
    var d=(e.desc||'').toLowerCase();
    if((/\b(was|were|had|managed|led|did)\b/.test(d))&&(/\b(is|are|manage|lead|do)\b/.test(d))){
      errs.push({id:'q'+(eid++),type:'grammar',section:'experience',secKey:'experience_'+i,
        location:'Experience \u2014 '+(e.title||'Job '+(i+1)),match:'',
        desc:'Inconsistent tense \u2014 mixing present and past',fixed:false});
      gs-=4;
    }
  });
  // Context: per-LINE metric detection \u2014 highlights the exact lines that need numbers.
  // Language-neutral: digits, %, currency symbols work in any language.
  (R.experience||[]).forEach(function(e,i){
    var lines=(e.desc||'').split(/\n/);
    var flagged=0;
    lines.forEach(function(line){
      var t=line.trim();
      if(t.length<40) return;               // skip short/heading lines
      if(/[0-9]/.test(t)) return;            // already has a number/metric
      if(flagged>=3) return;                 // cap 3 per job to avoid overload
      errs.push({id:'q'+(eid++),type:'context',section:'experience',secKey:'experience_'+i,
        location:'Experience \u2014 '+(e.title||'Job '+(i+1)),match:'',line:t,
        desc:'This line has no measurable impact \u2014 add numbers (people trained, % reduced, \u00a3/$ saved, audits completed)',fixed:false});
      cs-=4; flagged++;
    });
  });
  (R.experience||[]).forEach(function(e,i){
    var vagueRe=/did various|various things|different tasks|many responsibilities|handled different/gi, vm;
    while((vm=vagueRe.exec(e.desc||''))!==null){
      errs.push({id:'q'+(eid++),type:'context',section:'experience',secKey:'experience_'+i,
        location:'Experience \u2014 '+(e.title||'Job '+(i+1)),match:vm[0],
        desc:'"'+vm[0]+'" is vague \u2014 be specific',fixed:false});
      cs-=5;
    }
  });
  vs=Math.max(30,Math.round(vs)); gs=Math.max(35,Math.round(gs)); cs=Math.max(30,Math.round(cs));
  var overall=Math.round((vs+gs+cs)/3);
  // Per-error reward: fixing ALL errors of a type brings that sub-score to exactly 100
  var typeCounts={vocab:0,grammar:0,context:0};
  errs.forEach(function(e){typeCounts[e.type]++;});
  var typeScores={vocab:vs,grammar:gs,context:cs};
  errs.forEach(function(e){
    e.reward = typeCounts[e.type]>0 ? (100 - typeScores[e.type]) / typeCounts[e.type] : 0;
  });
  var bySection={};
  errs.forEach(function(e){if(!bySection[e.section])bySection[e.section]=[];bySection[e.section].push(e);});
  return {overall:overall,vocabulary:vs,grammar:gs,context:cs,errors:errs,issuesBySection:bySection};
}

function getScoreSeverity(score){
  if(score>=85)return{color:'#10B981',label:'Excellent \xb7 Perfect'};
  if(score>=75)return{color:'#0FA968',label:'Well-written \xb7 Not Excellent'};
  if(score>=55)return{color:'#F59E0B',label:'Good \xb7 Needs Improvements'};
  return{color:'#EF4444',label:'Poor \xb7 Requires Fix'};
}

function markupWithErrors(text,fieldErrors){
  var active=(fieldErrors||[]).filter(function(e){return !e.fixed;});
  if(!active.length) return esc(text);

  var lineErrs=active.filter(function(e){return e.line;});
  var wordErrs=active.filter(function(e){return e.match&&!e.line;})
    .sort(function(a,b){return b.match.length-a.match.length;});

  // Build output line by line so context errors wrap the WHOLE line
  var lines=String(text).split(/\n/);
  var out=lines.map(function(rawLine){
    var trimmed=rawLine.trim();
    var html=esc(rawLine);

    // word-level highlights inside the line
    wordErrs.forEach(function(err){
      var escaped=esc(err.match).replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
      var re=new RegExp('('+escaped+')','i');
      if(re.test(html) && html.indexOf('data-errid="'+err.id+'"')===-1){
        var tip='<span class="err-tip" contenteditable="false"><span class="tip-badge '+err.type+'">'+err.type+'</span> '+esc(err.desc)+'</span>';
        html=html.replace(re,'<span class="err-mark '+err.type+'" data-errid="'+err.id+'">$1'+tip+'</span>');
      }
    });

    // line-level context wrap
    var lineErr=null;
    for(var li=0;li<lineErrs.length;li++){
      if(lineErrs[li].line===trimmed){ lineErr=lineErrs[li]; break; }
    }
    if(lineErr){
      html='<span class="err-line" data-errid="'+lineErr.id+'">'
        +'<span class="err-line-badge" contenteditable="false">Context \u2014 add metrics</span>'
        +html+'</span>';
    }
    return html;
  });
  return out.join('\n');
}

// Extract the user's real text — strips tooltips and badges so they never
// leak into saved resume data or fix-checking
function qFieldText(fieldEl){
  var clone=fieldEl.cloneNode(true);
  clone.querySelectorAll('.err-tip,.err-line-badge').forEach(function(d){d.remove();});
  return clone.textContent||'';
}

function qualityField(text,fieldErrors,onInput){
  var wrapper=el('div',{class:'q-field-wrap'});
  var div=el('div',{class:'q-editable',contenteditable:'true'});
  div.innerHTML=markupWithErrors(text,fieldErrors);
  div._qErrors=fieldErrors;
  div._qOrigLen=(text||'').trim().length;
  div.addEventListener('input',function(){
    var plain=qFieldText(div);
    if(onInput)onInput(plain);
    clearTimeout(div._scanTimer);
    div._scanTimer=setTimeout(function(){scanFieldForFixes(div);},1500);
  });
  wrapper.appendChild(div);

  // Show hint badges below field for ALL errors (including ones without match text)
  var hintsDiv=el('div',{class:'q-hints'});
  var colors={vocab:'#10B981',grammar:'#F59E0B',context:'#6366F1'};
  var labels={vocab:'Vocabulary',grammar:'Grammar',context:'Context'};
  fieldErrors.forEach(function(err){
    if(err.fixed)return;
    var hint=el('div',{class:'q-hint','data-hintid':err.id});
    hint.innerHTML='<span class="q-hint-dot" style="background:'+colors[err.type]+'"></span>'
      +'<span class="q-hint-label" style="color:'+colors[err.type]+'">'+labels[err.type]+'</span> '
      +'<span class="q-hint-text">'+esc(err.desc)+'</span>';
    // Fix by AI button — targets the flagged line/word, or the whole field for
    // rule-based errors (tense, punctuation) that have no specific text
    var btn=el('button',{class:'fix-ai-btn',type:'button'},'\u2726 Fix by AI');
    btn.addEventListener('click',function(){ fixByAI(err, div, hint, btn); });
    hint.appendChild(btn);
    hintsDiv.appendChild(hint);
  });
  if(hintsDiv.children.length>0) wrapper.appendChild(hintsDiv);

  return wrapper;
}

// ---- Fix by AI: request fix, show review box, apply on accept ----
function fixByAI(err, fieldEl, hintEl, btn){
  var wholeField = !(err.line || err.match);
  var target = err.line || err.match || qFieldText(fieldEl).trim();
  if(!target) return;
  btn.disabled = true;
  btn.classList.add('loading');
  btn.textContent = '\u2726 Fixing\u2026';

  fetch('/api/quality-fix', {
    method:'POST',
    headers:{'Content-Type':'application/json'},
    body: JSON.stringify({ text: target, errorType: err.type, errorDesc: err.desc })
  })
  .then(function(r){ return r.json(); })
  .then(function(data){
    btn.classList.remove('loading');
    if(!data.success || !data.text){ throw new Error(data.error || 'No suggestion'); }
    btn.style.display='none';
    showAIPreview(err, fieldEl, hintEl, btn, target, data.text);
  })
  .catch(function(e){
    btn.disabled=false;
    btn.classList.remove('loading');
    btn.textContent='\u2726 Retry';
    console.error('quality-fix failed:', e);
  });
}

function showAIPreview(err, fieldEl, hintEl, btn, original, suggestion){
  // Remove any previous preview for this hint
  var old=hintEl.nextElementSibling;
  if(old && old.classList.contains('ai-preview')) old.remove();

  var box=el('div',{class:'ai-preview'});
  box.innerHTML='<div class="ai-preview-label">\u2726 AI suggested fix \u2014 review and edit before applying'
      +'<span class="ai-edit-pill">editable</span></div>'
    +'<textarea class="ai-preview-ta" spellcheck="true"></textarea>'
    +'<div class="ai-preview-meta">'
      +'<span class="ai-ph"></span>'
      +'<span class="ai-dirty"></span>'
      +'<span class="ai-toggle-orig">show original</span>'
    +'</div>'
    +'<div class="ai-orig"></div>'
    +'<div class="ai-preview-actions">'
      +'<button class="btn-accept" type="button">\u2713 Accept &amp; apply</button>'
      +'<button class="btn-revert" type="button" disabled>\u21BA Revert to AI version</button>'
      +'<button class="btn-reject" type="button">\u2715 Dismiss</button>'
    +'</div>';
  hintEl.insertAdjacentElement('afterend', box);

  var ta      = box.querySelector('.ai-preview-ta');
  var phEl    = box.querySelector('.ai-ph');
  var dirtyEl = box.querySelector('.ai-dirty');
  var revBtn  = box.querySelector('.btn-revert');
  var origEl  = box.querySelector('.ai-orig');
  var togEl   = box.querySelector('.ai-toggle-orig');

  origEl.innerHTML = '<b>Original:</b> ' + esc(original);
  ta.value = suggestion;

  // Whole-field grammar rewrites can be long \u2014 cap height and scroll inside
  function autosize(){
    ta.style.height='auto';
    var h=ta.scrollHeight+2;
    if(h>260){ ta.style.height='260px'; ta.style.overflowY='auto'; }
    else { ta.style.height=h+'px'; ta.style.overflowY='hidden'; }
  }

  var hadPlaceholders = /\[[A-Za-z]\]/.test(suggestion);
  function updateMeta(){
    var val=ta.value;
    var ph=val.match(/\[[A-Za-z]\]/g)||[];
    if(ph.length){
      phEl.className='ai-ph warn';
      phEl.textContent='\u26A0 '+ph.length+' placeholder'+(ph.length>1?'s':'')+' to fill: '+ph.join(' ');
    } else if(hadPlaceholders){
      phEl.className='ai-ph ok';
      phEl.textContent='\u2713 all placeholders filled';
    } else { phEl.className='ai-ph'; phEl.textContent=''; }
    var dirty = val !== suggestion;
    dirtyEl.textContent = dirty ? 'edited by you' : '';
    revBtn.disabled = !dirty;
  }

  autosize(); updateMeta();
  ta.addEventListener('input', function(){ autosize(); updateMeta(); });
  setTimeout(function(){ ta.focus(); ta.setSelectionRange(ta.value.length, ta.value.length); }, 30);

  togEl.addEventListener('click', function(){
    var shown = origEl.classList.toggle('show');
    togEl.textContent = shown ? 'hide original' : 'show original';
  });

  revBtn.addEventListener('click', function(){
    ta.value = suggestion; autosize(); updateMeta(); ta.focus();
  });

  box.querySelector('.btn-accept').addEventListener('click',function(){
    var text=(ta.value||'').trim();
    if(!text){ ta.style.borderColor='#DC2626'; ta.focus(); return; }
    var ph=text.match(/\[[A-Za-z]\]/g)||[];
    if(ph.length && !confirm('This still contains '+ph.length+' unfilled placeholder'
        +(ph.length>1?'s':'')+' ('+ph.join(' ')+').\n\nApply anyway? The line stays flagged until you replace them with real numbers.')) return;

    var edited = text !== suggestion;
    var stillFlagged = (err.type==='context' && ph.length>0);
    applyAIFix(err, fieldEl, original, text);   // apply what is IN THE BOX
    box.remove();

    if(stillFlagged){
      // Text improved but the metric is still a placeholder \u2014 say so plainly
      hintEl.querySelector('.q-hint-text').textContent =
        'Text rewritten \u2014 now replace '+ph.join(' ')+' with your real numbers to clear this';
      btn.style.display='inline-flex';
      btn.disabled=false;
      btn.textContent='\u2726 Fix by AI';
    } else {
      hintEl.classList.add('q-hint-done');
      hintEl.appendChild(el('span',{class:'q-hint-fixed-tag'},
        edited ? '\u2713 Applied (your edit)' : '\u2713 Fixed by AI'));
    }
  });

  box.querySelector('.btn-reject').addEventListener('click',function(){
    box.remove();
    btn.style.display='inline-flex';
    btn.disabled=false;
    btn.textContent='\u2726 Fix by AI';
  });
}

function applyAIFix(err, fieldEl, original, suggestion){
  // 1. Replace the text in the editable field
  if(err.line){
    // Line error: replace the wrapped line element
    var lineSpan=fieldEl.querySelector('[data-errid="'+err.id+'"]');
    if(lineSpan){
      lineSpan.querySelectorAll('.err-line-badge,.err-tip').forEach(function(d){d.remove();});
      lineSpan.replaceWith(document.createTextNode(suggestion));
    } else {
      replacePlainText(fieldEl, original, suggestion);
    }
  } else if(err.match){
    var wordSpan=fieldEl.querySelector('[data-errid="'+err.id+'"]');
    if(wordSpan){
      wordSpan.querySelectorAll('.err-tip').forEach(function(d){d.remove();});
      wordSpan.replaceWith(document.createTextNode(suggestion));
    } else {
      replacePlainText(fieldEl, original, suggestion);
    }
  } else {
    // Rule-based error (tense/punctuation): AI rewrote the WHOLE field.
    // Replace all content, re-render highlights for the remaining unfixed errors.
    var remaining=(fieldEl._qErrors||[]).filter(function(e){return !e.fixed && e!==err;});
    fieldEl.innerHTML=markupWithErrors(suggestion, remaining);
    fieldEl._qOrigLen=suggestion.trim().length;
  }
  // 2. Sync data model via the field's input pipeline
  fieldEl.dispatchEvent(new Event('input', {bubbles:true}));

  // 3. A context fix that still carries [X] placeholders is NOT a real fix \u2014
  //    the line has no measurable impact until a real number replaces the bracket.
  //    Keep it flagged and do not move the score.
  if(err.type==='context' && /\[[A-Za-z]\]/.test(suggestion)){
    err.line = suggestion.trim();          // re-target the error at the new text
    fieldEl.innerHTML = markupWithErrors(qFieldText(fieldEl),
      (fieldEl._qErrors||[]).filter(function(e){return !e.fixed;}));
    fieldEl._qOrigLen = qFieldText(fieldEl).trim().length;
    return;
  }

  // 4. Score up + UI refresh (markErrorFixed handles dashboard, rail, toast)
  markErrorFixed(err, fieldEl);
}

function replacePlainText(fieldEl, original, suggestion){
  var walker=document.createTreeWalker(fieldEl, NodeFilter.SHOW_TEXT);
  var node;
  while((node=walker.nextNode())){
    var idx=node.textContent.indexOf(original);
    if(idx>=0){
      node.textContent=node.textContent.substring(0,idx)+suggestion+node.textContent.substring(idx+original.length);
      return;
    }
  }
}

// Scan full field text with STRICT validation:
// - phrase must be GONE
// - user must have TYPED A REPLACEMENT (field length >= origLen - phraseLen + 3)
//   so backspace/delete alone NEVER changes the score
// - rule-based errors (punct/tense/metrics) check the actual condition
function scanFieldForFixes(fieldEl){
  var qs=R.quality_score; if(!qs)return;
  var text=qFieldText(fieldEl).trim();
  var lower=text.toLowerCase();
  var origLen=fieldEl._qOrigLen||0;

  var fieldErrors=fieldEl._qErrors;
  if(!fieldErrors)return;

  fieldErrors.forEach(function(err){
    if(err.fixed)return;

    // Rule-based errors (no match text)
    if(!err.match){
      // Tense mixing check
      if(err.type==='grammar' && err.desc && err.desc.toLowerCase().indexOf('tense')>=0){
        var hasPast=/\b(was|were|had|managed|led|did)\b/.test(lower);
        var hasPresent=/\b(is|are|manage|lead|do)\b/.test(lower);
        if(!(hasPast && hasPresent)) markErrorFixed(err,fieldEl);
        return;
      }
      // Missing punctuation check
      if(err.type==='grammar'){
        if(/[.!?]$/.test(lower)) markErrorFixed(err,fieldEl);
        return;
      }
      // Context LINE errors: fixed when a matching line now contains a number.
      // Match = current line shares >=40% of the original line's words (unicode-safe).
      if(err.type==='context' && err.line){
        var origWords=err.line.toLowerCase().split(/\s+/).filter(function(w){return w.length>3;});
        var curLines=text.split(/\n/);
        for(var ci=0;ci<curLines.length;ci++){
          var cl=curLines[ci].trim(); if(cl.length<20) continue;
          if(!/[0-9]/.test(cl)) continue;          // must now contain a number
          var clLower=cl.toLowerCase(), hits=0;
          for(var wi=0;wi<origWords.length;wi++){
            if(clLower.indexOf(origWords[wi])>=0) hits++;
          }
          if(origWords.length>0 && hits/origWords.length>=0.4){
            markErrorFixed(err,fieldEl);
            break;
          }
        }
        return;
      }
      // Context field-level: metrics anywhere in field
      if(err.type==='context'){
        var hasMetrics=/[0-9]/.test(text);
        if(hasMetrics) markErrorFixed(err,fieldEl);
        return;
      }
      return;
    }

    // Word/phrase errors — STRICT validation
    var wordLower=err.match.toLowerCase();
    var gone = lower.indexOf(wordLower)===-1;
    if(!gone) return; // phrase still present

    // KEY: user must have typed replacement, not just deleted.
    // minimum expected length = original - removed phrase + 3 chars new text
    var minLen = origLen - wordLower.length + 3;
    if(text.length < minLen) return; // deletion only — NO score change

    markErrorFixed(err,fieldEl);
  });
}

function markErrorFixed(err,fieldEl){
  var qs=R.quality_score;
  err.fixed=true;
  var scoreKey=err.type==='vocab'?'vocabulary':err.type==='grammar'?'grammar':'context';
  // Use per-error reward so fixing ALL errors reaches exactly 100%
  var reward = err.reward || 4;
  qs[scoreKey]=Math.min(100, qs[scoreKey]+reward);
  // If no unfixed errors of this type remain, snap to exactly 100
  var remaining=qs.errors.filter(function(e){return !e.fixed && e.type===err.type;}).length;
  if(remaining===0) qs[scoreKey]=100;
  qs[scoreKey]=Math.round(qs[scoreKey]);
  qs.overall=Math.round((qs.vocabulary+qs.grammar+qs.context)/3);
  // Clean up highlight span if it still exists in DOM
  if(fieldEl){
    var span=fieldEl.querySelector('[data-errid="'+err.id+'"]');
    if(span){
      // remove non-content decorations first so their text never leaks into the resume
      span.querySelectorAll('.err-tip,.err-line-badge').forEach(function(d){d.remove();});
      span.replaceWith(document.createTextNode(span.textContent||''));
    }
  }
  // Strike through the hint badge (skip if already marked, e.g. by AI accept flow)
  var hintEl=document.querySelector('[data-hintid="'+err.id+'"]');
  if(hintEl && !hintEl.classList.contains('q-hint-done')){
    hintEl.classList.add('q-hint-done');
    var doneTag=document.createElement('span');
    doneTag.textContent=' \u2714';
    hintEl.appendChild(doneTag);
  }
  refreshQualityDashboard(); renderRail(); showFixToast();
}

function refreshQualityDashboard(){
  var qs=R.quality_score; if(!qs)return;
  var sev=getScoreSeverity(qs.overall), deg=qs.overall*3.6;
  var se=document.getElementById('qdash-score');
  if(se){se.textContent=qs.overall+'%';se.style.color=sev.color;se.classList.remove('qdash-flash');void se.offsetWidth;se.classList.add('qdash-flash');}
  var le=document.getElementById('qdash-label');if(le){le.textContent=sev.label;le.style.color=sev.color;}
  var re=document.getElementById('qdash-ring');if(re)re.style.background='conic-gradient('+sev.color+' 0deg,'+sev.color+' '+deg+'deg,#E5E7EB '+deg+'deg)';
  var ri=document.getElementById('qdash-ring-inner');if(ri){ri.textContent=qs.overall+'%';ri.style.color=sev.color;}
  var ve=document.getElementById('qdash-vocab');if(ve)ve.textContent=qs.vocabulary+'%';
  var ge=document.getElementById('qdash-grammar');if(ge)ge.textContent=qs.grammar+'%';
  var ce=document.getElementById('qdash-context');if(ce)ce.textContent=qs.context+'%';
  var uf=qs.errors.filter(function(e){return !e.fixed;});
  var vc=uf.filter(function(e){return e.type==='vocab';}).length;
  var gc=uf.filter(function(e){return e.type==='grammar';}).length;
  var cc=uf.filter(function(e){return e.type==='context';}).length;
  var vd=document.getElementById('qdash-vocab-detail');if(vd)vd.textContent=vc+' issue'+(vc!==1?'s':'')+' remaining';
  var gd=document.getElementById('qdash-grammar-detail');if(gd)gd.textContent=gc+' issue'+(gc!==1?'s':'')+' remaining';
  var cd=document.getElementById('qdash-context-detail');if(cd)cd.textContent=cc+' issue'+(cc!==1?'s':'')+' remaining';
}

var _fixToastTimer;
function showFixToast(){
  var qs=R.quality_score;if(!qs)return;
  var t=document.getElementById('fixToast');if(!t)return;
  document.getElementById('fixToastScore').textContent=qs.overall+'%';
  t.classList.add('show');
  clearTimeout(_fixToastTimer);
  _fixToastTimer=setTimeout(function(){t.classList.remove('show');},2500);
}

function getFieldErrors(secKey){
  if(!R.quality_score)return[];
  return R.quality_score.errors.filter(function(e){return e.secKey===secKey&&!e.fixed;});
}



function buildEditor(){
  $('#startArea').classList.add('hidden');
  $('#fresherStart').classList.add('hidden');
  $('#editorWrap').classList.remove('hidden');
  showAIBuilder();
  const ed = $('#editor');
  ed.classList.remove('hidden');
  ed.innerHTML = '';
  
  // Calculate quality score for this resume
  R.quality_score = analyzeQualityScore();

  // Quality score dashboard at the very top
  const qs = R.quality_score;
  const severity = getScoreSeverity(qs.overall);
  const deg = qs.overall * 3.6;
  const unfixed = qs.errors.filter(function(e){return !e.fixed;});
  const vc = unfixed.filter(function(e){return e.type==='vocab';}).length;
  const gc = unfixed.filter(function(e){return e.type==='grammar';}).length;
  const cc = unfixed.filter(function(e){return e.type==='context';}).length;
  const qCard = el('div', {class: 'card quality-card', id: 'sec-quality'});
  qCard.innerHTML = '<div class="qdash-row">'
    + '<div class="qdash-score-wrap">'
    + '<div class="qdash-ring" id="qdash-ring" style="background:conic-gradient('+severity.color+' 0deg,'+severity.color+' '+deg+'deg,#E5E7EB '+deg+'deg)">'
    + '<div class="qdash-ring-inner" id="qdash-ring-inner" style="color:'+severity.color+'">'+qs.overall+'%</div></div>'
    + '<div class="qdash-info">'
    + '<div class="qdash-title">Quality Score</div>'
    + '<div class="qdash-score" id="qdash-score" style="color:'+severity.color+'">'+qs.overall+'%</div>'
    + '<div class="qdash-label" id="qdash-label" style="color:'+severity.color+'">'+severity.label+'</div>'
    + '</div></div>'
    + '<div class="qdash-subs">'
    + '<div class="qsub qsub-vocab"><div class="qsub-label">Vocabulary</div>'
    + '<div class="qsub-val" id="qdash-vocab">'+qs.vocabulary+'%</div>'
    + '<div class="qsub-detail" id="qdash-vocab-detail">'+vc+' issue'+(vc!==1?'s':'')+' remaining</div></div>'
    + '<div class="qsub qsub-grammar"><div class="qsub-label">Grammar</div>'
    + '<div class="qsub-val" id="qdash-grammar">'+qs.grammar+'%</div>'
    + '<div class="qsub-detail" id="qdash-grammar-detail">'+gc+' issue'+(gc!==1?'s':'')+' remaining</div></div>'
    + '<div class="qsub qsub-context"><div class="qsub-label">Context</div>'
    + '<div class="qsub-val" id="qdash-context">'+qs.context+'%</div>'
    + '<div class="qsub-detail" id="qdash-context-detail">'+cc+' issue'+(cc!==1?'s':'')+' remaining</div></div>'
    + '</div></div>';
  ed.appendChild(qCard);

  // AI Builder bar sits directly below the quality dashboard
  var aiBar = document.getElementById('aiBuilderBar');
  if(aiBar){ ed.appendChild(aiBar); aiBar.classList.remove('hidden'); }

  // Career insights (only if we have experience)
  if(R.experience.length) ed.appendChild(insightsCard());

  // Always show every section — grouped: personal (pinned) → header credentials → resume body
  if(!Array.isArray(R.section_order) || !R.section_order.length) R.section_order = DEFAULT_SECTION_ORDER.slice();
  const pCard = personalCard();
  pCard.setAttribute('data-seckey', 'personal');
  ed.appendChild(pCard);

  const makeCard = (key) => {
    let card;
    if(key === 'summary') card = summaryCard();
    else if(key === 'skills') card = skillsCard();
    else if(key === 'languages') card = simpleListCard('languages','Languages');
    else if(key === 'accomplishments') card = linesCard('accomplishments','Accomplishments','e.g. Reduced audit findings by 40% year-on-year');
    else card = listCard(key);
    card.setAttribute('data-seckey', key);
    return card;
  };
  const credKeys = R.section_order.filter(k => CRED_KEYS.includes(k));
  const bodyKeys = R.section_order.filter(k => !CRED_KEYS.includes(k));
  ed.appendChild(el('div',{class:'sec-grpcap'},'Header credentials <span class="gtag">print under your name</span>'));
  credKeys.forEach(k => ed.appendChild(makeCard(k)));
  ed.appendChild(el('div',{class:'sec-grpcap'},'Resume body <span class="gtag">drag to arrange print order</span>'));
  bodyKeys.forEach(k => ed.appendChild(makeCard(k)));
  R.extra_sections.forEach((sec,i)=> ed.appendChild(extraCard(sec,i)));

  // paint each card with its own accent colour
  ed.querySelectorAll('.card').forEach((c,i)=>
    c.style.setProperty('--sec', SEC_COLOURS[i % SEC_COLOURS.length]));

  // start collapsed per persisted state (default: collapsed for a calm workspace)
  if(!R.section_collapsed || typeof R.section_collapsed !== 'object') R.section_collapsed = {};
  ed.querySelectorAll('.card[data-seckey]').forEach(c=>{
    const k = c.dataset.seckey;
    if(!(k in R.section_collapsed)) R.section_collapsed[k] = true; // default collapsed
    if(R.section_collapsed[k]) c.classList.add('collapsed');
  });

  // ---- restructure every section header into: [left tools][centred title][right tools] ----
  const TOGGLABLE = new Set(['summary','skills','certifications','languages','projects','accomplishments','courses','experience','education']);
  const order = R.section_order || [];
  const groupOf = k => CRED_KEYS.includes(k) ? 'cred' : 'body';
  const groupKeys = k => order.filter(x => groupOf(x) === groupOf(k));
  ed.querySelectorAll('.card[data-seckey]').forEach(card=>{
    const key = card.dataset.seckey;
    const pinned = (key === 'personal');
    const h2 = card.querySelector('h2');
    if(!h2) return;

    // wrap all existing children (title text, +Add button, etc.) into a centred title zone
    const titleZone = el('span',{class:'sec-title-zone'});
    while(h2.firstChild) titleZone.appendChild(h2.firstChild);

    // LEFT: grip + arrows (pinned card gets an invisible spacer so the title stays centred)
    const left = el('span',{class:'sec-tools-left'});
    if(pinned){
      left.innerHTML = `<span class="sec-grip ghost">⣿</span>`;
    } else {
      left.innerHTML = `<span class="sec-grip" draggable="true" title="Drag to rearrange sections">⣿</span>`+
        `<button class="sec-arrow" type="button" data-dir="-1" title="Move section up">▲</button>`+
        `<button class="sec-arrow" type="button" data-dir="1" title="Move section down">▼</button>`;
    }


    // RIGHT: In-resume switch + chevron
    const right = el('span',{class:'sec-tools-right'});
    if(!pinned && TOGGLABLE.has(key)){
      const sw = el('label',{class:'switch sec-switch',title:'Show or hide this section in your exported resume'});
      sw.innerHTML = `<input type="checkbox" data-sec="${key}" ${R.section_prefs[key]!==false?'checked':''}><span class="slider"></span><span class="sw-lbl">In resume</span>`;
      right.appendChild(sw);
      sw.querySelector('input').addEventListener('change', e=>{
        R.section_prefs[key] = e.target.checked;
        toast(e.target.checked ? 'Section will appear in your resume' : 'Section hidden from your resume (still editable here)');
        renderLivePreview();
      });
    }
    // Ask AI — opens a popover pinned to this button, scoped to this section
    if(ASKABLE.has(key)){
      const askBtn = el('button',{class:'sec-askai',type:'button',
        title:'Ask AI to change this section'},'\u2726 Ask AI');
      askBtn.addEventListener('click', function(ev){
        ev.stopPropagation();
        toggleAskPop(askBtn, key, card);
      });
      right.appendChild(askBtn);
    }

    right.appendChild(el('span',{class:'sec-clickhint'},'click bar to expand'));

    const chev = el('button',{class:'sec-chev',type:'button',title:'Expand / collapse this section'},'▾');
    right.appendChild(chev);

    // reassemble
    h2.appendChild(left);
    h2.appendChild(titleZone);
    h2.appendChild(right);

    // collapse behaviour: clicking the header (outside tools) toggles; chevron does the same
    const toggleCollapse = ()=>{
      const wasCollapsed = card.classList.contains('collapsed');
      card.classList.toggle('collapsed', !wasCollapsed);
      R.section_collapsed[key] = !wasCollapsed;
      const hint = h2.querySelector('.sec-clickhint');
      if(hint) hint.textContent = wasCollapsed ? 'click bar to collapse' : 'click bar to expand';
    };
    // The whole bar is the button. Only real controls opt out — excluding the
    // tool CONTAINERS made most of the bar dead space.
    h2.style.cursor = 'pointer';
    h2.classList.add('sec-clickable');
    h2.addEventListener('click', e=>{
      if(e.target.closest('button:not(.sec-chev), label, input, select, textarea, .switch, .sec-grip, .drag-handle, a')) return;
      toggleCollapse();
    });
    chev.addEventListener('click', e=>{ e.stopPropagation(); toggleCollapse(); });

    // arrows — move within THIS group only (swap with same-group neighbour)
    if(!pinned) left.querySelectorAll('.sec-arrow').forEach(b=> b.addEventListener('click', e=>{
      e.stopPropagation();
      const gk = groupKeys(key);
      const gi = gk.indexOf(key), gj = gi + (+b.dataset.dir);
      if(gj < 0 || gj >= gk.length) return;
      const a = order.indexOf(key), bIdx = order.indexOf(gk[gj]);
      order[a] = gk[gj]; order[bIdx] = key;   // swap positions in the master order
      buildEditor(); flashPreviewSection(key);
      const nc = $('#editor .card[data-seckey="'+key+'"]'); if(nc && typeof nc.scrollIntoView === 'function') nc.scrollIntoView({block:'nearest'});
    }));
    // disable arrows at the edges of the group
    if(!pinned){
      const gk = groupKeys(key), gi = gk.indexOf(key);
      if(gi === 0) left.querySelector('.sec-arrow[data-dir="-1"]').disabled = true;
      if(gi === gk.length - 1) left.querySelector('.sec-arrow[data-dir="1"]').disabled = true;
    }
    if(pinned) return; // pinned card: chevron + collapse only — no drag
    const grip = left.querySelector('.sec-grip');
    grip.addEventListener('dragstart', e=>{
      _secDrag = key; card.classList.add('dragging');
      e.dataTransfer.effectAllowed = 'move';
      try{ e.dataTransfer.setDragImage(card, 24, 20); }catch(_){/* jsdom */}
    });
    grip.addEventListener('dragend', ()=>{ _secDrag = null; ed.querySelectorAll('.card').forEach(c=>c.classList.remove('dragging','dropbefore','dropafter')); });
    card.addEventListener('dragover', e=>{
      if(!_secDrag || _secDrag === key || groupOf(_secDrag) !== groupOf(key)) return;
      e.preventDefault();
      const r = card.getBoundingClientRect(), before = (e.clientY - r.top) < r.height/2;
      card.classList.toggle('dropbefore', before);
      card.classList.toggle('dropafter', !before);
    });
    card.addEventListener('dragleave', ()=> card.classList.remove('dropbefore','dropafter'));
    card.addEventListener('drop', e=>{
      if(!_secDrag || _secDrag === key || groupOf(_secDrag) !== groupOf(key)) return;
      e.preventDefault();
      const r = card.getBoundingClientRect(), before = (e.clientY - r.top) < r.height/2;
      const moved = _secDrag; _secDrag = null;
      reorderSection(moved, key, before);
    });
  });

  renderRail();
  renderAddPanel();
  $('#addSectionCard').classList.remove('hidden');
  if(typeof renderLivePreview === 'function') renderLivePreview();
}

// ---- shared reorder logic: used by drag-drop AND arrows ----
let _secDrag = null;
function reorderSection(fromKey, toKey, before){
  const credA = CRED_KEYS.includes(fromKey), credB = CRED_KEYS.includes(toKey);
  if(credA !== credB) return; // sections cannot cross between credential and body groups
  const so = R.section_order;
  const fi = so.indexOf(fromKey); if(fi < 0) return;
  so.splice(fi,1);
  let ti = so.indexOf(toKey); if(ti < 0){ so.splice(fi,0,fromKey); return; }
  if(!before) ti++;
  so.splice(ti,0,fromKey);
  buildEditor();
  flashPreviewSection(fromKey);
}

// gold flash on the moved section inside the live preview
const PREVIEW_HEADINGS = {skills:'Key Skills', summary:'Areas of Practice', accomplishments:'Accomplishments',
  courses:'Courses', projects:'Projects', experience:'Work Experience'};
function flashPreviewSection(key){
  const head = PREVIEW_HEADINGS[key]; if(!head) return;
  const pane = document.querySelector('.view.on [data-livepane]') || document.querySelector('[data-livepane]');
  if(!pane) return;
  const h2 = [...pane.querySelectorAll('h2')].find(h=> h.textContent.trim().startsWith(head));
  if(!h2) return;
  h2.style.transition = 'background .5s'; h2.style.background = '#FEF3C7';
  setTimeout(()=>{ h2.style.background = ''; }, 900);
  if(typeof h2.scrollIntoView === 'function') h2.scrollIntoView({block:'nearest'});
}

function renderRail(){
  const rails = document.querySelectorAll('[data-rail]');
  if(!rails.length) return;
  rails.forEach(r => r.innerHTML = '');
  const rail = { appendChild: node => rails.forEach((r,i)=> r.appendChild(i === rails.length-1 ? node : node.cloneNode(true))) };
  const items = [
    ...SECTION_META.map(m => {
      let on;
      if(m.key === 'insights') on = R.experience.length > 0;
      else if(m.always) on = true;
      else on = R[m.key] && R[m.key].length > 0;
      return {label:m.label, on, anchor:'sec-'+m.key, key:m.key};
    }),
    ...R.extra_sections.map((s,i)=>({label:s.heading||'Extra', on:true, anchor:'sec-extra-'+i, key:'extra-'+i}))
  ];
  
  items.forEach((it,idx)=>{
    // Count unfixed errors in this section first
    let unfixedCount = 0;
    if(R.quality_score && R.quality_score.issuesBySection && R.quality_score.issuesBySection[it.key]){
      unfixedCount = R.quality_score.issuesBySection[it.key].filter(e => !e.fixed).length;
    }
    // Green tick ONLY when detected AND fully clean; no tick when issues exist
    const cls = 'rail-item' + (it.on && unfixedCount === 0 ? ' detected' : '') + (unfixedCount > 0 ? ' has-issues' : '');
    const b = el('button',{class:cls,type:'button','data-anchor':it.anchor,'data-section':it.key},
      `${esc(it.label)}`);
    b.style.setProperty('--sec', SEC_COLOURS[idx % SEC_COLOURS.length]);

    if(unfixedCount > 0){
      const badge = el('span', {class: 'error-badge', style: 'margin-left:auto'});
      badge.style.display = 'inline-flex';
      badge.style.alignItems = 'center';
      badge.style.justifyContent = 'center';
      badge.style.width = '20px';
      badge.style.height = '20px';
      badge.style.borderRadius = '50%';
      badge.style.color = '#fff';
      badge.style.fontSize = '10px';
      badge.style.fontWeight = '900';
      let bgColor = '#EF4444';
      if(unfixedCount === 1) bgColor = '#F59E0B';
      badge.style.background = bgColor;
      badge.textContent = unfixedCount;
      b.appendChild(badge);
    }

    rail.appendChild(b);
  });
}
// one delegated handler serves every sidebar copy (clones keep no listeners)
document.addEventListener('click', e=>{
  const item = e.target.closest('.rail-item[data-anchor]');
  if(!item) return;
  const t = document.getElementById(item.dataset.anchor);
  if(t){
    t.scrollIntoView({behavior:'smooth', block:'start'});
    t.style.transition='box-shadow .3s';
    t.style.boxShadow='0 0 0 3px rgba(15,169,104,.35)';
    setTimeout(function(){ t.style.boxShadow=''; }, 1200);
  }
});

// ---------- Cards ----------
function personalCard(){
  const FIELDS = [
    ['name','Name',false],
    ['headline','Headline / industry line (e.g. GRC · Risk & Compliance · AI Governance)',true],
    ['email','Email',false],
    ['phone','Phone / Contact number',false],
    ['location','Location (City, Country)',false],
    ['linkedin','LinkedIn profile URL',false],
    ['website','Website / Portfolio',false]
  ];
  const c = el('div',{class:'card',id:'sec-personal'});
  const h2 = el('h2',{}, 'Personal details');
  c.appendChild(h2);
  const grid = el('div',{class:'grid2'});
  FIELDS.forEach(([f,lab,ai])=>{
    const wrap = el('div',{class:'field'});
    wrap.appendChild(fieldHead(lab, null));
    const inp = el('input',{'data-p':f,value:R.personal[f]||''});
    inp.addEventListener('input',()=> R.personal[f]=inp.value);
    wrap.appendChild(inp);
    grid.appendChild(wrap);
  });
  c.appendChild(grid);
  return c;
}

function summaryCard(){
  const c = el('div',{class:'card',id:'sec-summary'});
  c.innerHTML = '<h2>Summary</h2>';
  const mbS = markBar('summary', R.summary||'');
  if(mbS) c.appendChild(mbS);
  const fieldErrs = getFieldErrors('summary');
  if(fieldErrs.length > 0){
    const qf = qualityField(R.summary||'', fieldErrs, function(plain){ R.summary = plain; });
    c.appendChild(qf);
  } else {
    const ta = el('textarea',{rows:'4'});
    ta.value = R.summary||'';
    ta.addEventListener('input', function(){ R.summary = ta.value; });
    c.appendChild(ta);
  }
  const mlS = markLineList('summary', R.summary||'');
  if(mlS) c.appendChild(mlS);
  return c;
}

// Generic list sections (experience / education / certifications / projects)
const LIST_DEFS = {
  experience:{title:'Work experience', fields:[
    ['title','Job title'],['company','Company'],['location','Location'],
    ['start','Start (e.g. Mar 2019)'],['end','End (or Present)']], text:['desc','Responsibilities'], ai:true,
    blank:()=>({title:'',company:'',location:'',start:'',end:'',duration:0,desc:''})},
  education:{title:'Education', fields:[
    ['degree','Degree'],['institution','Institution'],['year','Year'],['grade','Grade / score']],
    blank:()=>({degree:'',institution:'',year:'',grade:''})},
  certifications:{title:'Certifications', fields:[
    ['name','Certification'],['issuer','Issuer'],['year','Year']],
    blank:()=>({name:'',issuer:'',year:''})},
  projects:{title:'Projects', fields:[['name','Project name']], text:['desc','Description'],
    blank:()=>({name:'',desc:''})},
  courses:{title:'Courses', fields:[['name','Course name'],['provider','Provider'],['year','Year']],
    blank:()=>({name:'',provider:'',year:''})}
};

// Which fields inside each list card can be improved by AI
const AI_FIELDS = {
  experience: new Set(['title','desc']),
  education: new Set(['degree']),
  certifications: new Set(['name']),
  projects: new Set(['name','desc'])
};

function listCard(key){
  const def = LIST_DEFS[key];
  const c = el('div',{class:'card',id:'sec-'+key});
  const h2 = el('h2',{}, def.title + '<button class="btn btn-ghost" type="button">+ Add</button>');
  c.appendChild(h2);
  const wrap = el('div',{class:'entries'});
  c.appendChild(wrap);

  const renderEntries = ()=>{
    wrap.innerHTML='';
    if(!R[key].length){
      wrap.appendChild(el('div',{class:'empty-hint'},
        `No ${def.title.toLowerCase()} yet — click <strong>+ Add</strong> above to create your first entry.`));
      return;
    }
    R[key].forEach((item,i)=>{
      const en = el('div',{class:'entry','data-ix':i});
      const head = el('div',{class:'entry-head'});
      head.innerHTML = `<strong><span class="entry-grip" draggable="true" title="Drag to reorder">⠿</span>`+
        `<button class="entry-arrow" type="button" data-dir="-1" title="Move up">▲</button>`+
        `<button class="entry-arrow" type="button" data-dir="1" title="Move down">▼</button> `+
        `${esc(item[def.fields[0][0]]||def.title+' '+(i+1))}</strong>
        <span><button class="btn btn-danger" type="button">Remove</button></span>`;
      en.appendChild(head);
      head.querySelectorAll('.entry-arrow').forEach(b=> b.addEventListener('click', ()=>{
        const j = i + (+b.dataset.dir);
        if(j < 0 || j >= R[key].length) return;
        R[key].splice(j, 0, R[key].splice(i,1)[0]);
        renderEntries(); renderRail();
        if(typeof renderLivePreview === 'function') renderLivePreview();
        flashPreviewSection(key);
      }));
      const g = head.querySelector('.entry-grip');
      g.addEventListener('dragstart', e=>{
        wrap._drag = i; en.classList.add('dragging');
        e.dataTransfer.effectAllowed = 'move';
        try{ e.dataTransfer.setDragImage(en, 24, 14); }catch(_){/* jsdom */}
      });
      g.addEventListener('dragend', ()=>{ wrap._drag = null; wrap.querySelectorAll('.entry').forEach(x=>x.classList.remove('dragging','dropbefore','dropafter')); });
      en.addEventListener('dragover', e=>{
        if(wrap._drag == null || wrap._drag === i) return;
        e.preventDefault();
        const r = en.getBoundingClientRect(), before = (e.clientY - r.top) < r.height/2;
        en.classList.toggle('dropbefore', before);
        en.classList.toggle('dropafter', !before);
      });
      en.addEventListener('dragleave', ()=> en.classList.remove('dropbefore','dropafter'));
      en.addEventListener('drop', e=>{
        if(wrap._drag == null || wrap._drag === i) return;
        e.preventDefault();
        const r = en.getBoundingClientRect(), before = (e.clientY - r.top) < r.height/2;
        let from = wrap._drag, to = i; wrap._drag = null;
        const moved = R[key].splice(from,1)[0];
        if(from < to) to--;
        if(!before) to++;
        R[key].splice(to,0,moved);
        renderEntries(); renderRail();
        if(typeof renderLivePreview === 'function') renderLivePreview();
        flashPreviewSection(key);
      });

      const grid = el('div',{class:'grid2'});
      def.fields.forEach(([f,lab])=>{
        const fw = el('div',{class:'field'});
        fw.appendChild(fieldHead(lab, null));
        const inp = el('input',{'data-f':f,value:item[f]||''});
        inp.addEventListener('input',()=> item[f]=inp.value);
        fw.appendChild(inp);
        grid.appendChild(fw);
      });
      en.appendChild(grid);

      if(def.text){
        const [tf,tlab] = def.text;
        const fw = el('div',{class:'field'});
        const canAI = AI_FIELDS[key]?.has(tf);
        const askSpec = canAI ? {
          key: key+'_'+i+'_'+tf,
          label: (item[def.fields[0][0]]||def.title) + (key==='experience' && item.company ? ' — '+item.company : ''),
          scopeNote: 'Changes apply to this '+(key==='experience'?'role':'entry')+' only.',
          hints: key==='experience'
            ? ['Stronger, more senior tone','Make each line shorter','Add metric placeholders']
            : ['Lead with the outcome','Make it shorter'],
          read: ()=> item[tf]||'',
          write: (v)=>{ item[tf]=v; }
        } : null;
        const markKey = key+'_'+i+'_'+tf;
        const blockId = key+'_'+i+'::'+tf;
        const fh = fieldHead(tlab, askSpec);
        // Aa Format sits beside Ask AI in the block header
        const tools = fh.querySelector('.sec-askai');
        if(tools) fh.insertBefore(formatToggleBtn(blockId), tools);
        else fh.appendChild(formatToggleBtn(blockId));
        fw.appendChild(fh);

        const mb = markBar(markKey, item[tf]||'');
        if(mb) fw.appendChild(mb);

        const fieldErrs = getFieldErrors(key+'_'+i);
        if(_fmtOpen === blockId){
          // formatting mode: structured line rows replace the plain field
          fw.appendChild(formatBlock(item, tf, blockId, function(){
            R.quality_score = analyzeQualityScore();
          }));
        } else if(fieldErrs.length > 0){
          fw.appendChild(qualityField(item[tf]||'', fieldErrs, function(plain){ item[tf]=plain; }));
        } else {
          const ta = el('textarea',{'data-f':tf,rows:'4'});
          ta.value = item[tf]||'';
          ta.addEventListener('input',()=> item[tf]=ta.value);
          fw.appendChild(ta);
        }
        const mlist = markLineList(markKey, item[tf]||'');
        if(mlist) fw.appendChild(mlist);
        en.appendChild(fw);
      }

      head.querySelector('.btn-danger').addEventListener('click', ()=>{
        R[key].splice(i,1); renderEntries();
      });
      wrap.appendChild(en);
    });
  };
  renderEntries();
  h2.querySelector('.btn-ghost').addEventListener('click', ()=>{
    R[key].push(def.blank()); renderEntries();
  });
  return c;
}

function skillsCard(){
  const c = el('div',{class:'card',id:'sec-skills'});
  c.innerHTML = '<h2>Skills</h2><input placeholder="Type a skill and press Enter"><div class="tags"></div>';
  const inp = c.querySelector('input'), tags = c.querySelector('.tags');
  const skillErrors = getFieldErrors('skills');
  const render = ()=>{
    tags.innerHTML='';
    R.skills.forEach((s,i)=>{
      const t = el('span',{class:'tag'}, esc(s)+' <button type="button" aria-label="Remove '+esc(s)+'">&times;</button>');
      // Check if this skill has an error
      const hasErr = skillErrors.find(function(e){ return !e.fixed && e.match && s.toLowerCase().indexOf(e.match.toLowerCase()) >= 0; });
      if(hasErr){
        t.style.background = 'rgba(16,185,129,.12)';
        t.style.borderBottom = '2px solid #10B981';
        t.title = hasErr.desc;
      }
      t.querySelector('button').addEventListener('click', ()=>{ R.skills.splice(i,1); render(); });
      tags.appendChild(t);
    });
  };
  inp.addEventListener('keydown', e=>{
    if(e.key==='Enter' && inp.value.trim()){ R.skills.push(inp.value.trim()); inp.value=''; render(); }
  });
  render();
  return c;
}

function simpleListCard(key, title){
  const c = el('div',{class:'card',id:'sec-'+key});
  c.innerHTML = `<h2>${title}</h2>
    <input placeholder="Type and press Enter"><div class="tags"></div>`;
  const inp = c.querySelector('input'), tags = c.querySelector('.tags');
  const render = ()=>{
    tags.innerHTML='';
    R[key].forEach((s,i)=>{
      const t = el('span',{class:'tag'}, `${esc(typeof s==='string'?s:JSON.stringify(s))} <button type="button">&times;</button>`);
      t.querySelector('button').addEventListener('click', ()=>{ R[key].splice(i,1); render(); });
      tags.appendChild(t);
    });
  };
  inp.addEventListener('keydown', e=>{
    if(e.key==='Enter' && inp.value.trim()){ R[key].push(inp.value.trim()); inp.value=''; render(); }
  });
  render();
  return c;
}

// Accomplishments: simple one-per-line card
function linesCard(key, title, placeholder){
  const c = el('div',{class:'card',id:'sec-'+key});
  c.innerHTML = '<h2>'+title+'</h2>';
  const fieldErrs = getFieldErrors(key);
  const text = (R[key]||[]).join('\n');
  if(fieldErrs.length > 0){
    const qf = qualityField(text, fieldErrs, function(plain){
      R[key] = plain.split('\n').map(function(s){return s.trim();}).filter(Boolean);
    });
    c.appendChild(qf);
  } else {
    const ta = el('textarea',{rows:'4',placeholder:placeholder});
    ta.value = text;
    ta.addEventListener('input', function(e){
      R[key] = e.target.value.split('\n').map(function(s){return s.trim();}).filter(Boolean);
    });
    c.appendChild(ta);
  }
  const hint = el('div',{style:'font-size:11px;color:var(--ink-soft);margin-top:4px'},'One per line \u2014 each becomes a bullet in your resume.');
  c.appendChild(hint);
  return c;
}

function extraCard(sec, idx){
  const c = el('div',{class:'card',id:'sec-extra-'+idx});
  c.innerHTML = `<h2><input style="max-width:320px;font-family:'Fraunces';font-size:18px;border:none;padding:0"
      value="${esc(sec.heading||'Extra section')}">
    <button class="btn btn-danger" type="button">Remove section</button></h2>
    <textarea rows="4" placeholder="One item per line">${esc((sec.items||[]).join('\n'))}</textarea>`;
  c.querySelector('h2 input').addEventListener('input', e=> sec.heading = e.target.value);
  c.querySelector('textarea').addEventListener('input', e=> sec.items = e.target.value.split('\n').filter(Boolean));
  c.querySelector('.btn-danger').addEventListener('click', ()=>{
    R.extra_sections.splice(idx,1); buildEditor();
  });
  return c;
}

// ---------- Add missing sections ----------
function renderAddPanel(){
  const p = $('#addPanel'); p.innerHTML='';
  const options = [
    ['experience','Experience'],['education','Education'],['skills','Skills'],
    ['certifications','Certifications'],['languages','Languages'],['projects','Projects'],
    ['accomplishments','Accomplishments'],['courses','Courses']
  ].filter(([k]) => !R[k] || !R[k].length);
  options.forEach(([k,label])=>{
    const b = el('button',{class:'btn btn-ghost',type:'button'}, '+ '+label);
    b.addEventListener('click', ()=>{
      if(k==='skills') R.skills=['New skill'];
      else if(k==='languages') R.languages=['English'];
      else if(k==='accomplishments') R.accomplishments=['Your first accomplishment'];
      else R[k]=[LIST_DEFS[k]?LIST_DEFS[k].blank():{}];
      buildEditor();
    });
    p.appendChild(b);
  });
  const custom = el('button',{class:'btn btn-ghost',type:'button'},'+ Custom section');
  custom.addEventListener('click', ()=>{
    R.extra_sections.push({heading:'New section', items:[]});
    buildEditor();
  });
  p.appendChild(custom);
}

// ============================================================
// AI enhance
// ============================================================
async function enhance(btn, getText, setText, context){
  const text = getText();
  if(!text || !text.trim()) return toast('Nothing to enhance yet — add some text first');
  const orig = btn.innerHTML;
  btn.disabled = true; btn.innerHTML = '<span class="spin"></span> Enhancing…';
  try{
    const out = await api('/api/enhance', {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ text, context })
    });
    setText(out.text);
    toast('Enhanced ✦');
  }catch(err){ toast('Enhance failed: ' + err.message, 6000); }
  btn.disabled = false; btn.innerHTML = orig;
}

// ============================================================
// Preview + Export
// ============================================================
// ============================================================
// LOCKED RESUME FORMAT
// Section 1: Name, current title, contact, certifications, education, industry line
// Section 2: Key skills (side-by-side chips)
// Career trends band (compact charts)
// Section 3: Areas of Practice / Experience (from resume or generated)
// Section 4: Projects / Automations / Innovation (only if present)
// Section 5: Work Experience — chronological, current first, with sub-sections
// Nothing else at the bottom. This structure never changes across templates.
// ============================================================

function templateCSS(t){
  const nameFont = t.serif ? "'Fraunces',Georgia,serif" : "Inter,'Segoe UI',Arial,sans-serif";
  const layout = t.layout || 'classic';
  let borderCSS = '';
  if(t.border === 'double')   borderCSS = `border:3px double ${t.main};outline:1px solid ${t.soft};outline-offset:3px;`;
  if(t.border === 'solid')    borderCSS = `border:2px solid ${t.main};`;
  if(t.border === 'hairline') borderCSS = `border:1px solid #D8DCE2;border-top:4px solid ${t.main};`;
  if(t.border === 'topband')  borderCSS = `border:1px solid #E2E5EA;border-top:10px solid ${t.main};`;
  if(t.border === 'sideband') borderCSS = `border:1px solid #E2E5EA;border-left:10px solid ${t.main};`;
  if(t.border === 'none')     borderCSS = `border:1px solid #E5E7EB;`;
  if(t.border === 'mono')     borderCSS = `border-top:2.5px solid ${t.main};border-bottom:2.5px solid ${t.main};`;

  // Contact block always grouped; aligned per header style (left / center / right-of-split)
  const headCSS = t.header === 'center'
    ? `.gcv-head{text-align:center;display:block}
       .gcv-contact{text-align:center;margin-top:8px}`
    : t.header === 'left'
    ? `.gcv-head{display:block}
       .gcv-contact{text-align:left;margin-top:8px}`
    : `.gcv-head{display:flex;justify-content:space-between;align-items:flex-start;gap:18px;flex-wrap:wrap}
       .gcv-contact{text-align:right;min-width:220px}`;

  let layoutCSS = '';
  if(layout === 'banner') layoutCSS = `
.gcv-head{background:${t.main};margin:-32px -36px 14px;padding:22px 36px 16px;border-bottom:none}
.gcv-name{color:#fff}
.gcv-title{color:${t.soft}}
.gcv-headline{color:rgba(255,255,255,.85)}
.gcv-contact{color:#F0F9FF}
.gcv-contact .cl{color:${t.soft}}
.gcv-contact a{color:#fff}
.gcv-credline{color:#F0F9FF}
.gcv-credline .cl{color:${t.soft}}`;
  if(layout === 'compact') layoutCSS = `
.gcv-page{padding:22px 26px}
.gcv-name{font-size:22px}
.gcv-page h2{margin:10px 0 6px;font-size:12.5px}
.gcv-job{margin-bottom:8px}
.gcv-page p,.gcv-page li{font-size:11.8px}
.gcv-chip{font-size:9.8px;padding:2px 8px}`;
  if(layout === 'mono') layoutCSS = `
.gcv-name{font-family:'Courier New',monospace;letter-spacing:-.02em}
.gcv-page h2{font-family:'Courier New',monospace;letter-spacing:.02em}
.gcv-sub{font-family:'Courier New',monospace}`;
  if(layout === 'twocol') layoutCSS = `
.gcv-cols{column-count:2;column-gap:22px;margin-bottom:4px}
.gcv-cols>*{break-inside:avoid}
.gcv-cols h2:first-child{margin-top:0}
@media(max-width:640px){.gcv-cols{column-count:1}}`;
  if(layout === 'sidebar') layoutCSS = `
.gcv-body{display:grid;grid-template-columns:195px 1fr;gap:18px}
@media(max-width:640px){.gcv-body{grid-template-columns:1fr}}
.gcv-side{border-right:2px solid ${t.soft};padding-right:14px}
@media(max-width:640px){.gcv-side{border-right:none;padding-right:0}}
.gcv-side .gcv-contact{text-align:left;min-width:0;margin-top:0}
.gcv-side h2{font-size:11.5px}
.gcv-side .gcv-chips{gap:4px}
.gcv-main h2:first-child{margin-top:0}
.gcv-head{display:block;border-bottom:3px solid ${t.main};padding-bottom:10px;margin-bottom:12px}`;

  return `
.gcv-page{font-family:Inter,'Segoe UI',Arial,sans-serif;color:#26292e;background:#fff;
  ${borderCSS}padding:32px 36px;max-width:820px;margin:0 auto;line-height:1.5}
.gcv-head{border-bottom:3px solid ${t.main};padding-bottom:12px;margin-bottom:12px}
${headCSS}
.gcv-name{font-size:27px;font-weight:800;color:${t.dark};letter-spacing:.01em;margin:0;font-family:${nameFont}}
.gcv-title{font-size:14.5px;font-weight:700;color:${t.main};margin-top:2px}
.gcv-headline{font-size:11.5px;font-weight:600;color:#555;text-transform:uppercase;letter-spacing:.07em;margin-top:3px}
.gcv-contact{font-size:11.5px;color:#333;line-height:1.75}
.gcv-contact .cl{color:${t.main};font-weight:700;text-transform:uppercase;font-size:9.5px;letter-spacing:.06em;margin-right:4px}
.gcv-contact a{color:${t.dark};text-decoration:none}
.gcv-credline{font-size:11.5px;color:#333;margin-top:6px;line-height:1.6}
.gcv-credline .cl{color:${t.main};font-weight:700;text-transform:uppercase;font-size:9.5px;letter-spacing:.06em;margin-right:4px}
.gcv-page h2{font-size:13.5px;text-transform:uppercase;letter-spacing:.07em;color:${t.main};
  border-bottom:1.5px solid ${t.soft};padding-bottom:3px;margin:14px 0 8px;font-weight:700}
.gcv-chips{display:flex;flex-wrap:wrap;gap:5px}
.gcv-chip{background:${t.soft};border:1px solid ${t.main};color:${t.dark};font-size:10.5px;
  font-weight:600;padding:2.5px 9px;border-radius:99px;white-space:nowrap}
.gcv-trends{display:flex;gap:12px;flex-wrap:wrap;background:${t.soft};border-radius:8px;padding:10px 12px;margin:10px 0}
.gcv-trend-col{flex:1;min-width:230px}
.gcv-trend-col h3{font-size:10.5px;text-transform:uppercase;letter-spacing:.08em;color:${t.dark};margin:0 0 6px;font-weight:600}
.gcv-trend-col svg{display:block;width:100%;height:auto}
.gcv-job{margin-bottom:12px;padding-left:10px;border-left:2.5px solid ${t.soft}}
.gcv-job-head{display:flex;justify-content:space-between;font-size:13.5px;gap:10px;flex-wrap:wrap}
.gcv-job-head strong{font-weight:700;color:${t.dark}}
.gcv-job-title{font-size:12.5px;font-weight:700;color:${t.main};margin:1px 0 2px}
.gcv-dates{color:#666;font-size:11.5px;white-space:nowrap;font-weight:600}
.gcv-sub{font-size:11.5px;font-weight:700;color:${t.dark};margin:7px 0 2px}
.gcv-sub.h_bold{font-weight:700}
.gcv-sub.h_under{font-weight:700;text-decoration:underline;text-underline-offset:2px}
.gcv-sub.h_caps{font-weight:700;text-transform:uppercase;letter-spacing:.07em}
.gcv-sub.h_rule{font-weight:700;border-bottom:1px solid ${t.dark};padding-bottom:2px}
.gcv-sub.h_accent{font-weight:700;color:${t.main}}
.gcv-sub.h_italic{font-weight:600;font-style:italic}
.gcv-sub.h_boxed{font-weight:700;background:#EFF2EF;border-radius:3px;padding:2px 7px;display:inline-block}
.gcv-sub.h_smallcaps{font-weight:700;font-variant:small-caps;letter-spacing:.04em}
/* formatted bullet lists: glyph is a real character so Word and PDF keep it */
.gcv-fl{list-style:none;margin:0 0 5px 0;padding:0}
.gcv-fl li{display:flex;gap:6px;margin-bottom:2px;page-break-inside:avoid}
.gcv-fl li .gcv-g{flex-shrink:0}
.gcv-plain{margin:0 0 4px}
.gcv-ul-head{margin-bottom:0;padding-bottom:0}
.gcv-ul-cont{margin-top:0;padding-top:0}
.gcv-page p,.gcv-page li{font-size:12.5px}
.gcv-page ul{padding-left:17px;margin:3px 0}
.gcv-page li{margin-bottom:1.5px}
.gcv-foot{margin-top:18px;padding-top:8px;border-top:1px solid ${t.soft};
  font-size:9.5px;color:#999;text-align:center}
.gcv-foot a{color:${t.main};text-decoration:none}
${layoutCSS}
@media(max-width:640px){.gcv-page{padding:20px 16px}}
@media print{body{margin:0;background:#fff}.gcv-page{max-width:none}
  .gcv-trends{-webkit-print-color-adjust:exact;print-color-adjust:exact}
  .gcv-head{-webkit-print-color-adjust:exact;print-color-adjust:exact}
  .gcv-chip{-webkit-print-color-adjust:exact;print-color-adjust:exact}}`;
}

// (Resume trend graphics use careerTimelineSVG / domainsSVG defined above.)

// ---- Areas of Practice: use summary from resume, otherwise generate locally ----
function areasOfPractice(){
  if(R.summary && R.summary.trim()) return esc(R.summary.trim());
  const roles = chronoRoles();
  if(!roles.length) return '';
  const years = roles.length ? (nowYear - roles[0].startY) : 0;
  const companies = [...new Set(R.experience.map(j=>j.company).filter(Boolean))];
  const titles = [...new Set(R.experience.map(j=>j.title).filter(Boolean))].slice(0,3);
  const topSkills = R.skills.slice(0,6);
  const parts = [];
  if(years) parts.push(`Professional with ${years}+ years of experience across ${companies.length} organisation${companies.length===1?'':'s'}.`);
  if(titles.length) parts.push(`Progression through roles including ${titles.join(', ')}.`);
  if(topSkills.length) parts.push(`Core practice areas: ${topSkills.join(', ')}.`);
  if(R.certifications.length) parts.push(`Credentialed in ${R.certifications.slice(0,3).map(c=>c.name).join(', ')}.`);
  parts.push('Focused on delivering measurable outcomes and continuous improvement.');
  return esc(parts.slice(0,5).join(' '));
}

// ---- Experience desc → bullets with sub-section detection ----
// Priority 1: lines the parser marked with "## " are always sub-headings.
// Priority 2 heuristics for unmarked resumes:
//   - "Key Achievements:" (ends with colon)
//   - "GOVERNANCE & REPORTING" (short ALL-CAPS line)
//   - "Governance" / "Risk Management" (short Title-Case line, 1-4 words,
//     no sentence punctuation, no verbs-in-sentence shape, no digits)
// Strip EVERY leading bullet glyph (•, ●, ▪, ◦, ·, o, -, *, 1., etc), stacked or not —
// the resume list adds its own markers, so none may survive in the text itself.
function stripBullets(s){
  let prev;
  do {
    prev = s;
    s = s.replace(/^\s*(?:[-–—•●▪▫◦‣·∙*+>»○□■✓✔➤➔→]|o(?=\s)|\d{1,2}[.)](?=\s))\s*/i, '');
  } while(s !== prev);
  return s.trim();
}

function renderDesc(desc){
  if(!desc) return '';
  const lines = desc.split('\n').map(l=>l.trim()).filter(Boolean);
  let html = '', bullets = [], pendingSub = null;
  // A subhead is glued to its first 2 bullets inside a keep-together block so a
  // page break can never orphan the header; remaining bullets flow freely in a
  // continuation list that visually joins the first (print-safe pagination).
  const flush = ()=>{
    const items = bullets.map(b=>`<li>${esc(stripBullets(b))}</li>`);
    if(pendingSub !== null){
      const head = `<div class="gcv-sub">${pendingSub}</div>`;
      if(items.length){
        const first = items.slice(0, 2).join('');
        const rest = items.slice(2).join('');
        html += `<div class="gcv-keep">${head}<ul${rest ? ' class="gcv-ul-head"' : ''}>${first}</ul></div>`;
        if(rest) html += `<ul class="gcv-ul-cont">${rest}</ul>`;
      } else {
        html += `<div class="gcv-keep">${head}</div>`;
      }
      pendingSub = null;
    } else if(items.length){
      html += `<ul>${items.join('')}</ul>`;
    }
    bullets = [];
  };
  const ACTION_VERBS = new Set(('led,managed,built,created,delivered,developed,implemented,designed,conducted,performed,'+
    'established,coordinated,drove,supported,owned,launched,reduced,improved,increased,achieved,ensured,defined,'+
    'executed,maintained,chaired,presented,authored,reviewed,streamlined,spearheaded,oversaw,handled,provided,'+
    'produced,ran,set,won,partnered,collaborated,advised,audited,assessed,automated,migrated,negotiated,trained,'+
    'mentored,monitored,tracked,prepared,planned,aligned,enabled,facilitated,championed,initiated,introduced,'+
    'standardised,standardized,optimised,optimized,remediated,resolved,identified,acted,served,worked,helped').split(','));
  const isTitleCaseHeading = s => {
    if(s.length > 45 || /[.,;!?]$/.test(s) || /\d/.test(s)) return false;
    const words = s.split(/\s+/);
    if(words.length < 1 || words.length > 4) return false;
    // resume bullets start with action verbs — those are content, not headings
    if(ACTION_VERBS.has(words[0].toLowerCase())) return false;
    // every significant word starts uppercase; small connectors allowed
    const minor = new Set(['and','of','the','for','in','&','/','—','-']);
    return words.every(w => minor.has(w.toLowerCase()) || /^[A-Z]/.test(w));
  };
  lines.forEach(l => {
    let clean = stripBullets(l);
    const marked = /^##\s+/.test(clean);
    if(marked) clean = clean.replace(/^##\s+/,'');
    const isSub = marked
      || /^[A-Za-z][A-Za-z0-9 ()/&,'-]{2,60}:$/.test(clean)
      || (/^[A-Z0-9 ()/&,'-]{4,60}$/.test(clean) && clean.split(' ').length <= 6 && !/\d{4}/.test(clean))
      || isTitleCaseHeading(clean);
    if(isSub){
      flush();
      pendingSub = esc(clean.replace(/:$/,''));
    } else {
      bullets.push(clean);
    }
  });
  flush();
  return html;
}

// Normalise any date string to "Mmm/YYYY" (or "YYYY" if month unknown)
const _MON = {jan:'Jan',feb:'Feb',mar:'Mar',apr:'Apr',may:'May',jun:'Jun',jul:'Jul',aug:'Aug',sep:'Sep',oct:'Oct',nov:'Nov',dec:'Dec'};
function fmtMY(s){
  s = String(s||'').trim();
  if(!s) return '';
  if(/present|current|now|till date|to date/i.test(s)) return 'Present';
  let m = s.match(/([A-Za-z]{3,9})[\s\/\-.]*(\d{4})/);
  if(m){ const mon = _MON[m[1].slice(0,3).toLowerCase()]; if(mon) return mon+'/'+m[2]; }
  m = s.match(/(\d{1,2})[\/\-](\d{4})/);
  if(m){ const mi = parseInt(m[1]); const names=Object.values(_MON); if(mi>=1&&mi<=12) return names[mi-1]+'/'+m[2]; }
  m = s.match(/(\d{4})[\/\-](\d{1,2})/);
  if(m){ const mi = parseInt(m[2]); const names=Object.values(_MON); if(mi>=1&&mi<=12) return names[mi-1]+'/'+m[1]; }
  m = s.match(/\d{4}/);
  if(m) return m[0];
  return s;
}

function fmtDates(j, isCurrent){
  const start = fmtMY(j.start);
  let end = fmtMY(j.end);
  if(isCurrent || !end) end = 'Present';
  return `${esc(start)}${start?' – ':''}${esc(end)}`;
}

function resumeHTML(forExport=false){
  const t = getTemplate();
  const layout = t.layout || 'classic';
  const p = R.personal;
  const currentTitle = (R.experience[0]?.title || '').trim();
  const prefs = R.chart_prefs || {timeline:true, domains:true, tenure:false};
  const sp = R.section_prefs || {};
  const on = k => sp[k] !== false;

  // ---- identity (name / current title / industry line)
  const identity = `<h1 class="gcv-name">${esc(p.name)||'Your Name'}</h1>
    ${currentTitle?`<div class="gcv-title">${esc(currentTitle)}</div>`:''}
    ${p.headline?`<div class="gcv-headline">${esc(p.headline)}</div>`:''}`;

  // ---- contact block: only fields available from the resume, always grouped
  const contactLines = [];
  if(p.email)    contactLines.push(`<div><span class="cl">Email:</span><a href="mailto:${esc(p.email)}">${esc(p.email)}</a></div>`);
  if(p.phone)    contactLines.push(`<div><span class="cl">Contact:</span>${esc(p.phone)}</div>`);
  if(p.location) contactLines.push(`<div><span class="cl">Location:</span>${esc(p.location)}</div>`);
  if(p.linkedin){
    const url = /^https?:\/\//i.test(p.linkedin) ? p.linkedin : 'https://'+p.linkedin.replace(/^\/+/,'');
    contactLines.push(`<div><span class="cl">LinkedIn:</span><a href="${esc(url)}" target="_blank" rel="noopener">${esc(p.linkedin.replace(/^https?:\/\/(www\.)?/i,''))}</a></div>`);
  }
  if(p.website){
    const url = /^https?:\/\//i.test(p.website) ? p.website : 'https://'+p.website.replace(/^\/+/,'');
    contactLines.push(`<div><span class="cl">Website:</span><a href="${esc(url)}" target="_blank" rel="noopener">${esc(p.website.replace(/^https?:\/\/(www\.)?/i,''))}</a></div>`);
  }
  const contactBlock = contactLines.length ? `<div class="gcv-contact">${contactLines.join('')}</div>` : '';

  // ---- credentials line (certifications + education in header area)
  const credBits = [];
  if(on('certifications') && R.certifications.length) credBits.push(`<span class="cl">Certifications:</span>${R.certifications.map(c=>esc(c.name)+(c.year?' ('+esc(c.year)+')':'')).join(' · ')}`);
  if(on('education') && R.education.length) credBits.push(`<span class="cl">Education:</span>${R.education.map(e=>esc(e.degree)+(e.institution?', '+esc(e.institution):'')+(e.year?' ('+esc(e.year)+')':'')).join(' · ')}`);
  const credLine = credBits.length ? `<div class="gcv-credline">${credBits.join('<br>')}</div>` : '';

  // ---- content blocks
  const skillsBlock = (on('skills') && R.skills.length)
    ? `<h2>Key Skills</h2><div class="gcv-chips">${R.skills.map(s=>`<span class="gcv-chip">${esc(s)}</span>`).join('')}</div>` : '';

  const tl = prefs.timeline ? careerTimelineSVG(t, false) : '';
  const dm = prefs.domains ? domainsSVG(t, false) : '';
  const tr = prefs.tenure ? tenureRankingSVG(t, false) : '';
  const trendsBlock = (tl || dm || tr) ? `<div class="gcv-trends">
    ${tl?`<div class="gcv-trend-col" style="flex:1 1 100%;min-width:100%"><h3>Career Timeline</h3>${tl}</div>`:''}
    ${dm?`<div class="gcv-trend-col" style="flex:1 1 100%;min-width:100%;margin-top:8px;padding-top:8px;border-top:1px solid rgba(0,0,0,.06)"><h3>Domain Expertise</h3>${dm}</div>`:''}
    ${tr?`<div class="gcv-trend-col" style="flex:1 1 100%;min-width:100%;margin-top:8px;padding-top:8px;border-top:1px solid rgba(0,0,0,.06)"><h3>Tenure Ranking — Highest to Lowest</h3>${tr}</div>`:''}
  </div>` : '';

  const aop = on('summary') ? areasOfPractice() : '';
  const aopBlock = aop ? `<h2>Areas of Practice / Experience</h2><p>${aop}</p>` : '';

  const accomplishmentsBlock = (on('accomplishments') && R.accomplishments.length)
    ? `<h2>Accomplishments</h2><ul>${R.accomplishments.map(a=>`<li>${esc(a)}</li>`).join('')}</ul>` : '';

  const projectsBlock = (on('projects') && R.projects.length) ? `<h2>Projects / Automations / Innovation</h2>${R.projects.map(pr=>
    `<div class="gcv-job"><strong style="font-size:12.5px">${esc(pr.name)}</strong>${pr.desc?`<p style="margin:2px 0 0">${esc(pr.desc)}</p>`:''}</div>`).join('')}` : '';

  const coursesBlock = (on('courses') && R.courses.length)
    ? `<h2>Courses</h2><ul>${R.courses.map(c=>`<li>${esc(c.name)}${c.provider?' — '+esc(c.provider):''}${c.year?' ('+esc(c.year)+')':''}</li>`).join('')}</ul>` : '';

  const expBlock = (on('experience') && R.experience.length) ? `<h2>Work Experience / History</h2>` +
    R.experience.map((j,i)=>`
    <div class="gcv-job">
      <div class="gcv-job-head">
        <strong>${esc(j.company)}</strong>
        <span class="gcv-dates">${fmtDates(j, i===0)}</span>
      </div>
      <div class="gcv-job-title">${esc(j.title)}${j.location?' · '+esc(j.location):''}</div>
      ${renderDescFmt(j.desc, getFmt(j,'desc'))}
    </div>`).join('') : '';

  const extrasBlock = R.extra_sections.map(s=>`<h2>${esc(s.heading)}</h2><ul>${(s.items||[]).map(i=>`<li>${esc(i)}</li>`).join('')}</ul>`).join('');

  const foot = `<div class="gcv-foot">Built with Reeve · <a href="https://www.decompliance.uk">www.decompliance.uk</a> · AI GRC Intelligence by DeCompliance</div>`;

  // ---- LAYOUT COMPOSER: user-arranged section order feeds every layout
  const blockMap = {summary:aopBlock, skills:skillsBlock, accomplishments:accomplishmentsBlock,
    courses:coursesBlock, projects:projectsBlock, experience:expBlock};
  const orderKeys = (Array.isArray(R.section_order) && R.section_order.length ? R.section_order : DEFAULT_SECTION_ORDER)
    .filter(k => blockMap[k] !== undefined);
  const orderedAll = orderKeys.map(k=>blockMap[k]).join('');
  const orderedNoSkills = orderKeys.filter(k=>k!=='skills').map(k=>blockMap[k]).join('');
  const orderedCols = orderKeys.filter(k=>k!=='skills' && k!=='experience').map(k=>blockMap[k]).join('');
  const classicFlow = orderKeys[0]==='skills'
    ? skillsBlock + trendsBlock + orderKeys.slice(1).map(k=>blockMap[k]).join('')
    : trendsBlock + orderedAll;
  let body;
  if(layout === 'sidebar'){
    body = `<div class="gcv-page">
      <div class="gcv-head">${identity}</div>
      <div class="gcv-body">
        <div class="gcv-side">
          ${contactBlock}
          ${credLine}
          ${skillsBlock}
        </div>
        <div class="gcv-main">
          ${trendsBlock}${orderedNoSkills}${extrasBlock}
        </div>
      </div>${foot}</div>`;
  } else if(layout === 'twocol'){
    body = `<div class="gcv-page">
      <div class="gcv-head"><div>${identity}${credLine}</div>${contactBlock}</div>
      ${skillsBlock}${trendsBlock}
      <div class="gcv-cols">${orderedCols}</div>
      ${expBlock}${extrasBlock}${foot}</div>`;
  } else {
    // classic / banner / compact / mono share the classic structure (CSS restyles them)
    body = `<div class="gcv-page">
      <div class="gcv-head"><div>${identity}${credLine}</div>${contactBlock}</div>
      ${classicFlow}${extrasBlock}${foot}</div>`;
  }

  if(!forExport) return `<style>${templateCSS(t)}</style>${body}`;
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${esc(p.name)||'Resume'} — CV</title>
<style>body{margin:24px;background:#f2f3f5}${templateCSS(t)}</style></head><body>${body}</body></html>`;
}

// ============================================================
// Template gallery — user picks one right after upload; format is
// then locked and identical in preview and every download.
// ============================================================
function templateMini(t){
  // Tiny schematic preview of the template
  const headerRow = t.header==='center'
    ? `<div style="height:7px;width:55%;margin:4px auto 2px;background:${t.dark};border-radius:2px"></div>
       <div style="height:4px;width:70%;margin:0 auto;background:${t.main};border-radius:2px"></div>`
    : t.header==='left'
    ? `<div style="height:7px;width:55%;margin:4px 6px 2px;background:${t.dark};border-radius:2px"></div>
       <div style="height:4px;width:65%;margin:0 6px;background:${t.main};border-radius:2px"></div>`
    : `<div style="display:flex;justify-content:space-between;padding:4px 6px 2px">
         <div style="height:7px;width:45%;background:${t.dark};border-radius:2px"></div>
         <div style="height:7px;width:25%;background:${t.soft};border:1px solid ${t.main};border-radius:2px"></div></div>`;
  const borderStyle = t.border==='double' ? `border:2px double ${t.main};`
    : t.border==='solid' ? `border:1.5px solid ${t.main};`
    : t.border==='topband' ? `border:1px solid #E2E5EA;border-top:5px solid ${t.main};`
    : t.border==='sideband' ? `border:1px solid #E2E5EA;border-left:5px solid ${t.main};`
    : `border:1px solid #D8DCE2;border-top:2.5px solid ${t.main};`;
  return `<div style="${borderStyle}border-radius:5px;background:#fff;height:84px;overflow:hidden">
    ${headerRow}
    <div style="display:flex;gap:2px;padding:3px 6px">
      ${[28,34,22,30].map(w=>`<div style="height:5px;width:${w}px;background:${t.soft};border:1px solid ${t.main};border-radius:99px"></div>`).join('')}
    </div>
    <div style="height:4px;width:40%;margin:2px 6px;background:${t.main};opacity:.85;border-radius:2px"></div>
    ${[85,78,88].map(w=>`<div style="height:3px;width:${w}%;margin:2.5px 6px;background:#E5E7EB;border-radius:2px"></div>`).join('')}
  </div>`;
}

function renderTemplateGrid(){
  document.querySelectorAll('[data-templategrid]').forEach(grid=>{
    grid.innerHTML = '';
    TEMPLATES.forEach(t=>{
      const b = el('button',{class:'tpl-card'+(t.id===selectedTemplate?' sel':''),type:'button'},
        `${templateMini(t)}<div class="tpl-name">${t.name}</div>`);
      b.addEventListener('click', ()=>{
        selectedTemplate = t.id;
        renderTemplateGrid();
        const sel = $('#tplSelName'); if(sel) sel.textContent = getTemplate().name;
        // apply instantly to the right-side live preview — user sees it before Apply
        renderLivePreview();
        if($('#previewModal').classList.contains('open'))
          injectResumeInto([$('#previewBody')]);
      });
      grid.appendChild(b);
    });
  });
}


// ---- Preview: review → then download PDF / Word ----
function openPreview(){
  injectResumeInto([$('#previewBody')]);
  $('#previewModal').classList.add('open');
}
// Templates picker window — select, watch the live preview apply, then Apply
function openTemplatesModal(){
  renderTemplateGrid();
  const sel = $('#tplSelName'); if(sel) sel.textContent = getTemplate().name;
  $('#templatesModal').classList.add('open');
}
$('#tplApply').addEventListener('click', ()=>{
  $('#templatesModal').classList.remove('open');
  renderLivePreview();
  toast('Template applied: ' + getTemplate().name);
});
document.querySelectorAll('.js-preview, .js-export').forEach(b =>
  b.addEventListener('click', openPreview));


function safeFileName(){
  return ((R.personal.name||'My').trim().replace(/[^A-Za-z0-9]+/g,'-') || 'My') + '-CV';
}

// PDF via the browser's NATIVE print engine — pixel-perfect vector output:
// exact match to the preview, selectable text, SVG charts drawn natively,
// clean A4 page breaks. (Canvas-capture engines proved unreliable across
// Chrome builds — native printing never is.)
function downloadPDF(){
  const pw = window.open('', '_blank');
  if(!pw) return toast('Please allow pop-ups for this site, then click PDF again', 5000);
  const t = getTemplate();
  const frameBorder = (t.border === 'double')
    ? `border:3px double ${t.main}`
    : `border:1.5px solid ${t.main}`;
  const printCSS = `<style>
    /* margin:0 removes the browser's own header/footer (date, about:blank, page N) */
    @page{ size: A4; margin: 0; }
    html,body{ margin:0; padding:0; background:#fff; }
    /* horizontal padding is safe on body (pages never break sideways) */
    body{ padding: 0 12mm; }
    .gcv-page{ max-width:none; box-shadow:none; border:none !important; outline:none !important; }
    /* border frame on EVERY page: position:fixed repeats per printed page */
    .gcv-print-frame{ position:fixed; top:5mm; left:5mm; right:5mm; bottom:5mm;
      ${frameBorder}; pointer-events:none; z-index:9999; }
    /* per-page top/bottom breathing room: thead+tfoot repeat on every printed
       page, reserving space so content NEVER touches the border frame */
    .gcv-ptbl{ width:100%; border-collapse:collapse; }
    .gcv-ptbl > thead td, .gcv-ptbl > tfoot td{ padding:0; border:none; }
    .gcv-ptbl > thead .sp{ height: 12mm; }
    .gcv-ptbl > tfoot .sp{ height: 11mm; }
    .gcv-ptbl > tbody > tr > td{ padding:0; border:none; }
    /* pagination rules: fill every page, never orphan a header
       — lists and paragraphs BREAK FREELY (no half-empty pages)
       — individual bullets stay whole
       — a subhead + its first two bullets always travel together */
    .gcv-page h2{ break-after: avoid; page-break-after: avoid; }
    .gcv-page h2 + *{ break-before: avoid; page-break-before: avoid; }
    .gcv-keep{ break-inside: avoid; page-break-inside: avoid; }
    .gcv-page p{ orphans:3; widows:3; }
    .gcv-page li{ break-inside: avoid; page-break-inside: avoid; }
    .gcv-trends, .gcv-trend-col, .gcv-credline, .gcv-chips{ break-inside: avoid; page-break-inside: avoid; }
    /* seam the split lists so head+continuation read as one list */
    .gcv-ul-head{ margin-bottom: 0 !important; padding-bottom: 0 !important; }
    .gcv-ul-cont{ margin-top: 0 !important; padding-top: 0 !important; }
    *{ -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  </style>`;
  const auto = `<script>
    document.title = ${JSON.stringify(safeFileName())};
    window.onload = () => setTimeout(() => window.print(), 350);
    window.onafterprint = () => setTimeout(() => window.close(), 300);
  <\/script>`;
  const html = resumeHTML(true)
    .replace('</head>', printCSS + '</head>')
    .replace('<style>body{margin:24px;background:#f2f3f5}', '<style>body{margin:0;background:#fff}')
    .replace('<body>', '<body><div class="gcv-print-frame"></div><table class="gcv-ptbl"><thead><tr><td><div class="sp"></div></td></tr></thead><tbody><tr><td>')
    .replace('</body>', '</td></tr></tbody><tfoot><tr><td><div class="sp"></div></td></tr></tfoot></table>' + auto + '</body>');
  pw.document.write(html);
  pw.document.close();
  toast('In the dialog choose "Save as PDF" — the file matches your preview exactly');
}
document.querySelectorAll('.js-pdf').forEach(b => b.addEventListener('click', downloadPDF));

// Word: HTML wrapped with Word-compatible headers, saved as .doc
function downloadWord(){
  const html = resumeHTML(true);
  const wordDoc = html.replace('<html>',
    `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">`)
    .replace('<head>', `<head><!--[if gte mso 9]><xml><w:WordDocument><w:View>Print</w:View><w:Zoom>100</w:Zoom></w:WordDocument></xml><![endif]-->`);
  const blob = new Blob(['\ufeff', wordDoc], {type:'application/msword'});
  const url = URL.createObjectURL(blob);
  const a = el('a',{href:url,download:safeFileName()+'.doc'});
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(()=> URL.revokeObjectURL(url), 800);
  toast('Downloading '+safeFileName()+'.doc');
}
document.querySelectorAll('.js-word').forEach(b => b.addEventListener('click', downloadWord));

// HTML download kept as a third option
$('#pvHtml').addEventListener('click', ()=>{
  const blob = new Blob([resumeHTML(true)], {type:'text/html'});
  const url = URL.createObjectURL(blob);
  const a = el('a',{href:url,download:safeFileName()+'.html'});
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(()=> URL.revokeObjectURL(url), 800);
  toast('Downloading '+safeFileName()+'.html');
});

document.querySelectorAll('[data-close]').forEach(b =>
  b.addEventListener('click', e => e.target.closest('.modal').classList.remove('open')));
document.querySelectorAll('.modal').forEach(m =>
  m.addEventListener('click', e => { if(e.target===m) m.classList.remove('open'); }));

// ============================================================
// Chart tooltips — reliable JS tooltips replacing SVG <title>
// ============================================================
const tipEl = el('div',{id:'chartTip'});
document.body.appendChild(tipEl);
document.addEventListener('mousemove', e=>{
  const target = e.target.closest('[data-tip]');
  if(target){
    tipEl.textContent = target.getAttribute('data-tip');
    tipEl.style.display = 'block';
    const pad = 14;
    let x = e.clientX + pad, y = e.clientY + pad;
    const r = tipEl.getBoundingClientRect();
    if(x + r.width > window.innerWidth - 8) x = e.clientX - r.width - pad;
    if(y + r.height > window.innerHeight - 8) y = e.clientY - r.height - pad;
    tipEl.style.left = x+'px'; tipEl.style.top = y+'px';
  } else {
    tipEl.style.display = 'none';
  }
});

// ============================================================
// Live split-screen preview — right pane updates as you edit
// ============================================================
let _lpTimer = null;
function renderLivePreview(){
  if(resumeIsEmpty()){
    document.querySelectorAll('[data-livepane]').forEach(p =>
      p.innerHTML = '<div class="pv-live-empty">Your resume preview appears here as you build — upload a CV or start fresh.</div>');
    return;
  }
  injectResumeInto(document.querySelectorAll('[data-livepane]'));
  document.querySelectorAll('[data-livetpl]').forEach(s => s.textContent = getTemplate().name);
}

// Render the resume into container(s) WITHOUT tearing down styles each time.
// resumeHTML returns a full document; we split style from body, keep the style
// in a persistent <style> node (updating text only when it changes — no flash),
// and put just the body fragment into the pane. Full structural templates
// (banner, sidebar, duo-column...) render completely, with zero flicker.
function injectResumeInto(containers){
  const doc = resumeHTML(false);
  // Collect ALL style blocks (head + any inside the body, e.g. chart styles)
  let css = '';
  const styleRe = /<style>([\s\S]*?)<\/style>/g;
  let m;
  while((m = styleRe.exec(doc)) !== null) css += m[1] + '\n';
  // strip the export doc's global body rule so it can't leak into the app page
  css = css.replace(/(^|\})\s*body\s*\{[^}]*\}/, '$1');
  const bodyMatch = doc.match(/<body[^>]*>([\s\S]*?)<\/body>/);
  let frag = bodyMatch ? bodyMatch[1] : doc;
  // pane holds pure markup; styles live in the persistent node below
  frag = frag.replace(/<style>[\s\S]*?<\/style>/g, '');
  let styleEl = document.getElementById('gcvLiveStyle');
  if(!styleEl){
    styleEl = document.createElement('style');
    styleEl.id = 'gcvLiveStyle';
    document.head.appendChild(styleEl);
  }
  if(styleEl.textContent !== css) styleEl.textContent = css;
  containers.forEach(p => p.innerHTML = frag);
}
function schedulePreview(){
  clearTimeout(_lpTimer);
  _lpTimer = setTimeout(renderLivePreview, 400);
}
// any edit inside the builder refreshes the live preview
$('#editor').addEventListener('input', schedulePreview);
$('#editor').addEventListener('change', schedulePreview);
document.querySelectorAll('.js-tplopen').forEach(b =>
  b.addEventListener('click', openTemplatesModal));

// ============================================================
// Views, routing, auth — Reeve shell
// ============================================================
let currentUser = null;

function showView(id){
  document.querySelectorAll('.view').forEach(v => v.classList.remove('on'));
  const t = document.getElementById('view-'+id);
  if(t) t.classList.add('on');
  // The splitter/preview-width logic needs a live grid to size, which only
  // exists once a builder view is actually on-screen — re-run it here
  // rather than once at page load, when neither 'pro' nor 'fresher' is on yet.
  if(id==='pro' || id==='fresher'){
    requestAnimationFrame(function(){
      decoratePreviewHeader();
      initPreviewSplitter();
    });
  }
  // Builder views: the footer rides at the END of the centre scroll column so
  // the workspace extends to the bottom of the screen. Everywhere else it
  // returns to its normal place at the bottom of the page.
  const foot = document.querySelector('.app-footer');
  if(foot){
    if(id === 'pro' || id === 'fresher'){
      const main = document.querySelector('#view-' + id + ' main');
      if(main && foot.parentElement !== main) main.appendChild(foot);
    } else if(foot.parentElement !== document.body){
      document.body.appendChild(foot);
    }
  }
  window.scrollTo({top:0});
}

function moveEditorTo(module){
  const wrap = $('#editorWrap');
  const slot = module === 'fresher' ? $('#editorSlotFresher') : $('#editorSlotPro');
  if(wrap && slot && wrap.parentElement !== slot) slot.appendChild(wrap);
}

function goHome(){
  if(!currentUser){ showView('login'); return; }
  showView('home');
}

function enterModule(module){
  if(!currentUser){ showView('login'); return; }
  currentModule = module;
  showView(module);
  // if a resume is already built, bring the editor along
  if(!$('#editor').classList.contains('hidden')) moveEditorTo(module);
  loadSavedList();
}

// ---- auth API ----
function authErr(id, msg){
  const e = $('#'+id);
  e.textContent = msg; e.classList.add('on');
  setTimeout(()=> e.classList.remove('on'), 6000);
}

async function doLogin(){
  const email = $('#liEmail').value.trim(), password = $('#liPw').value;
  if(!email || !password) return authErr('loginErr','Please enter your email and password');
  try{
    const out = await api('/api/auth/login', {method:'POST',
      headers:{'Content-Type':'application/json'}, body: JSON.stringify({email, password})});
    setUser(out.user);
  }catch(err){ authErr('loginErr', err.message); }
}

async function doSignup(){
  const name = $('#suName').value.trim(), email = $('#suEmail').value.trim();
  const pw = $('#suPw').value, pw2 = $('#suPw2').value;
  if(!email || !pw) return authErr('signupErr','Please fill in email and password');
  if(pw.length < 8) return authErr('signupErr','Password must be at least 8 characters');
  if(pw !== pw2) return authErr('signupErr','Passwords do not match');
  try{
    const out = await api('/api/auth/signup', {method:'POST',
      headers:{'Content-Type':'application/json'}, body: JSON.stringify({name, email, password: pw})});
    setUser(out.user);
  }catch(err){ authErr('signupErr', err.message); }
}

async function doLogout(){
  try{ await api('/api/auth/logout', {method:'POST'}); }catch{}
  currentUser = null;
  $('#hdrRight').style.display = 'none';
  showView('landing');
  initLanding();
}

function setUser(user){
  currentUser = user;
  const display = user.name || user.email;
  const initial = (display[0] || '?').toUpperCase();
  const avatar = $('#hdrAvatar'); if(avatar) avatar.textContent = initial;
  const txt = $('#hdrUserText'); if(txt) txt.textContent = display;
  $('#hdrRight').style.display = 'flex';
  showView('home');
  loadSavedList();
}

// ---- wiring ----
$('#brandHome').addEventListener('click', goHome);
$('#btnLogin').addEventListener('click', doLogin);
$('#liPw').addEventListener('keydown', e=>{ if(e.key==='Enter') doLogin(); });
$('#btnSignup').addEventListener('click', doSignup);
$('#goSignup').addEventListener('click', ()=> showView('signup'));
$('#goLogin').addEventListener('click', ()=> showView('login'));
$('#btnLogout').addEventListener('click', doLogout);
$('#tilePro').addEventListener('click', ()=> enterModule('pro'));
$('#tileFresher').addEventListener('click', ()=> enterModule('fresher'));
document.querySelectorAll('.js-home').forEach(b => b.addEventListener('click', goHome));
document.querySelectorAll('.js-switch').forEach(b =>
  b.addEventListener('click', ()=> enterModule(b.dataset.to)));

// ============================================================
// Saved resumes — save, list, open (re-edit / re-template / download), delete
// ============================================================
let currentResumeId = null;
let currentModule = 'pro';

function resumeIsEmpty(){
  return !R.personal.name && !R.experience.length && !R.skills.length && !R.summary;
}

async function saveCurrentResume(){
  if(resumeIsEmpty()) return toast('Nothing to save yet — import or build a resume first');
  const suggested = (R.personal.name ? R.personal.name + ' — ' : '') + 'CV ' + new Date().toLocaleDateString();
  const name = window.prompt('Name this resume:', currentResumeName || suggested);
  if(name === null) return; // cancelled
  try{
    const out = await api('/api/resumes', {method:'POST',
      headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ id: currentResumeId, name, template: selectedTemplate, data: R })});
    currentResumeId = out.id;
    currentResumeName = name;
    toast('💾 Saved "' + name + '"');
    loadSavedList();
  }catch(err){ toast('Save failed: ' + err.message, 5000); }
}
let currentResumeName = '';

async function loadSavedList(){
  let items = [];
  try{
    const out = await api('/api/resumes');
    items = out.resumes || [];
  }catch{ /* not signed in yet */ }
  document.querySelectorAll('[data-savedlist]').forEach(listEl=>{
    listEl.innerHTML = '';
    if(!items.length){
      listEl.appendChild(el('div',{class:'saved-empty'},
        'No saved resumes yet — build one and click 💾 Save in the toolbar above.'));
      return;
    }
    items.forEach(item=>{
      const tplName = (TEMPLATES.find(t=>t.id===item.template)||{}).name || item.template;
      const row = el('div',{class:'saved-row'});
      row.innerHTML = `<div>
          <div class="sname">📄 ${esc(item.name)}</div>
          <div class="smeta">${esc(item.who||'')}${item.title?' · '+esc(item.title):''} · ${tplName} · updated ${new Date(item.updated).toLocaleDateString()}</div>
        </div>
        <div class="sbtns">
          <button class="btn btn-ghost" data-open type="button">Open</button>
          <button class="btn btn-danger" data-del type="button">Delete</button>
        </div>`;
      row.querySelector('[data-open]').addEventListener('click', ()=> openSavedResume(item.id));
      row.querySelector('[data-del]').addEventListener('click', async ()=>{
        if(!window.confirm('Delete "' + item.name + '"? This cannot be undone.')) return;
        try{
          await api('/api/resumes/' + item.id, {method:'DELETE'});
          if(currentResumeId === item.id){ currentResumeId = null; currentResumeName = ''; }
          toast('Deleted');
          loadSavedList();
        }catch(err){ toast('Delete failed: ' + err.message, 5000); }
      });
      listEl.appendChild(row);
    });
  });
}

async function openSavedResume(id){
  try{
    const out = await api('/api/resumes/' + id);
    const r = out.resume;
    R = normalize(r.data);
    if(TEMPLATES.some(t=>t.id===r.template)) selectedTemplate = r.template;
    currentResumeId = r.id;
    currentResumeName = r.name;
    moveEditorTo(currentModule);
    buildEditor();
    $('#savedModal').classList.remove('open');
    toast('Opened "' + r.name + '" — edit, change template or download');
  }catch(err){ toast('Could not open: ' + err.message, 5000); }
}

document.querySelectorAll('.js-save').forEach(b => b.addEventListener('click', saveCurrentResume));

// Upload CV anytime — replaces current resume with the new import
document.querySelectorAll('.js-upload').forEach(b => b.addEventListener('click', ()=>{
  $('#fileInput').value = '';
  $('#fileInput').click();
}));

// Refresh: clear current resume data and start clean (with save prompt)
function clearBuilder(){
  R = emptyResume();
  currentResumeId = null; currentResumeName = '';
  $('#editorWrap').classList.add('hidden');
  hideAIBuilder();
  $('#editor').classList.add('hidden');
  $('#addSectionCard').classList.add('hidden');
  $('#startArea').classList.remove('hidden');
  $('#fresherStart').classList.remove('hidden');
  resetProgress();
  renderRail();
  renderLivePreview();
  toast('Builder cleared — upload a CV or start fresh');
}
document.querySelectorAll('.js-refresh').forEach(b => b.addEventListener('click', ()=>{
  if(resumeIsEmpty()){ clearBuilder(); return; }
  $('#refreshModal').classList.add('open');
}));
$('#refSave').addEventListener('click', async ()=>{
  const before = currentResumeId;
  await saveCurrentResume();
  // only clear if the save actually happened (user didn't cancel the name prompt)
  if(currentResumeId || before){
    $('#refreshModal').classList.remove('open');
    clearBuilder();
  }
});
$('#refClear').addEventListener('click', ()=>{
  $('#refreshModal').classList.remove('open');
  clearBuilder();
});
$('#refCancel').addEventListener('click', ()=> $('#refreshModal').classList.remove('open'));

// Saved resumes: folder in sidebar / bar opens the saved-resumes window
document.querySelectorAll('.js-savedopen').forEach(b => b.addEventListener('click', ()=>{
  loadSavedList();
  $('#savedModal').classList.add('open');
}));

// Sections group expand / minimize — works in every sidebar
document.querySelectorAll('.js-railtoggle').forEach(btn => btn.addEventListener('click', ()=>{
  const railEl = btn.parentElement.querySelector('[data-rail]');
  if(!railEl) return;
  const open = railEl.style.display !== 'none';
  railEl.style.display = open ? 'none' : '';
  btn.querySelector('span').textContent = open ? '▸' : '▾';
}));

// ============================================================
// Account view — profile + delete-account flow
// ============================================================
async function openAccount(){
  if(!currentUser){ showView('login'); return; }
  showView('account');
  $('#acctName').textContent = currentUser.name || '(not set)';
  $('#acctEmail').textContent = currentUser.email;
  $('#acctSession').textContent = 'This session';
  // Refresh the saved-resume count
  try{
    const out = await api('/api/resumes');
    const n = (out.resumes || []).length;
    $('#acctResumeCount').textContent = n === 0 ? 'None yet' : n + (n === 1 ? ' saved resume' : ' saved resumes');
  }catch{
    $('#acctResumeCount').textContent = '—';
  }
}

// Clicking the header user pill opens the account view
$('#hdrUser').addEventListener('click', openAccount);
$('#acctBackHome').addEventListener('click', goHome);
$('#btnOpenDelete').addEventListener('click', ()=>{
  $('#delConfirm').value = '';
  $('#delPassword').value = '';
  $('#delErr').classList.remove('on');
  $('#btnConfirmDelete').disabled = true;
  $('#deleteModal').classList.add('open');
  setTimeout(()=> $('#delConfirm').focus(), 40);
});

// Enable the destructive button only when both fields are ready
function _updateDeleteReady(){
  const typed = $('#delConfirm').value.trim() === 'DELETE';
  const pw = $('#delPassword').value.length >= 1;
  $('#btnConfirmDelete').disabled = !(typed && pw);
}
$('#delConfirm').addEventListener('input', _updateDeleteReady);
$('#delPassword').addEventListener('input', _updateDeleteReady);
$('#delPassword').addEventListener('keydown', e => {
  if(e.key === 'Enter' && !$('#btnConfirmDelete').disabled) $('#btnConfirmDelete').click();
});

function _showDeleteError(msg){
  const e = $('#delErr');
  e.textContent = msg;
  e.classList.add('on');
}

$('#btnConfirmDelete').addEventListener('click', async ()=>{
  if($('#delConfirm').value.trim() !== 'DELETE'){
    return _showDeleteError('Please type DELETE (in capitals) to confirm.');
  }
  const password = $('#delPassword').value;
  if(!password) return _showDeleteError('Please enter your password.');

  const btn = $('#btnConfirmDelete');
  btn.disabled = true;
  const originalText = btn.textContent;
  btn.textContent = 'Deleting…';
  try{
    await api('/api/auth/delete-account', {
      method: 'POST',
      headers: {'Content-Type':'application/json'},
      body: JSON.stringify({ password })
    });
    // Fully reset the local state — session is now dead server-side
    currentUser = null;
    currentResumeId = null; currentResumeName = '';
    R = emptyResume();
    $('#hdrRight').style.display = 'none';
    $('#deleteModal').classList.remove('open');
    // Reset the UI so nothing from the old session lingers
    if($('#editorWrap')) $('#editorWrap').classList.add('hidden');
    if($('#editor')) $('#editor').classList.add('hidden');
    if($('#startArea')) $('#startArea').classList.remove('hidden');
    if($('#fresherStart')) $('#fresherStart').classList.remove('hidden');
    showView('landing');
    initLanding();
    toast('Your account has been permanently deleted.', 6000);
  }catch(err){
    btn.disabled = false;
    btn.textContent = originalText;
    const msg = String(err.message || '');
    if(/Incorrect password/i.test(msg)){
      _showDeleteError('Incorrect password — your account has NOT been deleted.');
    } else if(/rate|Too many/i.test(msg)){
      _showDeleteError('Too many attempts — please wait a few minutes and try again.');
    } else {
      _showDeleteError('Could not delete account: ' + (msg || 'unknown error') + '. Please try again or email hello@decompliance-uk.com for help.');
    }
  }
});

// ============================================================
// TAILOR FOR JOB — flagship feature
// Paste a JD → AI analysis → accept/reject changes → save as new resume
// ============================================================
let tailorResult = null;

function tlStep(n){
  for(let i=1;i<=4;i++){
    $('#tlPane'+i).classList.toggle('on', i===n);
    const s = document.querySelector('[data-tstep="'+i+'"]');
    s.classList.toggle('on', i===n);
    s.classList.toggle('done', i<n);
  }
}

function tlError(paneId, msg){
  const e = $(paneId);
  e.textContent = msg; e.classList.add('on');
  setTimeout(()=> e.classList.remove('on'), 8000);
}

document.querySelectorAll('.js-tailor').forEach(b => b.addEventListener('click', ()=>{
  if(resumeIsEmpty()) return toast('Import or open a resume first — then tailor it for a job.', 5000);
  tailorResult = null;
  $('#tlErr').classList.remove('on');
  $('#tlErr2').classList.remove('on');
  $('#tlResults').classList.add('hidden');
  $('#tlLoading').style.display = 'block';
  tlStep(1);
  $('#tailorModal').classList.add('open');
  setTimeout(()=> $('#tlJD').focus(), 40);
}));

$('#tlAnalyse').addEventListener('click', async ()=>{
  const jd = $('#tlJD').value.trim();
  if(jd.length < 80) return tlError('#tlErr', 'Please paste the full job description — at least a few sentences.');
  if(jd.length > 15000) return tlError('#tlErr', 'That is very long — please paste up to ~15,000 characters.');
  tlStep(2);
  $('#tlLoading').style.display = 'block';
  $('#tlResults').classList.add('hidden');
  try{
    const out = await api('/api/tailor', {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({
        jobTitle: $('#tlTitle').value.trim(),
        company: $('#tlCompany').value.trim(),
        jobDescription: jd,
        resume: R
      })
    });
    tailorResult = out.result;
    renderTailorResults();
  }catch(err){
    tlStep(1);
    tlError('#tlErr', err.message || 'Tailoring failed — please try again.');
  }
});

function renderTailorResults(){
  const r = tailorResult;
  $('#tlLoading').style.display = 'none';
  $('#tlResults').classList.remove('hidden');

  // Match ring
  const pct = r.match_score || 0;
  $('#tlScore').textContent = pct + '%';
  $('#tlRing').style.background = `conic-gradient(var(--accent) 0 ${pct}%, #E5E7EB ${pct}% 100%)`;
  const jt = $('#tlTitle').value.trim(), co = $('#tlCompany').value.trim();
  $('#tlMatchTitle').textContent = 'Your resume vs. ' + (jt || 'this job') + (co ? ' @ ' + co : '');
  $('#tlMatchSummary').textContent = r.match_summary || '';

  // Coverage chips
  const cov = $('#tlCoverage'); cov.innerHTML = '';
  (r.skills_coverage || []).forEach(s=>{
    const chip = el('span', {class:'sk ' + (s.status || 'partial')});
    chip.textContent = s.skill + (s.note ? ' — ' + s.note : '');
    cov.appendChild(chip);
  });

  // Change cards
  const list = $('#tlChanges'); list.innerHTML = '';
  (r.changes || []).forEach((c, i)=>{
    const card = el('div', {class:'diff-card' + (c.verified ? '' : ' rejected'), 'data-ci': String(i)});
    const whyClass = c.verified ? 'why' : 'why warn';
    const whyText = c.verified ? esc(c.reason || '') : '⚠ Only if truthful — you decide';
    card.innerHTML = `<div class="diff-head">
        <span class="where">${esc(c.where_label || 'Change')}</span>
        <span style="display:flex;gap:10px;align-items:center;flex-wrap:wrap">
          <span class="${whyClass}">${whyText}</span>
          <button class="tl-edit-btn" type="button">✎ Edit</button>
          <label class="switch"><input type="checkbox" ${c.verified ? 'checked' : ''}><span class="slider"></span><span class="sw-lbl">Apply</span></label>
        </span>
      </div>
      <div class="diff-body">
        ${c.old_text ? `<div class="d-old">${esc(c.old_text)}</div>` : ''}
        <div class="d-new">${esc(c.new_text)}</div>
        ${!c.verified ? `<div class="d-warn">⚠ Reeve can't verify this from your resume — it defaults to OFF. Only enable it if it's true.</div>` : ''}
      </div>`;
    card.querySelector('input').addEventListener('change', e=>{
      card.classList.toggle('rejected', !e.target.checked);
      updateTailorCount();
    });
    // ✎ Edit: swap the proposed text for a textarea; save writes back into the
    // change so the user's wording is what gets applied and previewed.
    // Array fields (skills, additions) edit as one item per line.
    card.querySelector('.tl-edit-btn').addEventListener('click', (e)=>{
      const btn = e.target;
      const body = card.querySelector('.diff-body');
      const dnew = body.querySelector('.d-new');
      const isArray = Array.isArray(c.apply.new_value);
      if(btn.textContent.includes('Edit')){
        const ta = el('textarea', {class:'tl-edit-ta'});
        ta.value = isArray ? c.apply.new_value.join('\n') : String(c.apply.new_value);
        dnew.style.display = 'none';
        dnew.after(ta);
        ta.focus();
        btn.textContent = '💾 Save edit';
      } else {
        const ta = body.querySelector('.tl-edit-ta');
        if(ta){
          if(isArray){
            const items = ta.value.split('\n').map(s=>s.trim()).filter(Boolean);
            if(items.length){ c.apply.new_value = items; c.new_text = items.join(' · '); }
          } else {
            const v = ta.value.trim();
            if(v){ c.apply.new_value = v; c.new_text = v; }
          }
          ta.remove();
        }
        dnew.textContent = c.new_text;
        dnew.style.display = '';
        btn.textContent = '✎ Edit';
      }
    });
    list.appendChild(card);
  });

  $('#tlChangeCount').textContent = (r.changes || []).length + ' proposed change' + ((r.changes||[]).length===1?'':'s');
  updateTailorCount();
}

function updateTailorCount(){
  const n = document.querySelectorAll('#tlChanges .diff-card input:checked').length;
  $('#tlApply').textContent = `Preview ${n} change${n===1?'':'s'} →`;
  $('#tlApply').disabled = n === 0;
}

$('#tlAcceptAll').addEventListener('click', ()=>{
  document.querySelectorAll('#tlChanges .diff-card').forEach((card, i)=>{
    const c = tailorResult.changes[i];
    const cb = card.querySelector('input');
    cb.checked = !!c.verified;            // accept-all only turns on VERIFIED ones
    card.classList.toggle('rejected', !cb.checked);
  });
  updateTailorCount();
});
$('#tlRejectAll').addEventListener('click', ()=>{
  document.querySelectorAll('#tlChanges .diff-card input').forEach(cb=>{
    cb.checked = false;
    cb.closest('.diff-card').classList.add('rejected');
  });
  updateTailorCount();
});
$('#tlBack').addEventListener('click', ()=> tlStep(1));

// Apply the accepted changes to a COPY of the resume, save it as a new record
function applyTailorChanges(base, changes, acceptedIdx){
  const r = JSON.parse(JSON.stringify(base));
  // replacements first, additions after (so adds append to final state)
  const order = ['summary','skills','experience_desc','summary_append','skills_add','accomplishments_add'];
  const sorted = acceptedIdx
    .map(i => changes[i])
    .sort((a,b)=> order.indexOf(a.apply.field) - order.indexOf(b.apply.field));
  sorted.forEach(c=>{
    const a = c.apply;
    if(a.field === 'summary' && typeof a.new_value === 'string') r.summary = a.new_value;
    else if(a.field === 'skills' && Array.isArray(a.new_value)) r.skills = a.new_value;
    else if(a.field === 'experience_desc' && typeof a.new_value === 'string' &&
            Number.isInteger(a.exp_index) && r.experience[a.exp_index])
      r.experience[a.exp_index].desc = a.new_value;
    else if(a.field === 'summary_append' && typeof a.new_value === 'string')
      r.summary = (r.summary ? r.summary + ' ' : '') + a.new_value;
    else if(a.field === 'skills_add' && Array.isArray(a.new_value))
      a.new_value.forEach(s => { if(!r.skills.includes(s)) r.skills.push(s); });
    else if(a.field === 'accomplishments_add' && Array.isArray(a.new_value))
      r.accomplishments.push(...a.new_value);
  });
  return r;
}

// Collect indexes of currently accepted change cards
function tlAcceptedIdx(){
  const accepted = [];
  document.querySelectorAll('#tlChanges .diff-card').forEach((card, i)=>{
    if(card.querySelector('input').checked) accepted.push(i);
  });
  return accepted;
}

// HL tokens survive esc() untouched (unicode, not HTML) and are swapped for
// <mark> AFTER rendering — the underlying data stays clean.
const HL_OPEN = '\u27E6HL\u27E7', HL_CLOSE = '\u27E6/HL\u27E7';

// Clone the accepted changes with highlight tokens wrapped around what changed:
// whole strings for rewrites, per-item for arrays; for full skills replacement
// only items that moved or are new get wrapped.
function tlHighlightChanges(changes, acceptedIdx, base){
  return changes.map((c, i)=>{
    if(!acceptedIdx.includes(i)) return c;
    const cc = JSON.parse(JSON.stringify(c));
    const a = cc.apply;
    if(typeof a.new_value === 'string'){
      a.new_value = HL_OPEN + a.new_value + HL_CLOSE;
    } else if(Array.isArray(a.new_value)){
      if(a.field === 'skills'){
        const baseSkills = base.skills || [];
        a.new_value = a.new_value.map((s, idx)=>
          (s !== baseSkills[idx]) ? HL_OPEN + s + HL_CLOSE : s);
      } else {
        a.new_value = a.new_value.map(s => HL_OPEN + s + HL_CLOSE);
      }
    }
    return cc;
  });
}

// STEP 2 → STEP 3: render the full tailored resume with highlights in an iframe
$('#tlApply').addEventListener('click', ()=>{
  const accepted = tlAcceptedIdx();
  if(!accepted.length) return;
  const hlChanges = tlHighlightChanges(tailorResult.changes, accepted, R);
  const hlR = applyTailorChanges(R, hlChanges, accepted);
  // temporarily point the renderer at the highlighted copy
  const saved = R;
  R = hlR;
  let html;
  try { html = resumeHTML(false); } finally { R = saved; }
  const markCSS = `mark.tl-hl{background:#FEF3C7;border-bottom:2px solid #E3B341;border-radius:2px;padding:0 2px;color:inherit}
mark.tl-hl::after{content:"\\25CF tailored";font-size:8px;font-weight:800;color:#B45309;margin-left:4px;vertical-align:2px}
body{zoom:.82}`;
  html = html
    .replace('</style>', markCSS + '</style>')
    .split(HL_OPEN).join('<mark class="tl-hl">')
    .split(HL_CLOSE).join('</mark>');
  $('#tlPreviewFrame').srcdoc = html;
  tlStep(3);
});

$('#tlPrevBack').addEventListener('click', ()=> tlStep(2));

// STEP 3 → STEP 4: save the CLEAN tailored resume (no tokens, no marks)
$('#tlPrevSave').addEventListener('click', async ()=>{
  const accepted = tlAcceptedIdx();
  if(!accepted.length) return;
  const btn = $('#tlPrevSave');
  btn.disabled = true;
  const orig = btn.textContent;
  btn.textContent = 'Saving…';
  try{
    const tailored = applyTailorChanges(R, tailorResult.changes, accepted);
    const jt = $('#tlTitle').value.trim(), co = $('#tlCompany').value.trim();
    const name = `${R.personal.name || 'CV'} — ${jt || 'Tailored'}${co ? ' @ ' + co : ''}`.slice(0, 80);
    const out = await api('/api/resumes', {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ name, template: selectedTemplate, data: tailored })
    });
    R = normalize(tailored);
    currentResumeId = out.id;
    currentResumeName = name;
    buildEditor();
    renderLivePreview();
    loadSavedList();
    $('#tlSavedTitle').textContent = accepted.length + ' change' + (accepted.length===1?'':'s') + ' applied';
    $('#tlSavedName').textContent = '📄 ' + name;
    tlStep(4);
    toast('Tailored resume saved and loaded — ready to download');
  }catch(err){
    tlError('#tlErr3', 'Could not save: ' + (err.message || 'unknown error'));
  }
  btn.disabled = false;
  btn.textContent = orig;
});

// ============================================================
// Landing page — wiring + animations (typewriter, count-up,
// scroll-reveal, timeline line, tailor demo). Runs once.
// ============================================================
let _ldDone = false;
function initLanding(){
  if(_ldDone) return;
  _ldDone = true;

  // nav + CTAs
  const go = (v)=>{ showView(v); };
  const si = document.getElementById('ldSignin');
  if(si) si.addEventListener('click', ()=> go('login'));
  document.querySelectorAll('[data-ldgo]').forEach(b =>
    b.addEventListener('click', ()=> go(b.dataset.ldgo)));
  const hb = document.getElementById('ldHowBtn');
  if(hb) hb.addEventListener('click', ()=>{
    const t = document.getElementById('ld-how');
    if(t && t.scrollIntoView) t.scrollIntoView({behavior:'smooth'});
  });

  // Option B: typewriter rotating pitches
  const LD_LINES = [
    'Upload your old CV — AI does the rest.',
    'Tailored to every job you apply for.',
    'Truth-first: AI never invents your experience.',
    'Recruiter-ready PDF in one sitting.'
  ];
  const typer = document.getElementById('ldTyper');
  if(typer){
    let li=0, ci=0, del=false;
    (function type(){
      const line = LD_LINES[li];
      typer.textContent = line.slice(0, ci);
      if(!del && ci < line.length){ ci++; setTimeout(type, 42); }
      else if(!del){ del=true; setTimeout(type, 1600); }
      else if(ci > 0){ ci--; setTimeout(type, 16); }
      else { del=false; li=(li+1)%LD_LINES.length; setTimeout(type, 350); }
    })();
  }

  // Option C: count-up stats
  document.querySelectorAll('[data-ldcount]').forEach(el=>{
    const target = +el.dataset.ldcount, suf = el.dataset.ldsuffix || '';
    let cur = 0; const step = Math.max(1, Math.round(target/40));
    const iv = setInterval(()=>{
      cur = Math.min(target, cur + step);
      el.textContent = cur + suf;
      if(cur >= target) clearInterval(iv);
    }, 34);
  });

  // Rolling template formats (duplicated for a seamless loop)
  const FORMATS = [
    {f:'classic', n:'Classic', c:'#1E3A8A'},
    {f:'banner',  n:'Banner',  c:'#0FA968'},
    {f:'sidebar', n:'Sidebar', c:'#6D3A6E'},
    {f:'duo',     n:'Duo Column', c:'#0284C7'},
    {f:'exec',    n:'Executive Serif', c:'#8E1F38'},
    {f:'mono',    n:'Monoline', c:'#3A4756'},
    {f:'banner',  n:'Banner Slate', c:'#334155'},
    {f:'sidebar', n:'Sidebar Forest', c:'#2F6B4F'}
  ];
  const rollEl = document.getElementById('ldtRoll');
  if(rollEl){
    const L = (w)=>`<div class="ldt-l"${w?` style="width:${w}"`:''}></div>`;
    const H = (c,w)=>`<div class="ldt-h" style="background:${c};width:${w}"></div>`;
    const card = (t)=>{
      const d = document.createElement('div');
      d.className = 'ldt-tpl ' + t.f;
      d.style.setProperty('--tc', t.c);
      let inner = '';
      if(t.f === 'banner'){
        inner = `<div class="bhead"><div class="ldt-nm"></div>${L('46%')}</div>
          <div class="body">${H(t.c,'36%')}${L()}${L('86%')}${L('70%')}${H(t.c,'30%')}${L('90%')}${L('74%')}${L('60%')}</div>`;
      } else if(t.f === 'sidebar'){
        inner = `<div class="side"><div class="ldt-nm"></div>${L('80%')}${L('64%')}${L('72%')}${L('58%')}</div>
          <div class="body">${H(t.c,'46%')}${L()}${L('84%')}${L('68%')}${H(t.c,'38%')}${L('88%')}${L('72%')}</div>`;
      } else if(t.f === 'duo'){
        inner = `<div class="body"><div class="ldt-nm" style="background:${t.c}"></div>${L('42%')}
          <div class="ldt-duo" style="margin-top:9px">
            <div>${H(t.c,'100%')}${L()}${L('84%')}${L('66%')}</div>
            <div>${H(t.c,'100%')}${L()}${L('78%')}${L('88%')}</div>
          </div>${H(t.c,'32%')}${L('92%')}${L('70%')}</div>`;
      } else if(t.f === 'exec'){
        inner = `<div class="body"><div class="ldt-nm" style="background:${t.c};width:52%"></div><div class="rule"></div>
          ${L('64%')}${L('52%')}<div class="rule"></div>${L('82%')}${L('88%')}${L('70%')}<div class="rule"></div>${L('78%')}${L('60%')}</div>`;
      } else if(t.f === 'mono'){
        inner = `<div class="toprule"></div><div class="body"><div class="ldt-nm" style="background:#1A2434"></div>${L('44%')}
          ${H(t.c,'34%')}${L()}${L('82%')}${H(t.c,'28%')}${L('88%')}${L('72%')}${L('58%')}</div>`;
      } else {
        inner = `<div class="body"><div class="ldt-nm" style="background:${t.c}"></div>${L('46%')}
          ${H(t.c,'40%')}${L()}${L('86%')}${L('70%')}${H(t.c,'34%')}${L('90%')}${L('76%')}${L('62%')}</div>`;
      }
      d.innerHTML = inner + `<div class="ldt-lbl">${t.n}</div>`;
      return d;
    };
    [...FORMATS, ...FORMATS].forEach(t => rollEl.appendChild(card(t)));
  }

  // Builder-peek demo: cursor timeline with live centre→preview sync.
  // Starts on first visibility and loops forever.
  const ldpApp = document.getElementById('ldpApp');
  if(ldpApp){
    const sleep = ms => new Promise(r=>setTimeout(r, ms));
    const cur = document.getElementById('ldpCur');
    const moveCur = (el, dx=0, dy=4)=>{
      if(!el || !cur) return;
      const a = ldpApp.getBoundingClientRect(), b = el.getBoundingClientRect();
      cur.style.left = (b.left - a.left + b.width/2 + dx) + 'px';
      cur.style.top  = (b.top - a.top + b.height/2 + dy) + 'px';
    };
    const clickFx = ()=>{ if(!cur) return; cur.classList.remove('click'); void cur.offsetWidth; cur.classList.add('click'); };
    const setScene = (n)=>{
      document.querySelectorAll('.ldp-scene').forEach(s=>s.classList.toggle('on', +s.dataset.s === n));
      document.querySelectorAll('.ldp-step').forEach(s=>s.classList.toggle('on', +s.dataset.s === n));
    };
    const LDP_TEXT = 'Led a major platform migration, delivered two weeks early.';
    async function typeSync(){
      const t = document.getElementById('ldpType'), p = document.getElementById('ldpPrevType');
      if(!t || !p) return;
      t.innerHTML = '<span class="tc"></span>'; p.textContent = '';
      for(let i=0;i<LDP_TEXT.length;i++){
        t.innerHTML = LDP_TEXT.slice(0,i+1) + '<span class="tc"></span>';
        p.textContent = LDP_TEXT.slice(0,i+1);
        if(i % 9 === 0 && p.parentElement){
          p.parentElement.classList.remove('ldp-flash'); void p.offsetWidth; p.parentElement.classList.add('ldp-flash');
        }
        await sleep(34);
      }
    }
    let ldpStarted = false;
    async function demoLoop(){
      const doc = document.getElementById('ldpDoc'), mark = document.getElementById('ldpMark');
      const up = document.getElementById('ldpUp'), tailor = document.getElementById('ldpTailor'), dl = document.getElementById('ldpDl');
      const tog = document.getElementById('ldpTog'), pExp = document.getElementById('ldpPrevExp'), pType = document.getElementById('ldpPrevType');
      while(true){
        doc.classList.remove('fill'); mark.classList.remove('on');
        tailor.classList.remove('glow'); dl.classList.remove('glow');
        tog.classList.add('on'); pExp.classList.remove('off');
        setScene(1);
        moveCur(up); await sleep(1100); clickFx(); await sleep(2600);
        setScene(2); doc.classList.add('fill'); await sleep(300);
        moveCur(document.getElementById('ldpType'), -30, 0); await sleep(1100); clickFx(); await sleep(400);
        await typeSync(); await sleep(700);
        moveCur(tog, 0, 2); await sleep(1100); clickFx();
        tog.classList.remove('on'); pExp.classList.add('off'); await sleep(1300);
        clickFx(); tog.classList.add('on'); pExp.classList.remove('off'); await sleep(1100);
        moveCur(tailor); await sleep(1100); clickFx(); tailor.classList.add('glow');
        setScene(3); await sleep(1500);
        pType.innerHTML = 'Led a major platform migration, <span class="hl">delivered two weeks early</span>.';
        mark.classList.add('on'); await sleep(2200);
        tailor.classList.remove('glow');
        moveCur(dl); await sleep(1100); clickFx(); dl.classList.add('glow');
        setScene(4); await sleep(2600);
      }
    }
    const startDemo = ()=>{
      if(ldpStarted) return;
      ldpStarted = true;
      setScene(1);
      moveCur(document.getElementById('ldpUp'));
      demoLoop();
    };
    if(typeof IntersectionObserver !== 'undefined'){
      const dio = new IntersectionObserver(es=>{
        es.forEach(e=>{ if(e.isIntersecting){ startDemo(); dio.unobserve(e.target); } });
      }, {threshold:.25});
      dio.observe(ldpApp);
    } else startDemo();
  }

  // Tailor peek demo: cursor pastes a JD, tailors, reviews & accepts changes,
  // score ring climbs 42→82, apply. Starts on first visibility, loops forever.
  const ldt2Stage = document.getElementById('ldt2Stage');
  if(ldt2Stage){
    const sleep = ms => new Promise(r=>setTimeout(r, ms));
    const cur = document.getElementById('ldt2Cur');
    const g = id => document.getElementById(id);
    const JD_TEXT = 'Program Manager \u2014 GRC & Risk Transformation. Requires stakeholder leadership, ISO 27001, audit & C-level reporting\u2026';
    const moveCur = (el, dx=0, dy=4)=>{
      if(!el || !cur) return;
      const a = ldt2Stage.getBoundingClientRect(), b = el.getBoundingClientRect();
      cur.style.left = (b.left - a.left + b.width/2 + dx) + 'px';
      cur.style.top  = (b.top - a.top + b.height/2 + dy) + 'px';
    };
    const clickFx = ()=>{ if(!cur) return; cur.classList.remove('click'); void cur.offsetWidth; cur.classList.add('click'); };
    const press = el => { el.classList.add('pressed'); setTimeout(()=>el.classList.remove('pressed'), 250); };
    async function typeJD(){
      g('ldt2Ph').style.display = 'none';
      g('ldt2Caret').style.display = 'inline-block';
      const t = g('ldt2Typed'); t.textContent = '';
      for(let i=0;i<JD_TEXT.length;i+=3){ t.textContent = JD_TEXT.slice(0,i+3); await sleep(22); }
      g('ldt2Caret').style.display = 'none';
    }
    async function climbScore(from, to){
      const arc = g('ldt2Arc'), val = g('ldt2Val'), C = 195;
      for(let v=from; v<=to; v++){
        val.textContent = v + '%';
        arc.style.strokeDashoffset = C - (C * v/100);
        await sleep(26);
      }
    }
    function resetT(){
      g('ldt2Ph').style.display=''; g('ldt2Typed').textContent=''; g('ldt2Caret').style.display='none';
      g('ldt2An').classList.remove('on');
      ['ldt2Old1','ldt2New1','ldt2New2'].forEach(id=>g(id).classList.remove('show','accepted','selecting'));
      g('ldt2Score').classList.remove('show'); g('ldt2ApplyBar').classList.remove('show'); g('ldt2Done').classList.remove('show');
      g('ldt2Arc').style.strokeDashoffset = 195; g('ldt2Val').textContent = '60%';
      g('ldt2Rev1').style.display=''; g('ldt2Rev2').style.display='';
      if(cur){ cur.style.left='60px'; cur.style.top='70px'; }
    }
    async function tLoop(){
      while(true){
        resetT();
        g('ldt2Tag').textContent = '1 \u00b7 Paste the job';
        await sleep(900);
        moveCur(g('ldt2Jd'), -40, -6); await sleep(1200); clickFx();
        await typeJD();
        await sleep(350);

        g('ldt2Tag').textContent = '2 \u00b7 One click';
        moveCur(g('ldt2Btn')); await sleep(1200); clickFx(); press(g('ldt2Btn'));
        g('ldt2An').classList.add('on');
        await sleep(1900);
        g('ldt2An').classList.remove('on');

        g('ldt2Tag').textContent = '3 \u00b7 See every change';
        g('ldt2Old1').classList.add('show'); await sleep(500);
        g('ldt2New1').classList.add('show'); await sleep(500);
        g('ldt2New2').classList.add('show');
        await sleep(700);

        // cursor sweeps across the replaceable red line to 'select' it
        g('ldt2Tag').textContent = '4 \u00b7 Spot what\u2019s replaceable';
        moveCur(g('ldt2Old1'), -120, 0); await sleep(1000);
        g('ldt2Old1').classList.add('selecting');
        moveCur(g('ldt2Old1'), 150, 0); await sleep(1100);
        await sleep(500);
        g('ldt2Old1').classList.remove('selecting');

        g('ldt2Tag').textContent = '5 \u00b7 You approve each edit';
        moveCur(g('ldt2Acc1')); await sleep(1200); clickFx(); press(g('ldt2Acc1')); await sleep(240);
        g('ldt2New1').classList.add('accepted'); g('ldt2Rev1').style.display='none';
        await sleep(600);
        moveCur(g('ldt2Acc2')); await sleep(1100); clickFx(); press(g('ldt2Acc2')); await sleep(240);
        g('ldt2New2').classList.add('accepted'); g('ldt2Rev2').style.display='none';
        await sleep(500);

        g('ldt2Tag').textContent = '6 \u00b7 Match score climbs';
        g('ldt2Score').classList.add('show');
        await climbScore(60, 95);
        await sleep(700);

        g('ldt2Tag').textContent = '7 \u00b7 Apply';
        g('ldt2ApplyBar').classList.add('show');
        moveCur(g('ldt2Apply')); await sleep(1200); clickFx(); press(g('ldt2Apply')); await sleep(260);
        g('ldt2Done').classList.add('show');
        await sleep(2600);
      }
    }
    const startT = ()=>{ resetT(); tLoop(); };
    if(typeof IntersectionObserver !== 'undefined'){
      const tio = new IntersectionObserver(es=>{
        es.forEach(e=>{ if(e.isIntersecting){ startT(); tio.unobserve(e.target); } });
      }, {threshold:.25});
      tio.observe(ldt2Stage);
    } else startT();
  }

  // Options D+E+G: scroll-triggered reveal, timeline line, tailor demo
  if(typeof IntersectionObserver !== 'undefined'){
    const io = new IntersectionObserver(entries=>{
      entries.forEach(e=>{
        if(!e.isIntersecting) return;
        const el = e.target;
        if(el.id === 'ldTimeline'){
          el.classList.add('play');
          [...el.querySelectorAll('.ld-tstep')].forEach((k,i)=>
            setTimeout(()=> k.classList.add('reveal'), i*160));
        } else if(el.id === 'ldTdemo'){
          el.classList.add('play');
        } else if(el.classList.contains('ld-fgrid')){
          [...el.querySelectorAll('.ld-fcard')].forEach((k,i)=>
            setTimeout(()=> k.classList.add('reveal'), i*120));
        }
        io.unobserve(el);
      });
    }, {threshold:.2});
    ['ldTimeline','ldTdemo'].forEach(id=>{
      const el = document.getElementById(id); if(el) io.observe(el);
    });
    const fg = document.querySelector('.ld-fgrid'); if(fg) io.observe(fg);
  } else {
    // very old browsers: just show everything
    document.querySelectorAll('.ld-tstep,.ld-fcard').forEach(el=>el.classList.add('reveal'));
    const tl = document.getElementById('ldTimeline'); if(tl) tl.classList.add('play');
    const td = document.getElementById('ldTdemo'); if(td) td.classList.add('play');
  }
}

// ---- session check on load ----
(async ()=>{
  try{
    const out = await api('/api/auth/me');
    setUser(out.user);
  }catch{ showView('landing'); initLanding(); }
})();

// Initial rail (nothing detected yet)
renderRail();

// ====== AI BUILDER FUNCTIONS ======
// Show the AI builder bar when editor is active
function showAIBuilder(){
  // The bar is re-parented under the quality dashboard by buildEditor();
  // this only fills the suggestion chips.
  populateAIChips();
}

function hideAIBuilder(){
  var bar = document.getElementById('aiBuilderBar');
  if(bar) bar.classList.add('hidden');
}

function populateAIChips(){
  var chips = document.getElementById('aiBuilderChips');
  if(!chips) return;
  chips.innerHTML = [
    {text:'🔧 Fix all issues', cmd:'Fix all quality issues'},
    {text:'+ Add skill', cmd:'Add Python and Docker to my skills'},
    {text:'− Delete job', cmd:'Delete my last work experience'},
    {text:'+ Add certification', cmd:'Add AWS certification from AWS, June 2024'}
  ].map(c => '<span class="ai-chip" style="background:rgba(255,255,255,.8);border:1px solid rgba(11,74,49,.2);border-radius:20px;padding:5px 12px;font-size:10px;font-weight:600;color:#0B4A31;cursor:pointer;transition:all .15s" onclick="setAICommand(\''+c.cmd.replace(/'/g,"\\'")+'\')" onmouseover="this.style.background=\'#fff\';this.style.borderColor=\'#0FA968\';this.style.transform=\'translateY(-1px)\';" onmouseout="this.style.background=\'rgba(255,255,255,.8)\';this.style.borderColor=\'rgba(11,74,49,.2)\';this.style.transform=\'translateY(0)\'">'+c.text+'</span>').join('');
}

function setAICommand(cmd){
  document.getElementById('aiBuilderInput').value = cmd;
  document.getElementById('aiBuilderInput').focus();
}

function runAIBuilder(){
  var inputEl=document.getElementById('aiBuilderInput');
  var input=(inputEl.value||'').trim();
  if(!input){ inputEl.focus(); return; }

  var btn=document.getElementById('aiBuilderBtn');
  btn.disabled=true; btn.textContent='\u23F3 Working\u2026';

  var prog=document.getElementById('aiBuilderProgress');
  prog.classList.remove('hidden'); prog.style.display='block';
  document.getElementById('aiProgSpinner').style.display='';
  document.getElementById('aiProgTitle').textContent='Reading your resume\u2026';
  document.getElementById('aiProgFill').style.width='4%';
  document.getElementById('aiProgSections').innerHTML='';

  // Snapshot issue counts by type, so the log reports only what actually changed
  var _pre=(analyzeQualityScore().errors||[]);
  window._aiBefore=_pre.length;
  window._aiBeforeByType={
    vocab:_pre.filter(function(e){return e.type==='vocab';}).length,
    grammar:_pre.filter(function(e){return e.type==='grammar';}).length,
    context:_pre.filter(function(e){return e.type==='context';}).length
  };

  fetch('/api/ai-builder',{
    method:'POST',headers:{'Content-Type':'application/json'},
    body:JSON.stringify({command:input,resume:R})
  })
  .then(function(r){return r.json();})
  .then(function(data){
    if(!data.success) throw new Error(data.error||'Builder failed');
    if(!data.units || !data.units.length){
      document.getElementById('aiProgSpinner').style.display='none';
      document.getElementById('aiProgTitle').textContent =
        data.note==='no-fix-intent'
          ? '\u2139 Try: "fix all issues", "fix grammar in summary", "fix vocabulary in experience"'
          : '\u2139 Nothing to fix for that request.';
      btn.disabled=false; btn.textContent='Run';
      return;
    }
    applyAIUnits(data.units, data.placeholders||0);
  })
  .catch(function(err){
    console.error('AI Builder error:',err);
    document.getElementById('aiProgSpinner').style.display='none';
    document.getElementById('aiProgTitle').textContent='\u2717 '+(err.message||'Something went wrong \u2014 try again');
    btn.disabled=false; btn.textContent='Run';
  });
}

// Write one unit back into R, preserving the exact data shape
function writeAIUnit(u){
  if(u.section==='summary'){ R.summary=u.fixed; return true; }
  if(u.section==='experience'){
    if(R.experience && R.experience[u.index]){ R.experience[u.index].desc=u.fixed; return true; }
    return false;
  }
  if(u.section==='skills'){
    var sk=u.fixed.split(/\n|,/).map(function(s){return s.trim();}).filter(Boolean);
    if(sk.length){ R.skills=sk; return true; }
    return false;
  }
  if(u.section==='accomplishments'){
    var ac=u.fixed.split(/\n/).map(function(s){return s.trim();}).filter(Boolean);
    if(ac.length){ R.accomplishments=ac; return true; }
    return false;
  }
  return false;
}

function applyAIUnits(units, placeholders){
  var fill=document.getElementById('aiProgFill');
  var title=document.getElementById('aiProgTitle');
  var log=document.getElementById('aiProgSections');

  title.textContent='Working through your resume\u2026';
  log.className='ai-prog-log';
  log.innerHTML='';

  var applied=0, skipped=0;

  function logLine(html, busy){
    var d=document.createElement('div');
    d.className='ai-pl'+(busy?' busy':'');
    d.innerHTML='<span class="ic">'+(busy?'!':'\u2713')+'</span><span>'+html+'</span>';
    log.appendChild(d);
    requestAnimationFrame(function(){ d.classList.add('in'); });
  }

  units.forEach(function(u,idx){
    setTimeout(function(){
      fill.style.width=(((idx+1)/units.length)*88)+'%';
      if(u.unchanged || !u.fixed){ skipped++; }
      else if(writeAIUnit(u)){ applied++; }
      else { skipped++; }

      R.quality_score = analyzeQualityScore();
      refreshQualityDashboard();
      renderRail();
      if(typeof schedulePreview==='function') schedulePreview();
    }, 600*idx + 200);
  });

  setTimeout(function(){
    fill.style.width='100%';
    document.getElementById('aiProgSpinner').style.display='none';

    var scrollY=window.scrollY;
    buildEditor();
    window.scrollTo(0,scrollY);

    // Report by what ACTUALLY changed, category by category
    var after = (R.quality_score && R.quality_score.errors) ? R.quality_score.errors : [];
    var before = window._aiBeforeByType || {vocab:0,grammar:0,context:0};
    var afterBy = {
      vocab:   after.filter(function(e){return e.type==='vocab';}).length,
      grammar: after.filter(function(e){return e.type==='grammar';}).length,
      context: after.filter(function(e){return e.type==='context';}).length
    };

    var LABEL={vocab:'vocabulary',grammar:'grammar &amp; punctuation',context:'context'};
    var WORD ={vocab:'weak phrase',grammar:'grammar issue',context:'line'};
    var total=0;
    ['grammar','vocab'].forEach(function(t){
      var n=before[t]-afterBy[t];
      if(n>0){ total+=n; logLine('Fixed <b>'+LABEL[t]+'</b> \u2014 '+n+' '+WORD[t]+(n>1?'s':'')+' corrected'); }
    });
    var cFixed = before.context - afterBy.context;
    if(cFixed>0){ total+=cFixed; logLine('Fixed <b>context</b> \u2014 '+cFixed+' line'+(cFixed>1?'s':'')+' now carry real metrics'); }
    if(afterBy.context>0){
      logLine('Reviewed <b>context</b> \u2014 '+afterBy.context+' line'+(afterBy.context>1?'s':'')
        +' still need your real numbers', true);
    }
    if(skipped>0) logLine(skipped+' section'+(skipped>1?'s were':' was')+' left unchanged');
    if(total===0 && afterBy.context===0 && skipped===0) logLine('Nothing needed changing \u2014 your resume is already clean');

    title.innerHTML = total>0
      ? '\u2713 Complete \u2014 '+total+' fix'+(total>1?'es':'')+' applied'
        + (afterBy.context? ', '+afterBy.context+' line'+(afterBy.context>1?'s':'')+' awaiting your numbers' : '')
      : (afterBy.context
          ? '\u2713 Complete \u2014 text improved, '+afterBy.context+' line'+(afterBy.context>1?'s':'')+' awaiting your numbers'
          : '\u2713 Complete');

    var note=document.getElementById('aiPlaceholderNote');
    if(note){
      note.innerHTML = placeholders
        ? '\u26A0\uFE0F <b>'+placeholders+' metric placeholder'+(placeholders===1?'':'s')+'</b> were inserted as <b>[X]</b> / <b>[Y]</b>. The AI cannot know your real numbers \u2014 replace every bracket before you export. Those lines stay flagged until you do.'
        : 'No metric placeholders were inserted.';
    }

    setTimeout(function(){ document.getElementById('aiVerifyModal').classList.add('show'); }, 500);
    var btn=document.getElementById('aiBuilderBtn');
    btn.disabled=false; btn.textContent='Run';
  }, 600*units.length + 700);
}

function dismissAIModal(){
  document.getElementById('aiVerifyModal').classList.remove('show');
  document.getElementById('aiBuilderInput').value = '';
  var btn = document.getElementById('aiBuilderBtn');
  btn.disabled = false;
  btn.textContent = 'Run';
}

function confirmAIChanges(){
  document.getElementById('aiVerifyModal').classList.remove('show');
  
  // Trigger save
  if(typeof saveResume === 'function') saveResume();
  
  // Show toast
  var toast = document.getElementById('aiDoneToast');
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 3000);
  
  // Reset
  document.getElementById('aiBuilderInput').value = '';
  var btn = document.getElementById('aiBuilderBtn');
  btn.disabled = false;
  btn.textContent = 'Run';
  
  // Refresh preview
  if(typeof renderLivePreview === 'function') renderLivePreview();
}


// ====== ASK AI — per-section popover ======
// Sections whose text we can safely read and write back as a block.
var ASKABLE = new Set(['summary','skills','experience','accomplishments','certifications','education','projects','courses','languages']);

var ASK_LABEL = {
  summary:'Profile / Summary', skills:'Skills', experience:'Experience',
  accomplishments:'Accomplishments', certifications:'Certifications',
  education:'Education', projects:'Projects', courses:'Courses', languages:'Languages'
};
var ASK_HINTS = {
  summary:['Make it two sentences','Lead with AI governance','Remove the first person'],
  skills:['Group these by theme','Add Python and Docker','Drop the weakest three'],
  experience:['Stronger, more senior tone','Make each line shorter','Add metric placeholders'],
  accomplishments:['Make these outcome-focused','Add metric placeholders'],
  certifications:['Order by seniority','Spell out the acronyms'],
  education:['Shorten to one line each'],
  projects:['Lead with the outcome'], courses:['Group by subject'], languages:['Add proficiency levels']
};

// Read a section as plain text
function askReadSection(key){
  if(key==='summary') return R.summary||'';
  if(key==='skills') return (R.skills||[]).join('\n');
  if(key==='accomplishments') return (R.accomplishments||[]).join('\n');
  if(key==='experience'){
    return (R.experience||[]).map(function(j,i){
      return '['+(i+1)+'] '+(j.title||'')+(j.company?' — '+j.company:'')+'\n'+(j.desc||'');
    }).join('\n\n');
  }
  var arr=R[key];
  if(Array.isArray(arr)){
    return arr.map(function(it){
      if(typeof it==='string') return it;
      return [it.name,it.title,it.issuer,it.school,it.degree,it.year,it.desc]
        .filter(Boolean).join(' — ');
    }).join('\n');
  }
  return '';
}

// Write a section back, preserving array shapes. Returns false if unsafe.
function askWriteSection(key, text){
  var t=(text||'').trim();
  if(!t) return false;

  if(key==='summary'){ R.summary=t; return true; }

  if(key==='skills'){
    var sk=t.split(/\n|,/).map(function(s){return s.trim();}).filter(Boolean);
    if(!sk.length) return false;
    R.skills=sk; return true;
  }

  if(key==='accomplishments'){
    var ac=t.split(/\n/).map(function(s){return s.trim();}).filter(Boolean);
    if(!ac.length) return false;
    R.accomplishments=ac; return true;
  }

  if(key==='experience'){
    // Split on the [n] markers we emitted; only the desc of each job is replaced,
    // so title/company/dates/skills_used are never touched.
    var blocks=t.split(/\n(?=\[\d+\]\s)/);
    var wrote=0;
    blocks.forEach(function(b){
      var m=b.match(/^\[(\d+)\]/);
      if(!m) return;
      var idx=parseInt(m[1],10)-1;
      if(!R.experience || !R.experience[idx]) return;
      var lines=b.split('\n');
      lines.shift();                       // drop the "[n] Title — Company" header line
      var desc=lines.join('\n').trim();
      if(desc){ R.experience[idx].desc=desc; wrote++; }
    });
    return wrote>0;
  }

  // Generic list sections: only accept if the model kept it as a list of lines
  var arr=R[key];
  if(Array.isArray(arr)){
    var lines=t.split(/\n/).map(function(s){return s.trim();}).filter(Boolean);
    if(!lines.length) return false;
    if(arr.length && typeof arr[0]!=='string') return false;  // object rows: too risky to rebuild
    R[key]=lines; return true;
  }
  return false;
}

// ---- popover ----
// A spec is {key,label,scopeNote,hints,read,write}. Section headers build one
// from the section key; per-role blocks pass their own read/write closures.
var _askPop=null, _askSpec=null, _askBtn=null, _askAI='', _askPos=null;
var _askMarks={};   // key -> {type:'new'|'edited', idx:[], anchor:int|null}

function sectionAskSpec(key){
  return {
    key:key,
    label:(ASK_LABEL[key]||key),
    scopeNote:'Changes apply to this section only.',
    hints:(ASK_HINTS[key]||[]),
    read:function(){ return askReadSection(key); },
    write:function(v){ return askWriteSection(key, v); },
    section:true
  };
}

function buildAskPop(){
  if(_askPop) return _askPop;
  var p=el('div',{class:'ask-pop',id:'askPop'});
  p.innerHTML =
    '<span class="ask-arrow"></span>'
    +'<div class="ask-pop-h">\u2726 Ask AI <span class="ask-scope"></span>'
      +'<span class="ask-x" title="Close">\u2715</span></div>'
    +'<div class="ask-sub"></div>'
    +'<textarea class="ask-in" placeholder="Ask for a change, or type a line to insert\u2026"></textarea>'
    +'<div class="ask-kbd"><b>Enter</b> to ask AI \u00b7 <b>Shift+Enter</b> new line \u00b7 <b>Esc</b> to close</div>'
    +'<div class="ask-hints"></div>'
    +'<div class="ask-row">'
      +'<button class="ask-go" type="button">\u2726 Ask AI</button>'
      +'<button class="ask-ins" type="button">\u21b3 Insert this line</button>'
    +'</div>'
    +'<div class="ask-think"><span class="ask-sp"></span> Thinking\u2026</div>'
    +'<div class="ask-err"></div>'
    +'<div class="ask-res">'
      +'<div class="ask-res-h">AI response <span class="ask-pill">editable</span></div>'
      +'<textarea class="ask-out"></textarea>'
      +'<div class="ask-meta"><span class="ask-ph"></span><span class="ask-dirty"></span></div>'
      +'<div class="ask-acts">'
        +'<button class="ask-apply" type="button">\u2713 Apply to section</button>'
        +'<button class="ask-again" type="button">\u21bb Ask again</button>'
      +'</div>'
    +'</div>'
    +'<div class="ask-insbox">'
      +'<div class="ask-ins-h">Where should this line go?</div>'
      +'<div class="ask-ins-sub"></div>'
      +'<div class="ask-lines"></div>'
      +'<div class="ask-ins-foot">'
        +'<span class="ask-posnote">No position chosen</span>'
        +'<button class="ask-do-ins" type="button" disabled>\u21b3 Insert here</button>'
        +'<button class="ask-cancel-ins" type="button">\u2715 Cancel</button>'
      +'</div>'
    +'</div>';
  document.body.appendChild(p);
  _askPop=p;

  var input=p.querySelector('.ask-in'), out=p.querySelector('.ask-out');
  p.querySelector('.ask-x').addEventListener('click', closeAskPop);
  p.addEventListener('mousedown', function(e){ e.stopPropagation(); });
  input.addEventListener('keydown', function(e){
    if(e.key==='Enter' && !e.shiftKey){ e.preventDefault(); runAsk(); }
  });
  out.addEventListener('input', function(){ askAutosize(); askMeta(); });
  p.querySelector('.ask-go').addEventListener('click', runAsk);
  p.querySelector('.ask-ins').addEventListener('click', openInsertPicker);
  p.querySelector('.ask-again').addEventListener('click', function(){
    p.querySelector('.ask-res').classList.remove('show'); input.focus(); input.select();
  });
  p.querySelector('.ask-apply').addEventListener('click', applyAsk);
  p.querySelector('.ask-do-ins').addEventListener('click', doInsertLine);
  p.querySelector('.ask-cancel-ins').addEventListener('click', function(){
    p.querySelector('.ask-insbox').classList.remove('show');
  });
  return p;
}

function toggleAskPop(btn, spec){
  if(typeof spec==='string') spec=sectionAskSpec(spec);
  if(_askSpec && _askSpec.key===spec.key && _askPop && _askPop.classList.contains('show')) return closeAskPop();
  openAskPop(btn, spec);
}

function openAskPop(btn, spec){
  closeAskPop();
  var p=buildAskPop();
  _askSpec=spec; _askBtn=btn; _askAI=''; _askPos=null;
  btn.classList.add('open');
  // a fresh action supersedes the previous marker on this block
  if(_askMarks[spec.key]){ delete _askMarks[spec.key]; }

  p.querySelector('.ask-scope').textContent='\u00b7 '+spec.label;
  p.querySelector('.ask-sub').textContent=spec.scopeNote||'Changes apply to this section only.';
  p.querySelector('.ask-hints').innerHTML=(spec.hints||[]).map(function(h){
    return '<span class="ask-h">'+esc(h)+'</span>';
  }).join('');
  p.querySelectorAll('.ask-h').forEach(function(h){
    h.addEventListener('click', function(){
      var i=p.querySelector('.ask-in'); i.value=h.textContent; i.focus();
    });
  });

  // Insert only makes sense for a single block, not a whole multi-entry section
  p.querySelector('.ask-ins').style.display = spec.section && spec.key==='experience' ? 'none' : '';

  p.querySelector('.ask-in').value='';
  p.querySelector('.ask-res').classList.remove('show');
  p.querySelector('.ask-insbox').classList.remove('show');
  p.querySelector('.ask-think').classList.remove('show');
  p.querySelector('.ask-err').classList.remove('show');
  p.classList.add('show');
  positionAskPop(btn);
  setTimeout(function(){ p.querySelector('.ask-in').focus(); }, 40);
}

// The popover is position:fixed, so it works in viewport coordinates only.
// Anything else breaks the moment the editor scrolls inside its own container
// rather than the window scrolling.
function positionAskPop(btn){
  if(!_askPop||!btn||!_askPop.classList.contains('show')) return;
  var r=btn.getBoundingClientRect();

  // If the anchor has scrolled out of its scroll container, hide rather than
  // leave the popover pointing at nothing.
  var holder = btn.closest('#editorWrap, .app-main, main') || null;
  if(holder){
    var h=holder.getBoundingClientRect();
    var visible = r.bottom > h.top + 4 && r.top < h.bottom - 4;
    _askPop.style.visibility = visible ? 'visible' : 'hidden';
    if(!visible) return;
  } else {
    _askPop.style.visibility='visible';
  }

  var w=_askPop.offsetWidth||400, ht=_askPop.offsetHeight||260, gap=10;
  var left=r.right-w;
  left=Math.max(10, Math.min(left, window.innerWidth-w-14));

  var top=r.bottom+gap, flip=false;
  if(top+ht > window.innerHeight-10){
    var above=r.top-gap-ht;
    if(above>10){ top=above; flip=true; }
    else top=Math.max(10, window.innerHeight-ht-10);
  }
  _askPop.style.left=left+'px';
  _askPop.style.top=top+'px';
  _askPop.classList.toggle('flip', flip);

  // keep the arrow aimed at the button even when the box is clamped
  var arrow=_askPop.querySelector('.ask-arrow');
  if(arrow){
    var ax=Math.min(Math.max(r.left+r.width/2-left-7, 10), w-24);
    arrow.style.left=ax+'px';
  }
}

function closeAskPop(){
  if(_askPop) _askPop.classList.remove('show');
  document.querySelectorAll('.sec-askai.open').forEach(function(b){b.classList.remove('open');});
  _askSpec=null; _askBtn=null; _askPos=null;
}

function askAutosize(){
  var o=_askPop&&_askPop.querySelector('.ask-out'); if(!o) return;
  o.style.height='auto';
  o.style.height=Math.min(o.scrollHeight+2, 210)+'px';
}
function askMeta(){
  if(!_askPop) return;
  var o=_askPop.querySelector('.ask-out');
  var ph=o.value.match(/\[[A-Za-z]\]/g)||[];
  var e=_askPop.querySelector('.ask-ph');
  if(ph.length){ e.className='ask-ph warn'; e.textContent='\u26a0 fill '+ph.join(' '); }
  else if(/\[[A-Za-z]\]/.test(_askAI)){ e.className='ask-ph ok'; e.textContent='\u2713 placeholders filled'; }
  else { e.className='ask-ph'; e.textContent=''; }
  _askPop.querySelector('.ask-dirty').textContent = (o.value!==_askAI) ? 'edited by you' : '';
}

function runAsk(){
  if(!_askPop||!_askSpec) return;
  var p=_askPop;
  var req=(p.querySelector('.ask-in').value||'').trim();
  if(!req){ p.querySelector('.ask-in').focus(); return; }

  p.querySelector('.ask-insbox').classList.remove('show');
  p.querySelector('.ask-think').classList.add('show');
  p.querySelector('.ask-res').classList.remove('show');
  p.querySelector('.ask-err').classList.remove('show');

  var spec=_askSpec;
  fetch('/api/ask-section',{
    method:'POST',headers:{'Content-Type':'application/json'},
    body:JSON.stringify({request:req, text:spec.read(), scope:spec.label})
  })
  .then(function(r){return r.json();})
  .then(function(d){
    p.querySelector('.ask-think').classList.remove('show');
    if(!d.success||!d.text) throw new Error(d.error||'No response');
    _askAI=d.text;
    var o=p.querySelector('.ask-out');
    o.value=d.text;
    p.querySelector('.ask-res').classList.add('show');
    askAutosize(); askMeta();
    o.focus(); o.setSelectionRange(o.value.length,o.value.length);
  })
  .catch(function(err){
    p.querySelector('.ask-think').classList.remove('show');
    var e=p.querySelector('.ask-err');
    e.textContent='\u2717 '+(err.message||'Something went wrong \u2014 try rephrasing');
    e.classList.add('show');
  });
}

// Which line numbers differ between two blocks of text
function diffLines(beforeText, afterText){
  var b=(beforeText||'').split('\n').filter(function(l){return l.trim();});
  var af=(afterText||'').split('\n').filter(function(l){return l.trim();});
  var changed=[];
  af.forEach(function(l,i){ if(b[i]===undefined || b[i]!==l) changed.push(i); });
  return changed;
}

function applyAsk(){
  if(!_askPop||!_askSpec) return;
  var spec=_askSpec;
  var val=(_askPop.querySelector('.ask-out').value||'').trim();
  if(!val){ _askPop.querySelector('.ask-out').focus(); return; }

  var edited = val!==_askAI;
  var before = spec.read();
  if(spec.write(val)===false){
    var e=_askPop.querySelector('.ask-err');
    e.textContent='\u2717 Could not apply safely \u2014 the structure changed too much. Edit the section directly instead.';
    e.classList.add('show');
    return;
  }

  var changed=diffLines(before, val);
  if(changed.length) _askMarks[spec.key]={type:'edited', idx:changed, anchor:null};
  else delete _askMarks[spec.key];

  var key=spec.key;
  closeAskPop();
  R.quality_score = analyzeQualityScore();
  var y=window.scrollY;
  buildEditor();
  window.scrollTo(0,y);
  if(typeof renderLivePreview==='function') renderLivePreview();
  if(typeof toast==='function') toast(edited ? 'Applied your edited version' : 'Applied to section');
  setTimeout(function(){ jumpToMark(key); }, 160);
}

// ---- Insert: pick the exact position ----
function openInsertPicker(){
  if(!_askPop||!_askSpec) return;
  var p=_askPop;
  var line=(p.querySelector('.ask-in').value||'').trim();
  if(!line){
    var i=p.querySelector('.ask-in');
    i.focus(); i.style.borderColor='#DC2626';
    setTimeout(function(){ i.style.borderColor=''; }, 900);
    return;
  }
  p.querySelector('.ask-res').classList.remove('show');
  _askPos=null;

  var lines=(_askSpec.read()||'').split('\n').filter(function(l){return l.trim();});
  var box=p.querySelector('.ask-lines');
  var h=slotHtml(0,'Insert at the top');
  lines.forEach(function(l,i){
    h+='<div class="ask-ln"><span class="num">'+(i+1)+'</span>'+esc(l)+'</div>';
    h+=slotHtml(i+1, i===lines.length-1 ? 'Insert at the end' : 'Insert after line '+(i+1));
  });
  box.innerHTML=h;

  box.querySelectorAll('.ask-slot').forEach(function(s){
    s.addEventListener('click', function(){
      _askPos=parseInt(s.dataset.p,10);
      box.querySelectorAll('.ask-slot').forEach(function(x){x.classList.remove('on');});
      box.querySelectorAll('.ask-gh').forEach(function(g){ g.remove(); });
      s.classList.add('on');
      var g=document.createElement('div');
      g.className='ask-gh';
      g.innerHTML='<span class="tg">NEW</span>'+esc(line);
      s.insertAdjacentElement('afterend', g);
      p.querySelector('.ask-posnote').textContent =
        _askPos===0 ? 'Will become line 1' : 'Will become line '+(_askPos+1)+', after line '+_askPos;
      p.querySelector('.ask-do-ins').disabled=false;
    });
  });

  p.querySelector('.ask-ins-sub').textContent='Click a position \u2014 the green row shows exactly where it lands.';
  p.querySelector('.ask-posnote').textContent='No position chosen';
  p.querySelector('.ask-do-ins').disabled=true;
  p.querySelector('.ask-insbox').classList.add('show');
}

function slotHtml(p,label){
  return '<div class="ask-slot" data-p="'+p+'"><span class="bar"></span>'
    +'<span class="lbl">'+esc(label)+'</span><span class="bar"></span></div>';
}

function doInsertLine(){
  if(_askPos===null || !_askSpec) return;
  var spec=_askSpec;
  var line=(_askPop.querySelector('.ask-in').value||'').trim();
  if(!line) return;

  var lines=(spec.read()||'').split('\n').filter(function(l){return l.trim();});
  lines.splice(_askPos, 0, line);
  var joined=lines.join('\n');

  if(spec.write(joined)===false){
    var e=_askPop.querySelector('.ask-err');
    e.textContent='\u2717 Could not insert into this section safely.';
    e.classList.add('show');
    return;
  }

  _askMarks[spec.key]={type:'new', idx:[_askPos], anchor:_askPos>0?_askPos-1:null};

  var key=spec.key, at=_askPos;
  closeAskPop();
  R.quality_score = analyzeQualityScore();
  var y=window.scrollY;
  buildEditor();
  window.scrollTo(0,y);
  if(typeof renderLivePreview==='function') renderLivePreview();
  if(typeof toast==='function') toast('Inserted as line '+(at+1));
  setTimeout(function(){ jumpToMark(key); }, 160);
}

function jumpToMark(key){
  var bar=document.querySelector('[data-markbar="'+key+'"]');
  if(bar && bar.scrollIntoView) bar.scrollIntoView({behavior:'smooth',block:'center'});
  var row=document.querySelector('[data-markrow="'+key+'"]');
  if(row){ row.classList.remove('mark-flash'); void row.offsetWidth; row.classList.add('mark-flash'); }
}

function clearAskMark(key){
  delete _askMarks[key];
  var y=window.scrollY; buildEditor(); window.scrollTo(0,y);
}

// Build the "what changed and where" bar shown above a field
function markBar(key, currentText){
  var m=_askMarks[key];
  if(!m) return null;
  var lines=(currentText||'').split('\n').filter(function(l){return l.trim();});
  var bar=el('div',{class:'mark-bar'+(m.type==='edited'?' amber':''),'data-markbar':key});
  var txt;
  if(m.type==='new'){
    var anchorTxt = (m.anchor!==null && lines[m.anchor]!==undefined)
      ? ', after \u201c'+esc(lines[m.anchor].slice(0,40))+(lines[m.anchor].length>40?'\u2026':'')+'\u201d'
      : ', at the very top';
    txt='<b>1 line inserted</b> at line '+(m.idx[0]+1)+anchorTxt;
  } else {
    txt='<b>'+m.idx.length+' line'+(m.idx.length>1?'s':'')+' rewritten by AI</b> \u2014 line'
      +(m.idx.length>1?'s ':' ')+m.idx.map(function(i){return i+1;}).join(', ');
  }
  bar.innerHTML='<span>'+txt+'</span>'
    +'<button class="mark-jump" type="button">Jump to it</button>'
    +'<button class="mark-dis" type="button">Dismiss</button>';
  bar.querySelector('.mark-jump').addEventListener('click', function(){ jumpToMark(key); });
  bar.querySelector('.mark-dis').addEventListener('click', function(){ clearAskMark(key); });
  return bar;
}

document.addEventListener('mousedown', function(e){
  if(!_askPop||!_askPop.classList.contains('show')) return;
  if(e.target.closest && e.target.closest('.sec-askai')) return;
  closeAskPop();
});
document.addEventListener('keydown', function(e){ if(e.key==='Escape') closeAskPop(); });
window.addEventListener('resize', function(){ if(_askBtn) positionAskPop(_askBtn); });
// capture:true so scrolling an inner pane re-anchors the popover too
window.addEventListener('scroll', function(){ if(_askBtn) positionAskPop(_askBtn); }, true);

// Numbered map of a block, marking exactly which line was inserted or rewritten.
// Rendered under the field so it never interferes with editing or error highlights.
function markLineList(key, text){
  var m=_askMarks[key];
  if(!m) return null;
  var lines=(text||'').split('\n').filter(function(l){return l.trim();});
  if(!lines.length) return null;

  var wrap=el('div',{class:'mark-lines'});
  lines.forEach(function(l,i){
    var isMark=m.idx.indexOf(i)>=0;
    var isAnchor=(m.type==='new' && m.anchor===i);
    var cls='mark-ln'+(isMark?(m.type==='new'?' new':' edited'):'')+(isAnchor?' anchor':'');
    var row=el('div',{class:cls});
    if(isMark) row.setAttribute('data-markrow',key);
    var badge='';
    if(isMark){
      badge='<span class="mark-badge '+(m.type==='new'?'new':'edit')+'">'
        +(m.type==='new'?'\u25b8 New \u00b7 line '+(i+1):'\u270e Edited \u00b7 line '+(i+1))+'</span>';
    }
    var anchorTag = isAnchor ? '<span class="mark-anchor-tag">\u2193 new line added below</span>' : '';
    row.innerHTML='<span class="n">'+(i+1)+'</span><span class="t">'+esc(l)+badge+anchorTag+'</span>';
    wrap.appendChild(row);
  });
  return wrap;
}

// ============================================================
// LINE FORMAT MODEL
// desc stays the canonical text (nothing breaks for saved resumes).
// desc_fmt rides alongside it: per-block defaults + per-line kind/overrides.
// If desc_fmt is missing or out of sync with the text, kinds are derived with
// the same heuristics the preview used to apply, so old resumes look unchanged.
// ============================================================
var FMT_DEFAULTS = {font:"Inter, system-ui, sans-serif", size:10.5, lh:'1.55', glyph:'\u2022', head:'h_bold'};
var FMT_FONTS = [
  ['Serif', [["'Source Serif 4',Georgia,serif",'Source Serif'],["Georgia,'Times New Roman',serif",'Georgia'],
             ["'EB Garamond',Garamond,serif",'Garamond'],["'Times New Roman',Times,serif",'Times New Roman']]],
  ['Sans',  [["Inter, system-ui, sans-serif",'Inter'],["Arial,Helvetica,sans-serif",'Arial'],
             ["Calibri,Candara,sans-serif",'Calibri'],["Lato,'Segoe UI',sans-serif",'Lato'],
             ["Roboto,'Segoe UI',sans-serif",'Roboto'],["Verdana,Geneva,sans-serif",'Verdana']]]
];
var FMT_HEADS = [['h_bold','Bold'],['h_under','Underline'],['h_caps','Caps'],
                 ['h_rule','Rule'],['h_accent','Accent'],['h_italic','Italic'],
                 ['h_boxed','Boxed'],['h_smallcaps','Small caps']];
var FMT_GLYPHS = [['\u2022','\u2022 dot'],['\u2013','\u2013 dash'],['\u25aa','\u25aa square'],
                  ['\u25e6','\u25e6 hollow'],['\u203a','\u203a chevron'],['','none']];

function descLines(text){
  return String(text||'').split('\n').map(function(l){return l.trim();}).filter(Boolean);
}

// Legacy heuristics — used ONLY to seed kinds the first time a block is opened.
// After that the stored kind wins, so the preview never re-guesses.
function deriveKind(line){
  var clean = stripBullets(line);
  if(/^##\s+/.test(clean)) return 'sub';
  if(/^[A-Za-z][A-Za-z0-9 ()/&,'-]{2,60}:$/.test(clean)) return 'sub';
  if(/^[A-Z0-9 ()/&,'-]{4,60}$/.test(clean) && clean.split(' ').length <= 6 && !/\d{4}/.test(clean)) return 'sub';
  return 'bullet';
}

// Get the format object for a block, creating/repairing it as needed.
function getFmt(owner, field){
  var key = field + '_fmt';
  var lines = descLines(owner[field]);
  var f = owner[key];
  if(!f || !f.sec || !Array.isArray(f.lines)){
    f = {sec: Object.assign({}, FMT_DEFAULTS), lines: []};
  }
  // keep line metadata index-aligned with the text
  if(f.lines.length !== lines.length){
    var rebuilt = [];
    for(var i=0;i<lines.length;i++){
      rebuilt.push(f.lines[i] && f.lines[i].k ? f.lines[i] : {k: deriveKind(lines[i]), s:{}});
    }
    f.lines = rebuilt;
  }
  f.lines.forEach(function(l){ if(!l.s) l.s = {}; });
  owner[key] = f;
  return f;
}

function fmtVal(f, i, prop){
  var l = f.lines[i];
  return (l && l.s && l.s[prop] !== undefined) ? l.s[prop] : f.sec[prop];
}

// Write text back, keeping line metadata aligned
function setDescLines(owner, field, lines, meta){
  owner[field] = lines.join('\n');
  var f = getFmt(owner, field);
  if(meta) f.lines = meta;
}

// ---- inline markup: **bold** *italic* __underline__ ----
function fmtInline(s){
  return esc(s)
    .replace(/\*\*([^*]+)\*\*/g,'<strong>$1</strong>')
    .replace(/__([^_]+)__/g,'<u>$1</u>')
    .replace(/(^|[^*])\*([^*]+)\*/g,'$1<em>$2</em>');
}

// ---- the one renderer used by preview, PDF and Word ----
function renderDescFmt(text, f){
  var lines = descLines(text);
  if(!lines.length) return '';
  var html='', open=false;
  lines.forEach(function(raw, i){
    var kind = f.lines[i] ? f.lines[i].k : 'bullet';
    var body = stripBullets(raw).replace(/^##\s+/,'');
    if(!body) return;
    var st = 'font-family:'+fmtVal(f,i,'font')+';font-size:'+fmtVal(f,i,'size')+'pt;line-height:'+fmtVal(f,i,'lh')+';';
    if(kind==='bullet'){
      if(!open){ html+='<ul class="gcv-fl">'; open=true; }
      var g = fmtVal(f,i,'glyph');
      html += '<li style="'+st+'">'+(g?'<span class="gcv-g">'+esc(g)+'</span>':'')
           +  '<span>'+fmtInline(body)+'</span></li>';
    } else {
      if(open){ html+='</ul>'; open=false; }
      html += (kind==='sub')
        ? '<div class="gcv-sub '+fmtVal(f,i,'head')+'" style="'+st+'">'+fmtInline(body)+'</div>'
        : '<p class="gcv-plain" style="'+st+'">'+fmtInline(body)+'</p>';
    }
  });
  if(open) html+='</ul>';
  return html;
}

// ---- repair helpers ----
// A line looks like a wrapped fragment when the previous line does not end a
// sentence and this one starts lowercase. Never applied automatically.
function looksWrapped(lines, kinds, i){
  if(i===0) return false;
  if(kinds && (kinds[i]==='sub' || kinds[i-1]==='sub')) return false;
  var p = (lines[i-1]||'').trim(), c = (lines[i]||'').trim();
  if(!p || !c) return false;
  return !/[.!?:;]$/.test(p) && /^[a-z]/.test(c);
}
function hasLeadingSpace(raw){ return /^\s/.test(raw); }

// ============================================================
// FORMAT TOOLBAR UI
// Collapsed by default; one block in formatting mode at a time.
// ============================================================
var _fmtOpen = null;                 // block id currently in formatting mode
var _fmtSel  = {block:null, i:null}; // selected line
var _fmtScope= 'section';

function fmtBlockId(owner, field, tag){ return tag+'::'+field; }

// Build the whole editable stack for one text block.
// owner[field] is the text; owner[field+'_fmt'] is the metadata.
function formatBlock(owner, field, blockId, onChange){
  var wrap = el('div',{class:'fmt-wrap'});
  var f = getFmt(owner, field);
  var isOpen = (_fmtOpen === blockId);

  var toolHost = el('div',{class:'fmt-tools'+(isOpen?' show':'')});
  var rowsHost = el('div',{class:'fmt-rows'+(isOpen?'':' plain')});
  wrap.appendChild(toolHost);
  wrap.appendChild(rowsHost);

  function commit(){
    if(onChange) onChange();
    if(typeof schedulePreview==='function') schedulePreview();
  }
  function redraw(){
    drawTools(); drawRows();
  }

  // ---- toolbar ----
  function drawTools(){
    toolHost.className = 'fmt-tools'+(_fmtOpen===blockId?' show':'');
    if(_fmtOpen!==blockId){ toolHost.innerHTML=''; return; }
    var lineMode = (_fmtSel.block===blockId && _fmtSel.i!==null && _fmtScope==='line');
    var i = lineMode ? _fmtSel.i : null;
    var v = function(p){ return lineMode ? fmtVal(f,i,p) : f.sec[p]; };
    var ov = function(p){ return (lineMode && f.lines[i].s[p]!==undefined) ? ' ov' : ''; };
    var curKind = lineMode ? f.lines[i].k : null;

    var fontOpts = FMT_FONTS.map(function(g){
      return '<optgroup label="'+g[0]+'">'+g[1].map(function(o){
        return '<option value="'+o[0].replace(/"/g,'&quot;')+'"'+(v('font')===o[0]?' selected':'')+'>'+o[1]+'</option>';
      }).join('')+'</optgroup>';
    }).join('');

    toolHost.innerHTML =
      '<div class="fmt-scope">'
       +'<span class="fs-lb">Applying to</span>'
       +'<span class="fs-seg">'
         +'<button type="button" data-a="scope-line"'+(lineMode?' class="on"':'')
           +(_fmtSel.block===blockId&&_fmtSel.i!==null?'':' disabled')+'>This line</button>'
         +'<button type="button" data-a="scope-sec"'+(lineMode?'':' class="on"')+'>Whole block</button>'
       +'</span>'
       +'<span class="fs-what">'+(lineMode?'\u2192 line '+(i+1)+' only':'\u2192 all lines here')+'</span>'
       +'<button type="button" class="fs-reset" data-a="reset"'
         +((lineMode&&Object.keys(f.lines[i].s).length)?'':' disabled')+'>\u21ba Reset line</button>'
      +'</div>'
      +'<div class="fmt-bar">'
        +'<div class="fmt-row"><span class="fg">Line</span>'
          +'<button type="button" class="fb'+(curKind==='bullet'?' on':'')+'" data-a="k-bullet" title="Bullet">\u2022</button>'
          +'<button type="button" class="fb'+(curKind==='sub'?' on':'')+'" data-a="k-sub" title="Subheading">H</button>'
          +'<button type="button" class="fb'+(curKind==='text'?' on':'')+'" data-a="k-text" title="Plain paragraph">\u00b6</button>'
          +'<span class="fsep"></span>'
          +'<button type="button" class="fb" data-a="w-b" title="Bold"><b>B</b></button>'
          +'<button type="button" class="fb" data-a="w-i" title="Italic"><i>I</i></button>'
          +'<button type="button" class="fb" data-a="w-u" title="Underline"><u>U</u></button>'
          +'<span class="fsep"></span><span class="fg">Bullet</span>'
          +'<select class="fsel'+ov('glyph')+'" data-a="glyph">'+FMT_GLYPHS.map(function(g){
              return '<option value="'+g[0]+'"'+(v('glyph')===g[0]?' selected':'')+'>'+g[1]+'</option>';
            }).join('')+'</select>'
          +'<span class="fnote" data-a="cleanup-host"></span>'
        +'</div>'
        +'<div class="fmt-row"><span class="fg">Font</span>'
          +'<select class="fsel'+ov('font')+'" data-a="font" style="min-width:118px">'+fontOpts+'</select>'
          +'<span class="fsep"></span><span class="fg">Size</span>'
          +'<span class="fstep"><button type="button" data-a="size-down">\u2212</button>'
          +'<input class="fnum'+ov('size')+'" data-a="size" type="number" min="5" max="20" step="0.5" value="'+v('size')+'">'
          +'<button type="button" data-a="size-up">+</button></span>'
          +'<span class="fsep"></span><span class="fg">Spacing</span>'
          +'<select class="fsel'+ov('lh')+'" data-a="lh">'
            +[['1.35','Tight'],['1.55','Normal'],['1.8','Roomy']].map(function(o){
              return '<option value="'+o[0]+'"'+(v('lh')===o[0]?' selected':'')+'>'+o[1]+'</option>';}).join('')
          +'</select>'
          +'<span class="fsep"></span>'
          +'<button type="button" class="fb wide" data-a="cleanup" title="Trim spaces and stray bullet characters">\u232b Clean up</button>'
        +'</div>'
        +'<div class="fmt-row"><span class="fg">Heading</span>'
          +FMT_HEADS.map(function(h){
            return '<div class="fhs'+(v('head')===h[0]?' on':'')+'" data-a="head-'+h[0]+'">'
              +'<div class="fsw '+h[0]+'">Aa</div><div class="fhl">'+h[1]+'</div></div>';
          }).join('')
        +'</div>'
      +'</div>';

    toolHost.querySelectorAll('[data-a]').forEach(function(elm){
      var a = elm.dataset.a;
      var evt = (elm.tagName==='SELECT'||elm.tagName==='INPUT') ? 'change' : 'click';
      elm.addEventListener(evt, function(ev){ ev.stopPropagation(); act(a, elm); });
      if(elm.tagName==='INPUT') elm.addEventListener('input', function(){ act('size', elm); });
    });
  }

  function setProp(p, val){
    if(_fmtScope==='line' && _fmtSel.block===blockId && _fmtSel.i!==null) f.lines[_fmtSel.i].s[p]=val;
    else f.sec[p]=val;
    commit(); redraw();
  }

  function act(a, elm){
    var i = _fmtSel.i;
    if(a==='scope-line'){ if(i!==null){ _fmtScope='line'; redraw(); } return; }
    if(a==='scope-sec'){ _fmtScope='section'; redraw(); return; }
    if(a==='reset'){ if(i!==null){ f.lines[i].s={}; commit(); redraw(); } return; }
    if(a.indexOf('k-')===0){ if(i!==null){ f.lines[i].k=a.slice(2); commit(); redraw(); } return; }
    if(a.indexOf('w-')===0){ wrapSelection(a.slice(2)); return; }
    if(a.indexOf('head-')===0){ setProp('head', a.slice(5)); return; }
    if(a==='glyph'||a==='font'||a==='lh'){ setProp(a, elm.value); return; }
    if(a==='size'){ var n=parseFloat(elm.value); if(!isNaN(n)) setProp('size', Math.min(20,Math.max(5,n))); return; }
    if(a==='size-up'||a==='size-down'){
      var lm=(_fmtScope==='line'&&i!==null);
      var cur=lm?fmtVal(f,i,'size'):f.sec.size;
      var v2=Math.round((cur+(a==='size-up'?0.5:-0.5))*2)/2;
      setProp('size', Math.min(20,Math.max(5,v2))); return;
    }
    if(a==='cleanup'){ cleanUp(); return; }
  }

  function wrapSelection(kind){
    var i=_fmtSel.i; if(i===null) return;
    var ta = rowsHost.querySelector('.fmt-text[data-i="'+i+'"]'); if(!ta) return;
    var s=ta.selectionStart, e=ta.selectionEnd; if(s===e) return;
    var mark = kind==='b'?'**':kind==='i'?'*':'__';
    var lines = descLines(owner[field]);
    var v = ta.value;
    lines[i] = v.slice(0,s)+mark+v.slice(s,e)+mark+v.slice(e);
    owner[field] = lines.join('\n');
    commit(); redraw();
  }

  function cleanUp(){
    var lines = String(owner[field]||'').split('\n');
    var kept=[], meta=[];
    lines.forEach(function(raw, idx){
      var t = stripBullets(raw).replace(/\s+/g,' ').trim();
      if(!t) return;
      kept.push(t);
      meta.push(f.lines[idx] || {k:deriveKind(t), s:{}});
    });
    setDescLines(owner, field, kept, meta);
    commit(); redraw();
  }

  function mergeUp(i){
    var lines = descLines(owner[field]);
    if(i<=0 || i>=lines.length) return;
    lines[i-1] = lines[i-1].trim() + ' ' + lines[i].trim();
    var meta = f.lines.slice();
    lines.splice(i,1); meta.splice(i,1);
    setDescLines(owner, field, lines, meta);
    _fmtSel={block:blockId, i:i-1};
    commit(); redraw();
  }

  function delLine(i){
    var lines = descLines(owner[field]);
    var meta = f.lines.slice();
    lines.splice(i,1); meta.splice(i,1);
    setDescLines(owner, field, lines, meta);
    _fmtSel={block:blockId, i:null};
    commit(); redraw();
  }

  function moveLine(i,d){
    var j=i+d;
    var lines = descLines(owner[field]);
    if(j<0||j>=lines.length) return;
    var meta = f.lines.slice();
    var tl=lines[i]; lines[i]=lines[j]; lines[j]=tl;
    var tm=meta[i]; meta[i]=meta[j]; meta[j]=tm;
    setDescLines(owner, field, lines, meta);
    _fmtSel={block:blockId, i:j};
    commit(); redraw();
  }

  // ---- rows ----
  function drawRows(){
    var open = (_fmtOpen===blockId);
    rowsHost.className = 'fmt-rows'+(open?'':' plain');
    var rawLines = String(owner[field]||'').split('\n');
    var lines = descLines(owner[field]);
    var kinds = f.lines.map(function(l){return l.k;});

    // problem summary
    var nWrap=0, nLead=0;
    lines.forEach(function(_,i){ if(looksWrapped(lines,kinds,i)) nWrap++; });
    rawLines.forEach(function(r){ if(r.trim() && hasLeadingSpace(r)) nLead++; });

    var html='';
    if(open && (nWrap||nLead)){
      var bits=[];
      if(nWrap) bits.push('<b>'+nWrap+' line'+(nWrap>1?'s':'')+'</b> look like wrapped fragments');
      if(nLead) bits.push('<b>'+nLead+' line'+(nLead>1?'s':'')+'</b> start with hidden spaces');
      html += '<div class="fmt-fix"><span>'+bits.join(' \u00b7 ')+'</span>'
           +  '<button type="button" data-fix="all">Fix all</button></div>';
    }

    html += lines.map(function(l,i){
      var kind = kinds[i]||'bullet';
      var kc = kind==='sub'?'sub':kind==='bullet'?'bul':'txt';
      var kt = kind==='sub'?'Subhead':kind==='bullet'?'Bullet':'Text';
      var nOv = Object.keys(f.lines[i].s||{}).length;
      var wrapd = looksWrapped(lines,kinds,i);
      var isSel = (_fmtSel.block===blockId && _fmtSel.i===i);
      return '<div class="fmt-row-line'+(isSel?' sel':'')+(kind==='sub'?' isSub':'')+(wrapd?' prob':'')+'">'
        +(open?'<span class="fkind '+kc+'" data-cyc="'+i+'" title="Click to change type">'+kt+'</span>':'')
        +'<textarea class="fmt-text" rows="1" data-i="'+i+'">'+esc(l)+'</textarea>'
        +(wrapd?'<span class="fflag" data-merge="'+i+'" title="Join to the line above">wrapped? \u2934</span>':'')
        +(nOv?'<span class="fov" data-clr="'+i+'" title="Clear line styling">styled \u00d7'+nOv+'</span>':'')
        +(open?'<span class="fracts">'
            +'<button type="button" class="fra" data-mv="'+i+'|-1">\u2191</button>'
            +'<button type="button" class="fra" data-mv="'+i+'|1">\u2193</button>'
            +'<button type="button" class="fra" data-del="'+i+'">\u2715</button>'
          +'</span>':'')
        +'</div>';
    }).join('');

    if(open){
      html += '<div class="fmt-add">'
        +'<button type="button" data-add="bullet">+ Bullet</button>'
        +'<button type="button" data-add="sub">+ Subheading</button>'
        +'<button type="button" data-add="text">+ Paragraph</button></div>';
    }
    rowsHost.innerHTML = html;

    rowsHost.querySelectorAll('.fmt-text').forEach(function(ta){
      autosizeFmt(ta);
      ta.addEventListener('input', function(){
        var ls = descLines(owner[field]);
        ls[+ta.dataset.i] = ta.value;
        owner[field] = ls.join('\n');
        autosizeFmt(ta); commit();
      });
      ta.addEventListener('focus', function(){
        _fmtSel={block:blockId, i:+ta.dataset.i};
        if(_fmtOpen===blockId) _fmtScope='line';
        drawTools();
        rowsHost.querySelectorAll('.fmt-row-line').forEach(function(r,idx){
          r.classList.toggle('sel', idx===(_fmtSel.i + (rowsHost.querySelector('.fmt-fix')?1:0)===idx?_fmtSel.i:-1));
        });
        markSelRows();
      });
    });
    function markSelRows(){
      var rows = rowsHost.querySelectorAll('.fmt-row-line');
      rows.forEach(function(r,idx){ r.classList.toggle('sel', idx===_fmtSel.i); });
    }
    markSelRows();

    rowsHost.querySelectorAll('[data-cyc]').forEach(function(e){
      e.addEventListener('click', function(){
        var i=+e.dataset.cyc;
        _fmtSel={block:blockId,i:i}; _fmtScope='line';
        var k=f.lines[i].k;
        f.lines[i].k = k==='bullet'?'sub':k==='sub'?'text':'bullet';
        commit(); redraw();
      });
    });
    rowsHost.querySelectorAll('[data-merge]').forEach(function(e){
      e.addEventListener('click', function(){ mergeUp(+e.dataset.merge); });
    });
    rowsHost.querySelectorAll('[data-clr]').forEach(function(e){
      e.addEventListener('click', function(){
        var i=+e.dataset.clr; f.lines[i].s={}; _fmtSel={block:blockId,i:i}; commit(); redraw();
      });
    });
    rowsHost.querySelectorAll('[data-mv]').forEach(function(e){
      e.addEventListener('click', function(){
        var p=e.dataset.mv.split('|'); moveLine(+p[0], +p[1]);
      });
    });
    rowsHost.querySelectorAll('[data-del]').forEach(function(e){
      e.addEventListener('click', function(){ delLine(+e.dataset.del); });
    });
    rowsHost.querySelectorAll('[data-add]').forEach(function(e){
      e.addEventListener('click', function(){
        var lines2 = descLines(owner[field]);
        var meta = f.lines.slice();
        lines2.push('New line');
        meta.push({k:e.dataset.add, s:{}});
        setDescLines(owner, field, lines2, meta);
        _fmtSel={block:blockId, i:lines2.length-1};
        commit(); redraw();
        var t = rowsHost.querySelector('.fmt-text[data-i="'+(lines2.length-1)+'"]');
        if(t){ t.focus(); t.select(); }
      });
    });
    var fixBtn = rowsHost.querySelector('[data-fix="all"]');
    if(fixBtn) fixBtn.addEventListener('click', function(){
      var ls = descLines(owner[field]);
      var meta = f.lines.slice();
      var ks = meta.map(function(m){return m.k;});
      for(var i=ls.length-1;i>0;i--){
        if(looksWrapped(ls,ks,i)){
          ls[i-1]=ls[i-1].trim()+' '+ls[i].trim();
          ls.splice(i,1); meta.splice(i,1); ks.splice(i,1);
        }
      }
      ls = ls.map(function(t){ return stripBullets(t).replace(/\s+/g,' ').trim(); });
      setDescLines(owner, field, ls, meta);
      _fmtSel={block:blockId,i:null};
      commit(); redraw();
    });
  }

  drawTools(); drawRows();
  wrap._fmtRedraw = redraw;
  return wrap;
}

function autosizeFmt(ta){ ta.style.height='auto'; ta.style.height=(ta.scrollHeight)+'px'; }

// The "Aa Format" toggle that lives next to Ask AI
function formatToggleBtn(blockId){
  var b = el('button',{type:'button',class:'btn-fmt'+(_fmtOpen===blockId?' on':''),
    title:'Text and bullet formatting for this block'});
  b.innerHTML='<span class="aa">Aa</span> Format';
  b.addEventListener('click', function(ev){
    ev.stopPropagation();
    _fmtOpen = (_fmtOpen===blockId) ? null : blockId;
    _fmtSel = {block:blockId, i:null};
    _fmtScope = 'section';
    var y=window.scrollY; buildEditor(); window.scrollTo(0,y);
  });
  return b;
}

// ============================================================
// RESIZABLE PREVIEW SPLITTER
// Width lives in a CSS variable on the grid, and persists per browser.
// ============================================================
var PV_MIN_CENTRE = 360;   // the editor never shrinks below this
var PV_MIN_WIDTH  = 300;   // below this the preview snaps shut
var PV_DEFAULT    = 470;
var _pvLast = PV_DEFAULT;

// Deterministic: return the grid belonging to whichever view is ACTUALLY
// active, never "whichever matching element happens to come first in the
// DOM" — that ambiguity is what set --pvw on a hidden container while the
// visible one silently fell back to a conflicting hardcoded rule.
function pvGrid(){
  var pro = document.getElementById('view-pro');
  if(pro && pro.classList.contains('on')) return pro.querySelector('.container');
  var fr = document.getElementById('view-fresher');
  if(fr && fr.classList.contains('on')) return fr.querySelector('.fr-grid') || fr.querySelector('.container');
  return null;   // neither builder view is open — nothing to size yet
}

function pvMaxWidth(grid){
  // total minus rail, splitter, gaps, and the editor's minimum
  var w = grid.clientWidth;
  return Math.max(0, w - 180 - 10 - 28 - PV_MIN_CENTRE);
}

function setPreviewWidth(px, persist){
  var grid = pvGrid(); if(!grid) return;
  var max = pvMaxWidth(grid);
  px = Math.max(0, Math.min(px, max));
  if(px > 0 && px < PV_MIN_WIDTH) px = (px < PV_MIN_WIDTH/2) ? 0 : PV_MIN_WIDTH;

  grid.style.setProperty('--pvw', px+'px');
  // only touch the preview belonging to THIS grid, not every .pv-live in the DOM
  var pv = grid.querySelector('.pv-live');
  if(pv) pv.style.display = px===0 ? 'none' : '';
  if(px > 0) _pvLast = px;

  var tag = document.querySelector('.pv-widthtag');
  if(tag){
    var pct = max>0 ? Math.round((px/(px + grid.clientWidth-180-10-28-px))*100) : 0;
    tag.textContent = px===0 ? 'preview hidden' : 'preview '+Math.max(1,pct)+'%';
  }
  var cb = document.querySelector('.pv-collapse');
  if(cb) cb.textContent = px===0 ? '\u21e4' : '\u21e5';

  if(persist){ try{ localStorage.setItem('reeve_pvw', String(px)); }catch(e){} }
  if(_askBtn) positionAskPop(_askBtn);   // popover follows the reflow
}

function togglePreviewPane(){
  var grid=pvGrid(); if(!grid) return;
  var cur=parseInt(getComputedStyle(grid).getPropertyValue('--pvw'),10)||0;
  setPreviewWidth(cur===0 ? (_pvLast||PV_DEFAULT) : 0, true);
}

function initPreviewSplitter(){
  var grid=pvGrid(); if(!grid) return;

  // restore the last width this browser used
  var saved=null;
  try{ saved=parseInt(localStorage.getItem('reeve_pvw'),10); }catch(e){}
  setPreviewWidth((!isNaN(saved) && saved!==null) ? saved : PV_DEFAULT, false);

  document.querySelectorAll('.pv-split').forEach(function(sp){
    if(sp._wired) return;
    sp._wired = true;
    var dragging=false;

    sp.addEventListener('pointerdown', function(e){
      dragging=true; sp.classList.add('drag');
      sp.setPointerCapture(e.pointerId);
      document.body.style.userSelect='none';
      document.body.style.cursor='col-resize';
    });
    sp.addEventListener('pointermove', function(e){
      if(!dragging) return;
      var g=pvGrid(); if(!g) return;
      var right=g.getBoundingClientRect().right;
      setPreviewWidth(right - e.clientX - 5, false);
    });
    function stopDrag(e){
      if(!dragging) return;
      dragging=false; sp.classList.remove('drag');
      try{ sp.releasePointerCapture(e.pointerId); }catch(err){}
      document.body.style.userSelect='';
      document.body.style.cursor='';
      var g=pvGrid();
      if(g) setPreviewWidth(parseInt(getComputedStyle(g).getPropertyValue('--pvw'),10)||0, true);
    }
    sp.addEventListener('pointerup', stopDrag);
    sp.addEventListener('pointercancel', stopDrag);
    sp.addEventListener('dblclick', function(){ setPreviewWidth(PV_DEFAULT, true); });

    // keyboard accessible
    sp.setAttribute('tabindex','0');
    sp.setAttribute('role','separator');
    sp.setAttribute('aria-label','Resize preview panel');
    sp.addEventListener('keydown', function(e){
      var g=pvGrid(); if(!g) return;
      var cur=parseInt(getComputedStyle(g).getPropertyValue('--pvw'),10)||0;
      if(e.key==='ArrowLeft'){ e.preventDefault(); setPreviewWidth(cur+24, true); }
      if(e.key==='ArrowRight'){ e.preventDefault(); setPreviewWidth(cur-24, true); }
      if(e.key==='Home'){ e.preventDefault(); setPreviewWidth(PV_DEFAULT, true); }
    });
  });

  window.addEventListener('resize', function(){
    var g=pvGrid(); if(!g) return;
    setPreviewWidth(parseInt(getComputedStyle(g).getPropertyValue('--pvw'),10)||PV_DEFAULT, false);
  });
}

// add the width tag + collapse button into the preview header, once
function decoratePreviewHeader(){
  document.querySelectorAll('.pv-live').forEach(function(pane){
    var head = pane.querySelector('.pv-live-head, .pv-head, h2, header');
    if(!head || head.querySelector('.pv-collapse')) return;
    var wrap = el('span',{style:'margin-left:auto;display:flex;align-items:center;gap:5px'});
    wrap.appendChild(el('span',{class:'pv-widthtag'},''));
    var btn = el('button',{class:'pv-panebtn pv-collapse',type:'button',title:'Collapse / expand preview'},'\u21e5');
    btn.addEventListener('click', function(e){ e.stopPropagation(); togglePreviewPane(); });
    wrap.appendChild(btn);
    head.appendChild(wrap);
  });
}

document.addEventListener('DOMContentLoaded', function(){
  decoratePreviewHeader(); initPreviewSplitter();
});
if(document.readyState !== 'loading'){ decoratePreviewHeader(); initPreviewSplitter(); }
