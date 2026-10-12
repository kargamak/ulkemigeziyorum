const STATUSES = [
  { id: 'visited', label: 'Gezdim', color: 'var(--visited)' },
  { id: 'passed', label: 'Üstünden geçtim', color: 'var(--passed)' },
  { id: 'want', label: 'Gitmek istiyorum', color: 'var(--want)' },
  { id: 'no', label: 'Gitmem', color: 'var(--no)' },
  { id: '', label: 'Gezmedim', color: '#fff' },
];
const KEY = 'ulkemi-geziyorum';
let data = {};
try { data = JSON.parse(localStorage.getItem(KEY) || '{}'); } catch (e) {}
let selected = null;
const save = () => { try { localStorage.setItem(KEY, JSON.stringify(data)); } catch (e) {} };
if (navigator.storage && navigator.storage.persist) navigator.storage.persist();
const $ = id => document.getElementById(id);
const colorOf = s => (STATUSES.find(x => x.id === (s || '')) || {}).color;

const svg = $('map');
svg.setAttribute('viewBox', `0 0 ${MAP_W} ${MAP_H}`);
const paths = {};
const NS = 'http://www.w3.org/2000/svg';
const gp = document.createElementNS(NS, 'g'), gl = document.createElementNS(NS, 'g');
svg.append(gp, gl);
PROVINCES.forEach(p => {
  const el = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  el.setAttribute('d', p.d);
  el.setAttribute('fill-rule', 'evenodd');
  el.onclick = e => { e.stopPropagation(); select(p.n); };
  el.onpointermove = e => {
    if (e.pointerType !== 'mouse') return;
    const t = $('tip'); t.hidden = false; t.textContent = p.n;
    t.style.left = e.clientX + 12 + 'px'; t.style.top = e.clientY + 12 + 'px';
  };
  el.onpointerleave = () => $('tip').hidden = true;
  gp.appendChild(el);
  paths[p.n] = el;
});

const centers = [];
PROVINCES.forEach(p => {
  const b = paths[p.n].getBBox();
  const t = document.createElementNS(NS, 'text');
  const cx = b.x + b.width / 2, cy = b.y + b.height / 2 + 2;
  centers.push([p.n, cx, cy]);
  t.setAttribute('x', cx);
  t.setAttribute('y', cy);
  t.setAttribute('class', 'lbl');
  t.textContent = p.n;
  gl.appendChild(t);
});
$('labels').checked = localStorage.getItem(KEY + '-labels') === '1';
const applyLabels = () => {
  svg.classList.toggle('show-labels', $('labels').checked);
  localStorage.setItem(KEY + '-labels', $('labels').checked ? '1' : '0');
};
$('labels').onchange = applyLabels;
applyLabels();

$('close').onclick = closePop;
$('detail').onclick = e => e.stopPropagation();
document.addEventListener('click', closePop);
document.addEventListener('keydown', e => { if (e.key === 'Escape') closePop(); });
function closePop() { $('detail').hidden = true; selected = null; refresh(); }

$('legend').innerHTML = STATUSES.map(s => `<li><i style="--c:${s.color}"></i>${s.label}</li>`).join('');
$('choices').innerHTML = STATUSES.map(s =>
  `<button data-s="${s.id}"><i style="--c:${s.color}"></i>${s.label}</button>`).join('');
$('choices').onclick = e => {
  const b = e.target.closest('button'); if (!b || !selected) return;
  const d = data[selected] ||= {};
  d.s = b.dataset.s;
  persist();
};
$('note').oninput = e => {
  if (!selected) return;
  (data[selected] ||= {}).note = e.target.value;
  persist(false);
};
$('search').oninput = renderList;
$('reset').onclick = () => {
  if (confirm('Tüm işaretler ve notlar silinsin mi?')) { data = {}; persist(); }
};

function persist(full = true) {
  const d = data[selected];
  if (d && !d.s && !d.note) delete data[selected];
  save();
  if (full) refresh(); else renderList(), stats();
}

function select(name) {
  selected = name;
  const pop = $('detail');
  $('pname').textContent = name;
  $('note').value = (data[name] || {}).note || '';
  refresh();
  pop.hidden = false;
  if (isMobile()) { pop.style.left = pop.style.top = ''; return; } // alt sayfa (CSS)
  const r = paths[name].getBoundingClientRect();
  const w = pop.offsetWidth, h = pop.offsetHeight;
  let x = r.left + r.width / 2 - w / 2, y = r.bottom + 8;
  if (y + h > innerHeight - 8) y = Math.max(8, r.top - h - 8);
  x = Math.min(Math.max(8, x), innerWidth - w - 8);
  pop.style.left = x + 'px'; pop.style.top = y + 'px';
}

function stats() {
  const c = id => Object.values(data).filter(d => d.s === id).length;
  $('stats').textContent =
    `${c('visited')}/81 gezildi · ${c('passed')} geçildi · ${c('want')} gidilecek`;
}

function renderList() {
  const q = $('search').value.toLocaleLowerCase('tr');
  $('list').innerHTML = '';
  PROVINCES.filter(p => p.n.toLocaleLowerCase('tr').includes(q)).forEach(p => {
    const d = data[p.n] || {};
    const li = document.createElement('li');
    li.innerHTML = `<i style="--c:${colorOf(d.s)}"></i>${p.n}${d.note ? '<small>not</small>' : ''}`;
    li.onclick = e => { e.stopPropagation(); select(p.n); };
    $('list').appendChild(li);
  });
}

function refresh() {
  PROVINCES.forEach(p => {
    const el = paths[p.n], s = (data[p.n] || {}).s;
    if (s) el.dataset.s = s; else delete el.dataset.s;
    el.classList.toggle('sel', p.n === selected);
  });
  if (selected) {
    const s = (data[selected] || {}).s || '';
    document.querySelectorAll('#choices button').forEach(b => b.classList.toggle('on', b.dataset.s === s));
    paths[selected].parentNode.appendChild(paths[selected]);
  }
  renderList(); stats();
}
refresh();

// ---- Paylaşım görseli ----
const HEX = { visited: '#4f9d7a', passed: '#6c9bc9', want: '#e0a03c', no: '#c9605c', '': '#ffffff' };
function buildImage() {
  const S = 2, W = 1200, mapW = 1100, mapH = mapW * MAP_H / MAP_W, top = 100, legendH = 130;
  const H = top + mapH + legendH;
  const c = document.createElement('canvas');
  c.width = W * S; c.height = H * S;
  const x = c.getContext('2d');
  x.scale(S, S);
  x.fillStyle = '#fafaf8'; x.fillRect(0, 0, W, H);
  const font = 'Inter, system-ui, sans-serif';
  const cnt = id => Object.values(data).filter(d => d.s === id).length;
  x.fillStyle = '#222'; x.textBaseline = 'middle'; x.textAlign = 'left';
  x.font = '500 34px ' + font;
  x.fillText('Ülkemi Geziyorum', 50, 50);
  x.font = '400 18px ' + font; x.textAlign = 'right'; x.fillStyle = '#8a8a85';
  x.fillText(cnt('visited') + '/81 il gezildi', W - 50, 50);

  x.save();
  x.translate((W - mapW) / 2, top); x.scale(mapW / MAP_W, mapW / MAP_W);
  x.lineJoin = 'round'; x.lineWidth = 0.8; x.strokeStyle = '#222';
  PROVINCES.forEach(p => {
    x.fillStyle = HEX[(data[p.n] || {}).s || ''];
    const path = new Path2D(p.d);
    x.fill(path, 'evenodd'); x.stroke(path);
  });
  if ($('labels').checked) {
    x.font = '500 10.5px ' + font; x.textAlign = 'center'; x.fillStyle = '#222';
    x.lineWidth = 2.5; x.strokeStyle = '#fff';
    centers.forEach(([n, cx, cy]) => { x.strokeText(n, cx, cy); x.fillText(n, cx, cy); });
  }
  x.restore();

  const marked = Object.values(data).filter(d => d.s).length;
  const items = STATUSES.map(s => ({ label: s.label, id: s.id, n: s.id ? cnt(s.id) : 81 - marked }));
  const colW = (W - 100) / items.length;
  items.forEach((it, i) => {
    const lx = 50 + i * colW, ly = top + mapH + 50;
    x.beginPath(); x.arc(lx + 10, ly, 9, 0, Math.PI * 2);
    x.fillStyle = HEX[it.id]; x.fill(); x.lineWidth = 1.5; x.strokeStyle = '#222'; x.stroke();
    x.fillStyle = '#222'; x.textAlign = 'left'; x.font = '500 20px ' + font;
    x.fillText(it.label, lx + 28, ly - 4);
    x.fillStyle = '#8a8a85'; x.font = '400 16px ' + font;
    x.fillText(it.n + ' il', lx + 28, ly + 20);
  });
  return c;
}
$('share').onclick = e => {
  e.stopPropagation();
  buildImage().toBlob(async blob => {
    const file = new File([blob], 'ulkemi-geziyorum.png', { type: 'image/png' });
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      try { await navigator.share({ files: [file], title: 'Ülkemi Geziyorum' }); return; }
      catch (err) { if (err.name === 'AbortError') return; }
    }
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = file.name; a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  });
};

// ---- Sağ paneli aç/kapa ----
const applyPanel = () => {
  const on = $('panelToggle').checked;
  document.querySelector('main').classList.toggle('no-panel', !on);
  try { localStorage.setItem(KEY + '-panel', on ? '1' : '0'); } catch (e) {}
};
try { $('panelToggle').checked = localStorage.getItem(KEY + '-panel') !== '0'; } catch (e) {}
$('panelToggle').onchange = applyPanel;
applyPanel();

// ---- Mobil: parmakla yakınlaştır / kaydır ----
function isMobile() { return matchMedia('(max-width:600px)').matches; }
const vb = { x: 0, y: 0, w: MAP_W, h: MAP_H };
function setVB() {
  vb.w = Math.min(MAP_W, Math.max(MAP_W / 10, vb.w));
  vb.h = vb.w * MAP_H / MAP_W;
  vb.x = Math.min(Math.max(0, vb.x), MAP_W - vb.w);
  vb.y = Math.min(Math.max(0, vb.y), MAP_H - vb.h);
  svg.setAttribute('viewBox', `${vb.x} ${vb.y} ${vb.w} ${vb.h}`);
  svg.style.setProperty('--k', vb.w / MAP_W); // çizgi kalınlığı sabit kalsın
  const z = vb.w < MAP_W - 0.5;
  svg.classList.toggle('zoomed', z);
  $('zoomReset').hidden = !z;
}
function zoomAt(cx, cy, k) {
  const p = new DOMPoint(cx, cy).matrixTransform(svg.getScreenCTM().inverse());
  const nw = Math.min(MAP_W, Math.max(MAP_W / 10, vb.w / k)), f = nw / vb.w;
  vb.x = p.x - (p.x - vb.x) * f;
  vb.y = p.y - (p.y - vb.y) * f;
  vb.w = nw;
  setVB();
}
function panBy(dx, dy) {
  const s = svg.getScreenCTM().a;
  vb.x -= dx / s; vb.y -= dy / s;
  setVB();
}
const zoomCenter = k => {
  const r = svg.getBoundingClientRect();
  zoomAt(r.left + r.width / 2, r.top + r.height / 2, k);
};
$('zoom').onclick = e => e.stopPropagation();
$('zoomIn').onclick = () => zoomCenter(1.6);
$('zoomOut').onclick = () => zoomCenter(1 / 1.6);
$('zoomReset').onclick = () => { vb.x = vb.y = 0; vb.w = MAP_W; setVB(); };

let touches = null, moved = false, lastGesture = 0;
const pts = e => [...e.touches].map(t => ({ x: t.clientX, y: t.clientY }));
const dist = a => Math.hypot(a[0].x - a[1].x, a[0].y - a[1].y);
const mid = a => ({ x: (a[0].x + a[1].x) / 2, y: (a[0].y + a[1].y) / 2 });
svg.addEventListener('touchstart', e => {
  touches = pts(e);
  if (e.touches.length === 1) moved = false; else moved = true;
}, { passive: true });
svg.addEventListener('touchmove', e => {
  if (!touches) return;
  const cur = pts(e);
  if (cur.length >= 2 && touches.length >= 2) {
    e.preventDefault();
    const m0 = mid(touches), m1 = mid(cur);
    panBy(m1.x - m0.x, m1.y - m0.y);
    zoomAt(m1.x, m1.y, dist(cur) / dist(touches));
    moved = true; lastGesture = Date.now();
  } else if (cur.length === 1 && touches.length === 1) {
    const dx = cur[0].x - touches[0].x, dy = cur[0].y - touches[0].y;
    if (!moved && Math.hypot(dx, dy) < 8) return; // küçük titreme = dokunma
    moved = true; lastGesture = Date.now();
    if (!svg.classList.contains('zoomed')) { touches = null; return; } // sayfa kaysın
    e.preventDefault();
    panBy(dx, dy);
  }
  touches = cur;
}, { passive: false });
svg.addEventListener('touchend', e => { touches = e.touches.length ? pts(e) : null; }, { passive: true });
// Sürükleme / yakınlaştırma sonrası yanlışlıkla il seçilmesin
svg.addEventListener('click', e => {
  if (Date.now() - lastGesture < 350) { e.stopPropagation(); e.preventDefault(); }
}, true);
// Masaüstü: trackpad ile sıkıştırma (ctrl + tekerlek)
svg.addEventListener('wheel', e => {
  if (!e.ctrlKey) return;
  e.preventDefault();
  zoomAt(e.clientX, e.clientY, Math.exp(-e.deltaY * 0.01));
}, { passive: false });
setVB();
