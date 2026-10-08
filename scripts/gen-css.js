// Generator CSS lokal pengganti Tailwind CDN — hanya untuk class yang dipakai proyek.
const fs = require('fs');

const COLORS = {
  slate: {100:'241,245,249',300:'203,213,225',400:'148,163,184',500:'100,116,139',600:'71,85,105',700:'51,65,85',800:'30,41,59',900:'15,23,42',950:'2,6,23'},
  violet:{200:'221,214,254',300:'196,181,253',400:'167,139,250',500:'139,92,246',600:'124,58,237',900:'76,29,149'},
  fuchsia:{300:'240,171,252',400:'232,121,249',500:'217,70,239',600:'192,38,211',900:'112,26,117'},
  amber: {200:'253,230,138',400:'251,191,36',500:'245,158,11'},
  emerald:{200:'167,243,208',400:'52,211,153',500:'16,185,129'},
  red:   {300:'252,165,165',400:'248,113,113',900:'127,29,41'},
  sky:   {200:'186,230,253',400:'56,189,248',500:'14,165,233'},
  white: '255,255,255', black: '0,0,0', transparent: 'transparent',
};
const SP = {0:'0',0.5:'0.125rem',1:'0.25rem',1.5:'0.375rem',2:'0.5rem',2.5:'0.625rem',3:'0.75rem',3.5:'0.875rem',4:'1rem',5:'1.25rem',6:'1.5rem',8:'2rem',10:'2.5rem',12:'3rem',14:'3.5rem',16:'4rem',20:'5rem',32:'8rem',72:'18rem',96:'24rem',52:'13rem',40:'10rem'};
const TEXT = {xs:['0.75rem','1rem'],sm:['0.875rem','1.25rem'],base:['1rem','1.5rem'],lg:['1.125rem','1.75rem'],xl:['1.25rem','1.75rem'],'2xl':['1.5rem','2rem'],'3xl':['1.875rem','2.25rem'],'4xl':['2.25rem','2.5rem'],'5xl':['3rem','1'],'6xl':['3.75rem','1'],'8xl':['6rem','1'],'9xl':['8rem','1']};

function colorVal(name, shade, op) {
  const c = COLORS[name]?.[shade] ?? COLORS[name];
  if (c === 'transparent') return 'transparent';
  if (!c) return null;
  const a = op ? (parseInt(op) / 100) : 1;
  return a === 1 ? `rgb(${c})` : `rgba(${c},${a})`;
}
function parseColor(token) {
  // "slate-800", "slate-800/60", "white", "violet-900/20"
  const m = token.match(/^([a-z]+)(?:-(\d+))?(?:\/(\d+))?$/);
  if (!m) return null;
  return colorVal(m[1], m[2], m[3]);
}
function escCls(s) {
  return s.replace(/\\/g,'\\\\').replace(/:/g,'\\:').replace(/\//g,'\\/').replace(/\[/g,'\\[').replace(/\]/g,'\\]').replace(/\./g,'\\.').replace(/'/g,"\\'");
}
function triplet(c) {
  const m = String(c).match(/rgba?\(([^)]+)\)/);
  return m ? m[1].split(',').slice(0, 3).join(',') : '0,0,0';
}

let rules = [];
function add(selector, decl, media) {
  rules.push({ selector, decl, media: media || null });
}

// ---------- utilitas inti ----------
function core(cls) {
  // return CSS declaration string atau null
  let m;
  if (cls==='block') return 'display:block';
  if (cls==='inline-block') return 'display:inline-block';
  if (cls==='flex') return 'display:flex';
  if (cls==='grid') return 'display:grid';
  if (cls==='hidden') return 'display:none';
  if (cls==='relative') return 'position:relative';
  if (cls==='absolute') return 'position:absolute';
  if (cls==='fixed') return 'position:fixed';
  if (cls==='sticky') return 'position:sticky';
  if (cls==='inset-0') return 'inset:0';
  if (cls==='flex-1') return 'flex:1 1 0%';
  if (cls==='flex-col') return 'flex-direction:column';
  if (cls==='flex-row') return 'flex-direction:row';
  if (cls==='flex-wrap') return 'flex-wrap:wrap';
  if (cls==='items-center') return 'align-items:center';
  if (cls==='items-start') return 'align-items:flex-start';
  if (cls==='justify-center') return 'justify-content:center';
  if (cls==='justify-between') return 'justify-content:space-between';
  if (cls==='justify-end') return 'justify-content:flex-end';
  if (cls==='overflow-hidden') return 'overflow:hidden';
  if (cls==='overflow-x-auto') return 'overflow-x:auto';
  if (cls==='overflow-y-auto') return 'overflow-y:auto';
  if (cls==='truncate') return 'overflow:hidden;text-overflow:ellipsis;white-space:nowrap';
  if (cls==='whitespace-nowrap') return 'white-space:nowrap';
  if (cls==='whitespace-pre-line') return 'white-space:pre-line';
  if (cls==='pointer-events-none') return 'pointer-events:none';
  if (cls==='select-none') return 'user-select:none';
  if (cls==='min-h-screen') return 'min-height:100vh';
  if (cls==='min-w-0') return 'min-width:0';
  if (cls==='w-full') return 'width:100%';
  if (cls==='mx-auto') return 'margin-left:auto;margin-right:auto';
  if (cls==='ml-auto') return 'margin-left:auto';
  if (cls==='bg-gradient-to-r') return 'background-image:linear-gradient(to right,var(--tw-gradient-stops))';
  if (cls==='bg-gradient-to-br') return 'background-image:linear-gradient(to bottom right,var(--tw-gradient-stops))';
  if (cls==='bg-clip-text') return '-webkit-background-clip:text;background-clip:text';
  if (cls==='text-transparent') return 'color:transparent';
  if (cls==='uppercase') return 'text-transform:uppercase';
  if (cls==='line-through') return 'text-decoration-line:line-through';
  if (cls==='text-center') return 'text-align:center';
  if (cls==='text-left') return 'text-align:left';
  if (cls==='text-right') return 'text-align:right';
  if (cls==='font-normal') return 'font-weight:400';
  if (cls==='font-medium') return 'font-weight:500';
  if (cls==='font-semibold') return 'font-weight:600';
  if (cls==='font-bold') return 'font-weight:700';
  if (cls==='font-extrabold') return 'font-weight:800';
  if (cls==='tracking-tight') return 'letter-spacing:-0.025em';
  if (cls==='tracking-wide') return 'letter-spacing:0.025em';
  if (cls==='leading-none') return 'line-height:1';
  if (cls==='leading-tight') return 'line-height:1.25';
  if (cls==='leading-snug') return 'line-height:1.375';
  if (cls==='leading-relaxed') return 'line-height:1.625';
  if (cls==='transition') return 'transition-property:color,background-color,border-color,opacity,box-shadow,transform,filter;transition-timing-function:cubic-bezier(.4,0,.2,1);transition-duration:150ms';
  if (cls==='transition-transform') return 'transition-property:transform;transition-timing-function:cubic-bezier(.4,0,.2,1);transition-duration:150ms';
  if (cls==='backdrop-blur') return '-webkit-backdrop-filter:blur(8px);backdrop-filter:blur(8px)';
  if (cls==='backdrop-blur-sm') return '-webkit-backdrop-filter:blur(4px);backdrop-filter:blur(4px)';
  if (cls==='shadow-lg') return 'box-shadow:0 10px 15px -3px rgba(0,0,0,.35),0 4px 6px -4px rgba(0,0,0,.35)';
  if (cls==='shadow-xl') return 'box-shadow:0 20px 25px -5px rgba(0,0,0,.4),0 8px 10px -6px rgba(0,0,0,.4)';
  if (cls==='shadow-2xl') return 'box-shadow:0 25px 50px -12px rgba(0,0,0,.5)';
  if (cls==='drop-shadow-lg') return 'filter:drop-shadow(0 10px 8px rgba(0,0,0,.35)) drop-shadow(0 4px 3px rgba(0,0,0,.3))';
  if (cls==='drop-shadow-2xl') return 'filter:drop-shadow(0 25px 25px rgba(0,0,0,.35))';
  if (cls==='accent-violet-600') return 'accent-color:rgb(124,58,237)';
  if (cls==='border') return 'border-width:1px;border-style:solid';
  if (cls==='border-2') return 'border-width:2px;border-style:solid';
  if (cls==='border-b') return 'border-bottom-width:1px;border-bottom-style:solid';
  if (cls==='border-t') return 'border-top-width:1px;border-top-style:solid';
  if (cls==='rounded-lg') return 'border-radius:0.5rem';
  if (cls==='rounded-xl') return 'border-radius:0.75rem';
  if (cls==='rounded-2xl') return 'border-radius:1rem';
  if (cls==='rounded-full') return 'border-radius:9999px';
  if (cls==='col-span-full') return 'grid-column:1 / -1';
  if ((m=cls.match(/^col-span-(\d+)$/))) return `grid-column:span ${m[1]} / span ${m[1]}`;
  if ((m=cls.match(/^grid-cols-(\d+)$/))) return `grid-template-columns:repeat(${m[1]},minmax(0,1fr))`;
  if ((m=cls.match(/^gap-([\d.]+)$/))) return `gap:${SP[m[1]]}`;
  if ((m=cls.match(/^space-y-([\d.]+)$/))) return null; // ditangani khusus
  if ((m=cls.match(/^p-([\d.]+)$/))) return `padding:${SP[m[1]]}`;
  if ((m=cls.match(/^px-([\d.]+)$/))) return `padding-left:${SP[m[1]]};padding-right:${SP[m[1]]}`;
  if ((m=cls.match(/^py-([\d.]+)$/))) return `padding-top:${SP[m[1]]};padding-bottom:${SP[m[1]]}`;
  if ((m=cls.match(/^pt-([\d.]+)$/))) return `padding-top:${SP[m[1]]}`;
  if ((m=cls.match(/^pb-([\d.]+)$/))) return `padding-bottom:${SP[m[1]]}`;
  if ((m=cls.match(/^pl-([\d.]+)$/))) return `padding-left:${SP[m[1]]}`;
  if ((m=cls.match(/^pr-([\d.]+)$/))) return `padding-right:${SP[m[1]]}`;
  if ((m=cls.match(/^m-([\d.]+)$/))) return `margin:${SP[m[1]]}`;
  if ((m=cls.match(/^mx-([\d.]+)$/))) return `margin-left:${SP[m[1]]};margin-right:${SP[m[1]]}`;
  if ((m=cls.match(/^my-([\d.]+)$/))) return `margin-top:${SP[m[1]]};margin-bottom:${SP[m[1]]}`;
  if ((m=cls.match(/^mt-([\d.]+)$/))) return `margin-top:${SP[m[1]]}`;
  if ((m=cls.match(/^mb-([\d.]+)$/))) return `margin-bottom:${SP[m[1]]}`;
  if ((m=cls.match(/^ml-([\d.]+)$/))) return `margin-left:${SP[m[1]]}`;
  if ((m=cls.match(/^mr-([\d.]+)$/))) return `margin-right:${SP[m[1]]}`;
  if ((m=cls.match(/^w-([\d.]+)$/)) && SP[m[1]]) return `width:${SP[m[1]]}`;
  if ((m=cls.match(/^h-([\d.]+)$/)) && SP[m[1]]) return `height:${SP[m[1]]}`;
  if (cls==='h-px') return 'height:1px';
  if ((m=cls.match(/^top-([\d.]+)$/))) return `top:${SP[m[1]]}`;
  if (cls==='top-1/2') return 'top:50%';
  if (cls==='top-0') return 'top:0';
  if ((m=cls.match(/^left-([\d.]+)$/))) return `left:${SP[m[1]]}`;
  if ((m=cls.match(/^right-([\d.]+)$/))) return `right:${SP[m[1]]}`;
  if (cls==='right-0') return 'right:0';
  if ((m=cls.match(/^z-(\d+)$/))) return `z-index:${m[1]}`;
  if ((m=cls.match(/^z-\[(\d+)\]$/))) return `z-index:${m[1]}`;
  if ((m=cls.match(/^max-w-(\w+)$/))) { const v={md:'28rem',xl:'36rem','2xl':'42rem','3xl':'48rem','5xl':'64rem','6xl':'72rem','7xl':'80rem'}[m[1]]; if(v) return `max-width:${v}`; }
  if ((m=cls.match(/^max-w-\[([^\]]+)\]$/))) return `max-width:${m[1]}`;
  if ((m=cls.match(/^min-w-\[([^\]]+)\]$/))) return `min-width:${m[1]}`;
  if ((m=cls.match(/^max-h-\[([^\]]+)\]$/))) return `max-height:${m[1]}`;
  if ((m=cls.match(/^min-h-\[([^\]]+)\]$/))) return `min-height:${m[1]}`;
  if ((m=cls.match(/^text-\[([^\]]+)\]$/))) return `font-size:${m[1]}`;
  if (TEXT[cls.replace(/^text-/,'')] && cls.startsWith('text-')) { const [s,l]=TEXT[cls.slice(5)]; return `font-size:${s};line-height:${l}`; }
  if ((m=cls.match(/^text-(.+)$/))) { const c=parseColor(m[1]); if(c) return `color:${c}`; }
  if ((m=cls.match(/^bg-(.+)$/))) { const c=parseColor(m[1]); if(c) return `background-color:${c}`; }
  if ((m=cls.match(/^border-(.+)$/))) { const c=parseColor(m[1]); if(c) return `border-color:${c}`; }
  if ((m=cls.match(/^from-(.+)$/))) { const c=parseColor(m[1]); if(c && c!=='transparent') return `--tw-gradient-from:${c};--tw-gradient-to:rgba(${triplet(c)},0);--tw-gradient-stops:var(--tw-gradient-from),var(--tw-gradient-to)`; }
  if ((m=cls.match(/^via-(.+)$/))) { const c=parseColor(m[1]); if(c) return `--tw-gradient-stops:var(--tw-gradient-from),${c},var(--tw-gradient-to)`; }
  if ((m=cls.match(/^to-(.+)$/))) { const c=parseColor(m[1]); if(c) return `--tw-gradient-to:${c}`; }
  if (cls==='-translate-y-1/2') return '--tw-translate-y:-50%;transform:translateY(var(--tw-translate-y))';
  if ((m=cls.match(/^opacity-(\d+)$/))) return `opacity:${parseInt(m[1])/100}`;
  return null;
}

// ---------- parsing variant ----------
const MEDIA = { sm:'(min-width:640px)', md:'(min-width:768px)', lg:'(min-width:1024px)' };
function handle(raw) {
  if (!raw || /[\$\{\}'?=]/.test(raw)) return; // sampah template literal
  const parts = raw.split(':');
  const base = parts.pop();
  const variants = parts;
  if (base.startsWith('space-y-')) {
    const v = base.slice(8);
    if (SP[v]) add(`.${escCls(raw)} > * + *`, `margin-top:${SP[v]}`, variants.length? mediaOf(variants):null, pseudoOf(variants));
    return;
  }
  if (base==='scale-110' && variants.includes('group-hover')) {
    add(`.group:hover .${escCls(raw)}`, 'transform:scale(1.1)');
    return;
  }
  const decl = core(base);
  if (!decl) { /* console.log('LEWAT:', raw); */ return; }
  add(`.${escCls(raw)}`, decl, mediaOf(variants), pseudoOf(variants));
}
function mediaOf(variants) {
  for (const v of variants) if (MEDIA[v]) return MEDIA[v];
  return null;
}
function pseudoOf(variants) {
  const p = [];
  for (const v of variants) {
    if (v==='hover') p.push(':hover');
    else if (v==='focus') p.push(':focus');
    else if (v==='disabled') p.push(':disabled');
    else if (v==='last') p.push(':last-child');
  }
  return p.join('');
}
// override add untuk pseudo
const _add = add;
add = function(selector, decl, media, pseudo) {
  _add(selector + (pseudo||''), decl, media);
};

// Ekstrak semua class dari HTML & JS di public/
const path = require('path');
const ROOT = path.join(__dirname, '..', 'public');
function walk(d, out=[]) {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    const p = path.join(d, e.name);
    if (e.isDirectory()) walk(p, out);
    else if (/\.(html|js)$/.test(e.name)) out.push(p);
  }
  return out;
}
const raw = [];
for (const f of walk(ROOT)) {
  const t = fs.readFileSync(f, 'utf8');
  for (const m of t.matchAll(/class="([^"]*)"/g)) raw.push(...m[1].split(/\s+/));
}
[...new Set(raw)].forEach(handle);

// hover shadow berwarna khusus
_add('.hover\\:shadow-violet-900\\/20:hover', 'box-shadow:0 10px 15px -3px rgba(76,29,149,.35),0 4px 6px -4px rgba(76,29,149,.3)');
_add('.hover\\:shadow-lg:hover', 'box-shadow:0 10px 15px -3px rgba(0,0,0,.35),0 4px 6px -4px rgba(0,0,0,.35)');
_add('.hover\\:-translate-y-0\\.5:hover', 'transform:translateY(-0.125rem)');

let out = '/* DigiPasar — utility CSS lokal (pengganti Tailwind CDN, dibuat otomatis) */\n';
out += '*,*::before,*::after{box-sizing:border-box}\n';
const plain = rules.filter(r=>!r.media), mq = {};
rules.filter(r=>r.media).forEach(r=>{ (mq[r.media]=mq[r.media]||[]).push(r); });
plain.forEach(r=>{ out += `${r.selector}{${r.decl}}\n`; });
for (const [q,rs] of Object.entries(mq)) { out += `@media ${q}{\n`; rs.forEach(r=>{ out += `  ${r.selector}{${r.decl}}\n`; }); out += '}\n'; }

fs.mkdirSync(path.join(ROOT, 'css'), { recursive: true });
fs.writeFileSync(path.join(ROOT, 'css', 'digipasar.css'), out);
console.log('OK:', plain.length, 'rules,', Object.keys(mq).length, 'media queries,', Buffer.byteLength(out)/1024|0, 'KB');
