// ── ui.js: Estrellas, navegación, modales, toast, notas/cartas/recuerdos render, calendario, wordle ──

// ══ STARS ══
(function() {
  const c = document.getElementById('stars-canvas');
  const ctx = c.getContext('2d');
  let W, H, stars = [];
  function resize() { W = c.width = window.innerWidth; H = c.height = window.innerHeight; }
  function mkStars() {
    stars = [];
    const n = Math.floor((W * H) / 6000);
    for (let i = 0; i < n; i++) {
      stars.push({ x: Math.random()*W, y: Math.random()*H, r: Math.random()*1.2+0.2,
        a: Math.random(), spd: Math.random()*0.003+0.001, phase: Math.random()*Math.PI*2 });
    }
  }
  let t = 0;
  function draw() {
    ctx.clearRect(0,0,W,H); t += 0.01;
    stars.forEach(s => {
      const alpha = s.a * (0.5 + 0.5 * Math.sin(t * s.spd * 100 + s.phase));
      ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, Math.PI*2);
      ctx.fillStyle = `rgba(220,210,255,${alpha})`; ctx.fill();
    });
    requestAnimationFrame(draw);
  }
  resize(); mkStars();
  window.addEventListener('resize', () => { resize(); mkStars(); });
  draw();
})();

// ══ NAVIGATION ══
window.showSection = function(id) {
  document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  document.querySelectorAll('.mobile-nav-item').forEach(n => n.classList.remove('active'));
  document.getElementById('game-wordle')?.classList.remove('active');
  const sec = document.getElementById('section-' + id);
  if (sec) sec.classList.add('active');
  document.querySelectorAll('[data-section="' + id + '"]').forEach(n => n.classList.add('active'));
  if (window.innerWidth <= 768) document.getElementById('sidebar').classList.remove('mobile-open');
  window.scrollTo(0,0);
};
document.querySelectorAll('.nav-item').forEach(item => {
  item.addEventListener('click', () => window.showSection(item.dataset.section));
});

window.toggleSidebar = function() {
  document.getElementById('sidebar').classList.toggle('mobile-open');
};

// ══ MODALS ══
window.openModal = function(id) {
  document.getElementById(id).classList.add('open');
  if (id === 'modal-add-photo') {
    window.switchUploadTab && window.switchUploadTab('file');
    window._selectedFile = null;
    const prev = document.getElementById('upload-preview');
    if (prev) prev.style.display = 'none';
  }
};
window.closeModal = function(id) {
  document.getElementById(id).classList.remove('open');
};
document.querySelectorAll('.modal-overlay').forEach(m => {
  m.addEventListener('click', e => { if (e.target === m) m.classList.remove('open'); });
});

// ══ TOAST ══
window.showToast = function(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 2500);
};

// ══ UTIL ══
window.escHtml = function(s) {
  if (!s) return '';
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
};

// ══ NOTAS render ══
window.renderNotes = function() {
  const grid = document.getElementById('notes-grid');
  const empty = document.getElementById('notes-empty');
  const notes = window._notes || {};
  const ids = Object.keys(notes);
  if (ids.length === 0) { empty.style.display = ''; return; }
  empty.style.display = 'none';
  while (grid.children.length > 1) grid.removeChild(grid.lastChild);
  ids.forEach(id => {
    const n = notes[id];
    const ts = n.ts ? new Date(n.ts.seconds*1000).toLocaleDateString('es') : '';
    const card = document.createElement('div');
    card.className = 'note-card';
    card.innerHTML = `
      <button class="note-card-delete" onclick="deleteNote(event,'${id}')">✕</button>
      <div class="note-card-title">${window.escHtml(n.title)}</div>
      <div class="note-card-preview">${window.escHtml(n.body)}</div>
      <div class="note-card-meta">${window.escHtml(n.author||'')} · ${ts}</div>`;
    card.onclick = () => openReadNote(n);
    grid.appendChild(card);
  });
};

window.openReadNote = function(n) {
  document.getElementById('read-note-title').textContent = n.title;
  const ts = n.ts ? new Date(n.ts.seconds*1000).toLocaleDateString('es',{year:'numeric',month:'long',day:'numeric'}) : '';
  document.getElementById('read-note-meta').textContent = (n.author||'') + (ts ? ' · ' + ts : '');
  document.getElementById('read-note-body').textContent = n.body;
  window.openModal('modal-read-note');
};

// ══ CARTAS render ══
window.renderLetters = function() {
  const list = document.getElementById('letters-list');
  const empty = document.getElementById('letters-empty');
  const letters = window._letters || {};
  const ids = Object.keys(letters);
  if (ids.length === 0) { empty.style.display = ''; return; }
  empty.style.display = 'none';
  while (list.children.length > 1) list.removeChild(list.lastChild);
  ids.forEach(id => {
    const l = letters[id];
    const ts = l.ts ? new Date(l.ts.seconds*1000).toLocaleDateString('es',{year:'numeric',month:'long',day:'numeric'}) : '';
    const item = document.createElement('div');
    item.className = 'letter-item';
    item.innerHTML = `<div class="letter-seal">✉</div>
      <div class="letter-info">
        <div class="letter-from">${window.escHtml(l.from)}</div>
        <div class="letter-subject">${window.escHtml(l.subject)}</div>
        <div class="letter-meta">${ts}</div>
      </div>`;
    item.onclick = () => openReadLetter(l);
    list.appendChild(item);
  });
};

window.openReadLetter = function(l) {
  document.getElementById('read-letter-from').textContent = 'De: ' + l.from + (l.subject ? ' — ' + l.subject : '');
  const ts = l.ts ? new Date(l.ts.seconds*1000).toLocaleDateString('es',{year:'numeric',month:'long',day:'numeric'}) : '';
  document.getElementById('read-letter-date').textContent = ts;
  document.getElementById('read-letter-body').textContent = l.body;
  window.openModal('modal-read-letter');
};

// ══ RECUERDOS render ══
window.renderMemories = function() {
  const timeline = document.getElementById('memories-timeline');
  const empty = document.getElementById('memories-empty');
  const mems = window._memories || {};
  const ids = Object.keys(mems);
  if (ids.length === 0) { empty.style.display = ''; return; }
  empty.style.display = 'none';
  while (timeline.children.length > 1) timeline.removeChild(timeline.lastChild);
  ids.forEach(id => {
    const m = mems[id];
    const item = document.createElement('div');
    item.className = 'memory-item';
    item.innerHTML = `<div class="memory-date">${window.escHtml(m.date||'')}</div>
      <div class="memory-title">${window.escHtml(m.title)}</div>
      <div class="memory-body">${window.escHtml(m.body)}</div>`;
    timeline.appendChild(item);
  });
};

// ══ CALENDAR ══
let calDate = new Date();
const MONTHS = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
const DAYS = ['Lu','Ma','Mi','Ju','Vi','Sá','Do'];

window.changeMonth = function(d) { calDate.setMonth(calDate.getMonth() + d); window.renderCalendar(); };

window.renderCalendar = function() {
  const grid = document.getElementById('cal-grid');
  grid.innerHTML = '';
  document.getElementById('cal-month-title').textContent = MONTHS[calDate.getMonth()] + ' ' + calDate.getFullYear();
  DAYS.forEach(d => {
    const el = document.createElement('div');
    el.className = 'cal-day-name'; el.textContent = d; grid.appendChild(el);
  });
  const firstDay = new Date(calDate.getFullYear(), calDate.getMonth(), 1);
  let startDow = firstDay.getDay();
  startDow = startDow === 0 ? 6 : startDow - 1;
  const daysInMonth = new Date(calDate.getFullYear(), calDate.getMonth()+1, 0).getDate();
  const prevDays = new Date(calDate.getFullYear(), calDate.getMonth(), 0).getDate();
  const today = new Date();
  const events = window._events || {};
  const dateMap = {};
  Object.values(events).forEach(ev => {
    const start = ev.date, end = ev.dateEnd || ev.date;
    let cur = new Date(start + 'T00:00:00');
    const endD = new Date(end + 'T00:00:00');
    while (cur <= endD) {
      const ds = cur.toISOString().slice(0,10);
      if (!dateMap[ds]) dateMap[ds] = [];
      dateMap[ds].push({ color: ev.color||'#b8a9e8' });
      cur.setDate(cur.getDate()+1);
    }
  });
  for (let i = 0; i < startDow; i++) {
    const el = document.createElement('div');
    el.className = 'cal-day other-month';
    el.textContent = prevDays - startDow + 1 + i;
    grid.appendChild(el);
  }
  for (let d = 1; d <= daysInMonth; d++) {
    const el = document.createElement('div');
    el.className = 'cal-day'; el.textContent = d;
    const dateStr = `${calDate.getFullYear()}-${String(calDate.getMonth()+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
    if (d === today.getDate() && calDate.getMonth() === today.getMonth() && calDate.getFullYear() === today.getFullYear())
      el.classList.add('today');
    if (dateMap[dateStr]) {
      el.classList.add('has-event');
      const bar = document.createElement('div');
      bar.style.cssText = `position:absolute;bottom:2px;left:10%;right:10%;height:3px;border-radius:2px;background:${dateMap[dateStr][0].color};opacity:0.8`;
      el.style.position = 'relative';
      el.appendChild(bar);
    }
    grid.appendChild(el);
  }
};

window.renderEvents = function() {
  const list = document.getElementById('cal-events');
  const empty = document.getElementById('cal-empty');
  const events = window._events || {};
  const ids = Object.keys(events);
  if (ids.length === 0) { empty.style.display = ''; return; }
  empty.style.display = 'none';
  while (list.children.length > 1) list.removeChild(list.lastChild);
  ids.sort((a,b) => events[a].date > events[b].date ? 1 : -1).forEach(id => {
    const ev = events[id];
    const item = document.createElement('div');
    item.className = 'cal-event-item';
    const isRange = ev.dateEnd && ev.dateEnd !== ev.date;
    const dateLabel = isRange ? `${ev.date} → ${ev.dateEnd}` : ev.date;
    const delBtn = document.createElement('button');
    delBtn.className = 'btn btn-sm';
    delBtn.style.cssText = 'opacity:0.4;padding:0.2rem 0.5rem;font-size:0.68rem';
    delBtn.textContent = '✕';
    delBtn.addEventListener('click', async () => {
      if (!confirm('¿Eliminar evento?')) return;
      await window._deleteDoc('events', id);
    });
    item.innerHTML = `<div class="cal-event-dot" style="background:${window.escHtml(ev.color||'#b8a9e8')}"></div>
      <span class="cal-event-name">${window.escHtml(ev.name)}</span>
      <span class="cal-event-date">${window.escHtml(dateLabel)}</span>`;
    item.appendChild(delBtn);
    list.appendChild(item);
  });
};

window.renderCalendar();

// ══ WORDLE ══
const WORDLE_WORDS = ['ARBOL','BANCO','CALLE','DATOS','FINCA','GLOSA','HUECO','IDEAL','JUEGO','LUGAR','MARCO','NOCHE','ORDEN','PLAZA','QUESO','RADIO','SALUD','AMIGO','BRISA','CAMPO','DICHA','FALSO','GRANO','HONDO','LIBRO','MUNDO','NUEVO','PRADO','RAZÓN','SABOR','TECHO','DULCE','ENTRE','GUSTO','HONOR','MUJER','OSCUR','PRIMO','ATAJO','CURVA'];
let wordleWord = '', wordleCurrent = '', wordleGuesses = [], wordleOver = false;

window.initWordle = function() {
  wordleWord = WORDLE_WORDS[Math.floor(Math.random() * WORDLE_WORDS.length)];
  wordleGuesses = []; wordleCurrent = ''; wordleOver = false;
  document.getElementById('wordle-msg').textContent = '';
  buildWordleBoard(); buildWordleKB();
};

function buildWordleBoard() {
  const board = document.getElementById('wordle-board'); board.innerHTML = '';
  for (let r = 0; r < 6; r++) {
    const row = document.createElement('div'); row.className = 'wordle-row'; row.id = 'wr-' + r;
    for (let c = 0; c < 5; c++) {
      const cell = document.createElement('div'); cell.className = 'wordle-cell'; cell.id = `wc-${r}-${c}`;
      row.appendChild(cell);
    }
    board.appendChild(row);
  }
}

function buildWordleKB() {
  const rows = [['Q','W','E','R','T','Y','U','I','O','P'],['A','S','D','F','G','H','J','K','L','Ñ'],['ENTER','Z','X','C','V','B','N','M','⌫']];
  const kb = document.getElementById('wordle-kb'); kb.innerHTML = '';
  rows.forEach(keys => {
    const row = document.createElement('div'); row.className = 'wordle-key-row';
    keys.forEach(k => {
      const btn = document.createElement('div');
      btn.className = 'wordle-key' + (k.length > 1 ? ' wide' : '');
      btn.id = 'wk-' + k; btn.textContent = k;
      btn.onclick = () => wordleKey(k);
      row.appendChild(btn);
    });
    kb.appendChild(row);
  });
}

window.wordleKey = function(k) {
  if (wordleOver) return;
  if (k === '⌫') wordleCurrent = wordleCurrent.slice(0,-1);
  else if (k === 'ENTER') { if (wordleCurrent.length < 5) { window.showToast('5 letras'); return; } submitWordle(); return; }
  else if (wordleCurrent.length < 5) wordleCurrent += k;
  updateWordleRow();
};

function updateWordleRow() {
  const row = wordleGuesses.length;
  for (let c = 0; c < 5; c++) {
    const cell = document.getElementById(`wc-${row}-${c}`);
    cell.textContent = wordleCurrent[c] || '';
    cell.className = 'wordle-cell' + (wordleCurrent[c] ? ' filled' : '');
  }
}

function submitWordle() {
  const guess = wordleCurrent;
  const result = checkGuess(guess, wordleWord);
  const row = wordleGuesses.length;
  result.forEach((r, c) => {
    const cell = document.getElementById(`wc-${row}-${c}`);
    cell.textContent = guess[c]; cell.className = 'wordle-cell ' + r;
    const kb = document.getElementById('wk-' + guess[c]);
    if (kb) {
      const cur = kb.className;
      if (!cur.includes('correct') && !(cur.includes('present') && r === 'absent'))
        kb.className = 'wordle-key' + (guess[c].length > 1 ? ' wide' : '') + ' ' + r;
    }
  });
  wordleGuesses.push(guess); wordleCurrent = '';
  if (guess === wordleWord) { document.getElementById('wordle-msg').textContent = '¡Lo encontraste! ✦'; wordleOver = true; }
  else if (wordleGuesses.length >= 6) { document.getElementById('wordle-msg').textContent = 'Era: ' + wordleWord; wordleOver = true; }
}

function checkGuess(guess, word) {
  const res = Array(5).fill('absent');
  const wArr = word.split(''), gArr = guess.split('');
  gArr.forEach((l, i) => { if (l === wArr[i]) { res[i] = 'correct'; wArr[i] = null; gArr[i] = null; } });
  gArr.forEach((l, i) => { if (!l) return; const j = wArr.indexOf(l); if (j !== -1) { res[i] = 'present'; wArr[j] = null; } });
  return res;
}

document.addEventListener('keydown', e => {
  const sec = document.getElementById('game-wordle');
  if (!sec || !sec.classList.contains('active')) return;
  if (e.key === 'Backspace') wordleKey('⌫');
  else if (e.key === 'Enter') wordleKey('ENTER');
  else if (/^[a-záéíóúñA-ZÁÉÍÓÚÑ]$/.test(e.key)) wordleKey(e.key.toUpperCase());
});

window.showWordle = function() {
  document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
  document.getElementById('game-wordle').classList.add('active');
  if (!wordleWord) window.initWordle();
};

window.hideWordle = function() {
  document.getElementById('game-wordle').classList.remove('active');
  document.getElementById('section-games').classList.add('active');
};
