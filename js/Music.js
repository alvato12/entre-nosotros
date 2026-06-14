// ── music.js: Banda sonora MP3, Top10, canciones Spotify ──

// ── BANDA SONORA ──
const BS_TRACKS = [
  { title: 'Vampire — Olivia Rodrigo', url: 'https://res.cloudinary.com/datmyeovg/video/upload/v1781388196/ytmp3free.cc_olivia-rodrigo-vampire-karaoke-version-youtubemp3free.org_y1xoeb.mp3' },
  { title: 'Soleao — Myke Towers',     url: 'https://res.cloudinary.com/datmyeovg/video/upload/v1781388197/ytmp3free.cc_myke-towers-quevedo-soleao-version-karaoke-youtubemp3free.org_j5o67q.mp3' }
];
let bsAudio = new Audio(BS_TRACKS[0].url);
bsAudio.volume = 0.6;
let bsIndex = 0;
let bsPlaying = false;

bsAudio.addEventListener('ended', () => {
  bsIndex = (bsIndex + 1) % BS_TRACKS.length;
  bsLoadAndPlay(bsIndex);
});

function bsLoadAndPlay(idx) {
  bsAudio.pause();
  bsIndex = idx;
  bsAudio.src = BS_TRACKS[idx].url;
  bsAudio.volume = (document.getElementById('bs-volume')?.value || 60) / 100;
  document.getElementById('bs-title').textContent = BS_TRACKS[idx].title;
  BS_TRACKS.forEach((_, i) => {
    const b = document.getElementById('bs-btn-' + i);
    if (b) b.classList.toggle('btn-accent', i === idx);
  });
  if (bsPlaying) bsAudio.play();
}

window.bsSelect = function(idx) {
  bsPlaying = true;
  bsLoadAndPlay(idx);
  bsAudio.play();
  document.getElementById('bs-play').textContent = '⏸ Pausa';
};

window.bsToggle = function() {
  if (bsPlaying) {
    bsAudio.pause(); bsPlaying = false;
    document.getElementById('bs-play').textContent = '▶ Play';
  } else {
    bsAudio.play(); bsPlaying = true;
    document.getElementById('bs-play').textContent = '⏸ Pausa';
  }
};

window.bsVolume = function(v) { bsAudio.volume = v / 100; };

// ── TOP 10 ──
let _top10Person = '';

function spotifyToEmbed(url) {
  if (!url) return null;
  const m = url.match(/open\.spotify\.com\/(?:intl-[a-z]+\/)?(?:[a-z]{2}\/)?(?:embed\/)?(track|album|playlist|episode)\/([a-zA-Z0-9]+)/);
  if (!m) return null;
  return `https://open.spotify.com/embed/${m[1]}/${m[2]}?utm_source=generator&theme=0`;
}
window.spotifyToEmbed = spotifyToEmbed;

window.renderTop = function(person, songs) {
  const el = document.getElementById('top-' + person);
  if (!el) return;
  el.innerHTML = '';
  const valid = (songs || []).filter(Boolean);
  if (valid.length === 0) {
    el.innerHTML = '<div class="top-empty">Lista vacía — pega enlaces de Spotify para cada canción</div>';
    return;
  }
  let rank = 0;
  songs.forEach(s => {
    if (!s) return;
    rank++;
    const embedUrl = spotifyToEmbed(s);
    const row = document.createElement('div');
    row.className = 'top-item';
    const numEl = document.createElement('span');
    numEl.className = 'top-num';
    numEl.textContent = rank;
    const embedWrap = document.createElement('div');
    embedWrap.style.cssText = 'flex:1;min-width:0';
    if (embedUrl) {
      const iframe = document.createElement('iframe');
      iframe.src = embedUrl; iframe.height = '80';
      iframe.setAttribute('frameborder','0');
      iframe.allow = 'autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture';
      iframe.loading = 'lazy';
      iframe.style.cssText = 'width:100%;border-radius:8px;border:none;display:block';
      embedWrap.appendChild(iframe);
    } else {
      embedWrap.innerHTML = `<div style="font-size:0.8rem;color:var(--text2);padding:0.6rem 0;font-style:italic">${window.escHtml(s)}</div>`;
    }
    row.appendChild(numEl); row.appendChild(embedWrap);
    el.appendChild(row);
  });
};

window.openTopModal = function(person) {
  _top10Person = person;
  document.getElementById('top10-modal-title').textContent = 'Top 10 · ' + (person === 'carmen' ? 'Carmen' : 'Álvaro');
  const container = document.getElementById('top10-inputs');
  container.innerHTML = '';
  const songs = (window._top10 || {})[person] || [];
  for (let i = 0; i < 10; i++) {
    const wrap = document.createElement('div');
    wrap.style.cssText = 'display:flex;align-items:center;gap:0.5rem';
    const num = document.createElement('span');
    num.style.cssText = "font-family:'Cormorant Garamond',serif;font-style:italic;color:var(--text3);width:20px;text-align:right;flex-shrink:0";
    num.textContent = i + 1;
    const inp = document.createElement('input');
    inp.type = 'text'; inp.value = songs[i] || '';
    inp.placeholder = 'Enlace de Spotify (canción ' + (i+1) + ')';
    inp.style.flex = '1'; inp.id = 'top-input-' + i;
    wrap.appendChild(num); wrap.appendChild(inp);
    container.appendChild(wrap);
  }
  window.openModal('modal-top10');
};

window.saveTop10 = async function() {
  if (!window._db) { window.showToast('Configura Firebase primero'); return; }
  const songs = [];
  for (let i = 0; i < 10; i++) {
    songs.push(document.getElementById('top-input-' + i)?.value.trim() || '');
  }
  await window._setDoc('top10', _top10Person, { songs });
  window.closeModal('modal-top10');
  window.showToast('Lista guardada ✦');
};

// ── CANCIONES SPOTIFY COMPARTIDAS ──
function spotifyEmbed(url) {
  if (!url) return null;
  const m = url.match(/open\.spotify\.com\/(?:intl-[a-z]+\/)?(?:embed\/)?(track|album|playlist|episode)\/([a-zA-Z0-9]+)/);
  if (!m) return null;
  return `https://open.spotify.com/embed/${m[1]}/${m[2]}?utm_source=generator&theme=0`;
}

window.renderMusic = function() {
  const grid = document.getElementById('music-grid');
  const empty = document.getElementById('music-empty');
  const tracks = window._music || {};
  const ids = Object.keys(tracks);
  if (ids.length === 0) { empty.style.display = ''; return; }
  empty.style.display = 'none';
  while (grid.children.length > 1) grid.removeChild(grid.lastChild);
  ids.forEach(id => {
    const t = tracks[id];
    const embedUrl = spotifyEmbed(t.url);
    if (!embedUrl) return;
    const card = document.createElement('div');
    card.className = 'spotify-card';
    card.innerHTML = `<iframe src="${window.escHtml(embedUrl)}" height="152" allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture" loading="lazy"></iframe>
      <div class="spotify-card-meta">
        <span class="spotify-card-label">♫ ${window.escHtml(t.label||'')}</span>
        <button class="btn btn-sm" style="opacity:0.5" onclick="deleteMusic('${id}')">✕</button>
      </div>`;
    grid.appendChild(card);
  });
};

window.addMusic = async function() {
  const url = document.getElementById('music-url').value.trim();
  const label = document.getElementById('music-label').value.trim();
  if (!url) { window.showToast('Introduce un enlace de Spotify'); return; }
  if (!spotifyEmbed(url)) { window.showToast('Enlace de Spotify no válido'); return; }
  if (!window._db) { window.showToast('Configura Firebase primero'); return; }
  await window._addDoc('music', { url, label });
  window.closeModal('modal-add-music');
  document.getElementById('music-url').value = '';
  document.getElementById('music-label').value = '';
};

window.deleteMusic = async function(id) {
  if (!window._db) return;
  await window._deleteDoc('music', id);
};
