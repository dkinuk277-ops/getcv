// ============================================================
// GetCV frontend — powered by Decompliance · AI GRC Intelligence
// ============================================================
const API = ''; // same origin; set to full URL if frontend hosted separately

// ---------- State ----------
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
  if(!/\.(pdf|docx?|)$/i.test(file.name) && !/\.(pdf|docx?)$/i.test(file.name)){
    return toast('Please upload a PDF or DOCX file');
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
    toast('Import failed: ' + err.message, 6000);
  }
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
function fieldHead(labelText, aiHandler){
  const wrap = el('div',{class:'field-head'});
  wrap.appendChild(el('label',{},labelText));
  if(aiHandler){
    const b = el('button',{type:'button',class:'mini-ai',title:'Ask AI to improve'}, '✦ Ask AI');
    b.addEventListener('click', () => aiHandler(b));
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
  const c = el('div',{class:'insights',id:'sec-insights'});
  const tl = careerTimelineSVG(t, true);
  const dm = domainsSVG(t, true);
  c.innerHTML = `
    <div class="insights-head"><h2>Career Insights</h2></div>
    <div class="insights-body">
      <div class="trend-head"><h3>Career Timeline</h3>
        <span class="th-btns">
          <label class="switch" title="Slide on/off — show or hide this chart in your exported resume"><input type="checkbox" data-pref="timeline" ${R.chart_prefs.timeline?'checked':''}><span class="slider"></span><span class="sw-lbl">In resume</span></label>
          <button class="edit-btn" data-ed="tl" type="button">✎ Edit timeline</button>
        </span></div>
      <div data-holder="tl">${tl || '<div class="chart-empty">Add work experience with dates to see your timeline.</div>'}</div>
      <div class="ins-editor" data-panel="tl"></div>
      <div class="ins-divider"></div>
      <div class="trend-head"><h3>Domain Expertise</h3>
        <span class="th-btns">
          <label class="switch" title="Slide on/off — show or hide this chart in your exported resume"><input type="checkbox" data-pref="domains" ${R.chart_prefs.domains?'checked':''}><span class="slider"></span><span class="sw-lbl">In resume</span></label>
          <button class="edit-btn" data-ed="dm" type="button">✎ Edit domains</button>
        </span></div>
      <div data-holder="dm">${dm || '<div class="chart-empty">No domains yet — click ✎ Edit domains to add rows like &ldquo;Risk Management · 2015 – Present&rdquo;.</div>'}</div>
      <div class="ins-editor" data-panel="dm"></div>
      <div class="ins-divider"></div>
      <div class="trend-head"><h3>Tenure Ranking <span style="font-weight:500;text-transform:none;letter-spacing:0;color:var(--ink-soft)">— companies by duration, highest → lowest</span></h3>
        <span class="th-btns">
          <label class="switch" title="Slide on/off — show or hide this chart in your exported resume"><input type="checkbox" data-pref="tenure" ${R.chart_prefs.tenure?'checked':''}><span class="slider"></span><span class="sw-lbl">In resume</span></label>
        </span></div>
      <div data-holder="tr">${tenureRankingSVG(t, true) || '<div class="chart-empty">Add work experience with dates to see tenure ranking.</div>'}</div>
    </div>`;

  // chart-in-resume preference toggles (slide switches)
  c.querySelectorAll('.switch input').forEach(cb=>{
    cb.addEventListener('change', ()=>{
      R.chart_prefs[cb.dataset.pref] = cb.checked;
      toast(cb.checked ? 'Chart will appear in your resume' : 'Chart removed from your resume (still visible here)');
      renderLivePreview();
    });
  });

  // ----- editor wiring -----
  const editors = {
    tl: {
      cols: [['name','Company',''],['start','From','yr'],['end','To (blank = Present)','yr']],
      rows: ()=> companyPeriods().map(p => ({name:p.name, start:p.startY, end:p.endY===nowYear?null:p.endY, _ref:p.ref})),
      blank: ()=> ({name:'', start:null, end:null}),
      max: 0,
      save: rows => { saveTimelineRows(rows); buildEditor(); toast('Timeline saved — Work Experience updated to match'); }
    },
    dm: {
      cols: [['name','Domain name',''],['start','From','yr'],['end','To (blank = Present)','yr'],['detail','Detail (e.g. "team of 9")','']],
      rows: ()=> (R.domains||[]).map(d => ({name:d.name, start:d.start_year, end:d.end_year, detail:d.detail||''})),
      blank: ()=> ({name:'', start:null, end:null, detail:''}),
      max: 8,
      save: rows => { saveDomainRows(rows); buildEditor(); toast('Domains saved'); }
    }
  };

  c.querySelectorAll('[data-ed]').forEach(btn=>{
    const key = btn.dataset.ed, cfg = editors[key];
    const panel = c.querySelector(`[data-panel="${key}"]`);
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
      c.querySelectorAll('.ins-editor').forEach(p=>p.classList.remove('open'));
      if(opening){ working = cfg.rows(); renderRows(); panel.classList.add('open'); }
    });
  });

  return c;
}

const SEC_COLOURS = ['#0F766E','#4338CA','#BE185D','#B45309','#166534','#7C3AED','#0E7490','#9F1239','#0284C7'];

// New order: header info → skills-band-ish → projects → summary → experience → education → the rest
const EDITOR_ORDER = ['personal','skills','certifications','languages','projects','accomplishments','courses','summary','experience','education'];

function buildEditor(){
  $('#startArea').classList.add('hidden');
  $('#fresherStart').classList.add('hidden');
  $('#editorWrap').classList.remove('hidden');
  const ed = $('#editor');
  ed.classList.remove('hidden');
  ed.innerHTML = '';

  // Career insights at the very top (only if we have experience)
  if(R.experience.length) ed.appendChild(insightsCard());

  // Always show every section — empty ones get an "add first" hint
  EDITOR_ORDER.forEach(key => {
    if(key === 'personal') ed.appendChild(personalCard());
    else if(key === 'summary') ed.appendChild(summaryCard());
    else if(key === 'skills') ed.appendChild(skillsCard());
    else if(key === 'languages') ed.appendChild(simpleListCard('languages','Languages'));
    else if(key === 'accomplishments') ed.appendChild(linesCard('accomplishments','Accomplishments','e.g. Reduced audit findings by 40% year-on-year'));
    else ed.appendChild(listCard(key));
  });
  R.extra_sections.forEach((sec,i)=> ed.appendChild(extraCard(sec,i)));

  // paint each card with its own accent colour
  ed.querySelectorAll('.card').forEach((c,i)=>
    c.style.setProperty('--sec', SEC_COLOURS[i % SEC_COLOURS.length]));

  // "In resume" slide switch on every section card
  const TOGGLABLE = ['summary','skills','certifications','languages','projects','accomplishments','courses','experience','education'];
  TOGGLABLE.forEach(k=>{
    const h2 = ed.querySelector('#sec-'+k+' h2');
    if(!h2) return;
    const sw = el('label',{class:'switch sec-switch',title:'Slide on/off — show or hide this section in your exported resume'});
    sw.innerHTML = `<input type="checkbox" data-sec="${k}" ${R.section_prefs[k]!==false?'checked':''}><span class="slider"></span><span class="sw-lbl">In resume</span>`;
    h2.appendChild(sw);
    sw.querySelector('input').addEventListener('change', e=>{
      R.section_prefs[k] = e.target.checked;
      toast(e.target.checked ? 'Section will appear in your resume' : 'Section hidden from your resume (still editable here)');
      renderLivePreview();
    });
  });

  renderRail();
  renderAddPanel();
  $('#addSectionCard').classList.remove('hidden');
  if(typeof renderLivePreview === 'function') renderLivePreview();
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
      return {label:m.label, on, anchor:'sec-'+m.key};
    }),
    ...R.extra_sections.map((s,i)=>({label:s.heading||'Extra', on:true, anchor:'sec-extra-'+i}))
  ];
  items.forEach((it,idx)=>{
    const b = el('button',{class:'rail-item'+(it.on?' detected':''),type:'button','data-anchor':it.anchor},
      `<span class="dot"></span>${esc(it.label)}`);
    b.style.setProperty('--sec', SEC_COLOURS[idx % SEC_COLOURS.length]);
    rail.appendChild(b);
  });
}
// one delegated handler serves every sidebar copy (clones keep no listeners)
document.addEventListener('click', e=>{
  const item = e.target.closest('.rail-item[data-anchor]');
  if(!item) return;
  const t = document.getElementById(item.dataset.anchor);
  if(t) t.scrollIntoView({behavior:'smooth', block:'start'});
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
    wrap.appendChild(fieldHead(lab, ai ? (btn)=>
      askField(btn, f==='headline'?'Professional headline':lab,
        ()=> R.personal[f],
        v=>{ R.personal[f]=v; inp.value=v; },
        `Person: ${R.personal.name}. Latest role: ${R.experience[0]?.title||''} at ${R.experience[0]?.company||''}`) : null));
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
  c.innerHTML = `<h2>Summary
    <button class="btn btn-ai" type="button">✦ AI enhance</button></h2>
    <textarea rows="4">${esc(R.summary)}</textarea>`;
  const ta = c.querySelector('textarea');
  ta.addEventListener('input', ()=> R.summary = ta.value);
  c.querySelector('.btn-ai').addEventListener('click', e =>
    enhance(e.currentTarget, ()=>R.summary, v=>{ R.summary=v; ta.value=v; }, 'professional summary'));
  return c;
}

// Generic list sections (experience / education / certifications / projects)
const LIST_DEFS = {
  experience:{title:'Work experience', fields:[
    ['title','Job title'],['company','Company'],['location','Location'],
    ['start','Start (e.g. Mar 2019)'],['end','End (or Present)']], text:['desc','Achievements / responsibilities'], ai:true,
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
      const en = el('div',{class:'entry'});
      const head = el('div',{class:'entry-head'});
      head.innerHTML = `<strong>${esc(item[def.fields[0][0]]||def.title+' '+(i+1))}</strong>
        <span><button class="btn btn-danger" type="button">Remove</button></span>`;
      en.appendChild(head);

      const grid = el('div',{class:'grid2'});
      def.fields.forEach(([f,lab])=>{
        const fw = el('div',{class:'field'});
        const canAI = AI_FIELDS[key]?.has(f);
        fw.appendChild(fieldHead(lab, canAI ? (btn)=>
          askField(btn, lab, ()=>item[f], v=>{ item[f]=v; inp.value=v; },
            `${def.title} entry: ${JSON.stringify(item).slice(0,300)}`) : null));
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
        fw.appendChild(fieldHead(tlab, canAI ? (btn)=>
          askField(btn, tlab, ()=>item[tf], v=>{ item[tf]=v; ta.value=v; },
            `${def.title} for ${item[def.fields[0][0]]||''}${key==='experience'?' at '+(item.company||''):''}`) : null));
        const ta = el('textarea',{'data-f':tf,rows:'4'});
        ta.value = item[tf]||'';
        ta.addEventListener('input',()=> item[tf]=ta.value);
        fw.appendChild(ta);
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
  c.innerHTML = `<h2>Skills</h2>
    <input placeholder="Type a skill and press Enter">
    <div class="tags"></div>`;
  const inp = c.querySelector('input'), tags = c.querySelector('.tags');
  const render = ()=>{
    tags.innerHTML='';
    R.skills.forEach((s,i)=>{
      const t = el('span',{class:'tag'}, `${esc(s)} <button type="button" aria-label="Remove ${esc(s)}">&times;</button>`);
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
  c.innerHTML = `<h2>${title}</h2>
    <textarea rows="4" placeholder="${placeholder}">${esc((R[key]||[]).join('\n'))}</textarea>
    <div style="font-size:11px;color:var(--ink-soft);margin-top:4px">One per line — each becomes a bullet in your resume.</div>`;
  c.querySelector('textarea').addEventListener('input', e=>
    R[key] = e.target.value.split('\n').map(s=>s.trim()).filter(Boolean));
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
.gcv-sub{font-size:11.5px;font-weight:700;color:${t.dark};text-transform:uppercase;letter-spacing:.04em;margin:7px 0 2px}
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
  let html = '', bullets = [];
  const flush = ()=>{
    if(bullets.length){ html += `<ul>${bullets.map(b=>`<li>${esc(stripBullets(b))}</li>`).join('')}</ul>`; bullets = []; }
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
      html += `<div class="gcv-sub">${esc(clean.replace(/:$/,''))}</div>`;
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
      ${renderDesc(j.desc)}
    </div>`).join('') : '';

  const extrasBlock = R.extra_sections.map(s=>`<h2>${esc(s.heading)}</h2><ul>${(s.items||[]).map(i=>`<li>${esc(i)}</li>`).join('')}</ul>`).join('');

  const foot = `<div class="gcv-foot">Built with GetCV · <a href="https://www.decompliance.uk">www.decompliance.uk</a> · AI GRC Intelligence by DeCompliance</div>`;

  // ---- LAYOUT COMPOSER: same locked content order, different structures
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
          ${trendsBlock}${aopBlock}${accomplishmentsBlock}${coursesBlock}${projectsBlock}${expBlock}${extrasBlock}
        </div>
      </div>${foot}</div>`;
  } else if(layout === 'twocol'){
    body = `<div class="gcv-page">
      <div class="gcv-head"><div>${identity}${credLine}</div>${contactBlock}</div>
      ${skillsBlock}${trendsBlock}
      <div class="gcv-cols">${aopBlock}${accomplishmentsBlock}${coursesBlock}${projectsBlock}</div>
      ${expBlock}${extrasBlock}${foot}</div>`;
  } else {
    // classic / banner / compact / mono share the classic structure (CSS restyles them)
    body = `<div class="gcv-page">
      <div class="gcv-head"><div>${identity}${credLine}</div>${contactBlock}</div>
      ${skillsBlock}${trendsBlock}${aopBlock}${accomplishmentsBlock}${coursesBlock}${projectsBlock}${expBlock}${extrasBlock}${foot}</div>`;
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
          $('#previewBody').innerHTML = resumeHTML(false);
      });
      grid.appendChild(b);
    });
  });
}


// ---- Preview: review → then download PDF / Word ----
function openPreview(){
  $('#previewBody').innerHTML = resumeHTML(false);
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
  const printCSS = `<style>
    @page{ size: A4; margin: 10mm 8mm; }
    html,body{ margin:0; padding:0; background:#fff; }
    .gcv-page{ max-width:none; box-shadow:none; }
    .gcv-page h2{ break-after: avoid; page-break-after: avoid; }
    .gcv-job, .gcv-trends, .gcv-trend-col, .gcv-credline, .gcv-chips{ break-inside: avoid; page-break-inside: avoid; }
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
    .replace('</body>', auto + '</body>');
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
  const html = resumeHTML(false);
  document.querySelectorAll('[data-livepane]').forEach(p => p.innerHTML = html);
  document.querySelectorAll('[data-livetpl]').forEach(s => s.textContent = getTemplate().name);
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
// Views, routing, auth — GetCV shell
// ============================================================
let currentUser = null;

function showView(id){
  document.querySelectorAll('.view').forEach(v => v.classList.remove('on'));
  const t = document.getElementById('view-'+id);
  if(t) t.classList.add('on');
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
  showView('login');
}

function setUser(user){
  currentUser = user;
  $('#hdrUser').textContent = user.name ? `${user.name}` : user.email;
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

// ---- session check on load ----
(async ()=>{
  try{
    const out = await api('/api/auth/me');
    setUser(out.user);
  }catch{ showView('login'); }
})();

// Initial rail (nothing detected yet)
renderRail();
