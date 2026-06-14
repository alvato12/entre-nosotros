// ── links.js: Links con análisis Gemini ──

// ── LINKS ──
function initLinks() {
  if (!window._db) return;
  const q = query(collection(db, 'links'), orderBy('ts', 'desc'));
  onSnapshot(q, snap => {
    window._links = {};
    snap.forEach(d => { window._links[d.id] = d.data(); });
    renderLinks();
  });
}

// ── GEMINI API key ──
const GEMINI_KEY = 'AQ.Ab8RN6IFZIAoYjUVkyHl_cITgYXypdFXB0DmYcUrx5ywWYQQkg';

// ── Detectar tipo de URL ──
function detectLinkType(url) {
  if (!url) return 'web';
  const u = url.toLowerCase();
  if (u.includes('youtube.com/watch') || u.includes('youtu.be/')) return 'youtube';
  if (u.includes('open.spotify.com')) return 'spotify';
  if (u.includes('instagram.com')) return 'instagram';
  if (u.includes('twitter.com') || u.includes('x.com')) return 'twitter';
  if (u.includes('github.com')) return 'github';
  if (u.includes('reddit.com')) return 'reddit';
  return 'web';
}

function getDomain(url) {
  try { return new URL(url).hostname.replace('www.',''); } catch { return url; }
}

function getFaviconUrl(url) {
  try {
    const domain = new URL(url).origin;
    return `https://www.google.com/s2/favicons?domain=${domain}&sz=32`;
  } catch { return ''; }
}

function getYoutubeId(url) {
  const m = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
  return m ? m[1] : null;
}

function getSpotifyEmbed(url) {
  const m = url.match(/open\.spotify\.com\/(?:intl-[a-z]+\/)?(?:[a-z]{2}\/)?(?:embed\/)?(track|album|playlist|episode)\/([a-zA-Z0-9]+)/);
  return m ? `https://open.spotify.com/embed/${m[1]}/${m[2]}?utm_source=generator&theme=0` : null;
}

// ── Gemini analiza el link ──
let _linkDebounce = null;
let _linkData = null;

window.linkUrlChanged = function() {
  clearTimeout(_linkDebounce);
  _linkData = null;
  document.getElementById('btn-save-link').disabled = true;
  document.getElementById('link-ai-preview').style.display = 'none';
  const url = document.getElementById('link-url').value.trim();
  if (!url || !url.startsWith('http')) { document.getElementById('link-ai-status').textContent = ''; return; }
  document.getElementById('link-ai-status').textContent = '✦ Analizando…';
  _linkDebounce = setTimeout(() => analyzeLink(url), 800);
};

async function analyzeLink(url) {
  const type = detectLinkType(url);

  // YouTube: thumbnail directa, pero pedimos título a Gemini
  if (type === 'youtube') {
    const vid = getYoutubeId(url);
    _linkData = {
      url, type: 'youtube',
      title: 'Cargando título…',
      desc: '',
      thumb: vid ? `https://img.youtube.com/vi/${vid}/maxresdefault.jpg` : '',
      embedId: vid,
      favicon: getFaviconUrl(url)
    };
    showLinkPreview(_linkData);
    // fetch title from Gemini in background
    try {
      const prompt = `Esta es una URL de YouTube: ${url}
Devuelve SOLO un JSON válido sin markdown:
{"title":"título del vídeo (máx 80 chars)","desc":"descripción breve (máx 100 chars)"}`;
      const resp = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_KEY}`, {
        method: 'POST', headers: {'Content-Type':'application/json'},
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
      });
      const data = await resp.json();
      let text = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
      text = text.replace(/```json|```/g,'').trim();
      const parsed = JSON.parse(text);
      _linkData.title = parsed.title || _linkData.title;
      _linkData.desc = parsed.desc || '';
      showLinkPreview(_linkData);
    } catch(e) {
      _linkData.title = 'Vídeo de YouTube';
      showLinkPreview(_linkData);
    }
    return;
  }
  if (type === 'spotify') {
    const embed = getSpotifyEmbed(url);
    _linkData = { url, type: 'spotify', title: 'Canción / Playlist de Spotify', desc: '', embedUrl: embed };
    showLinkPreview(_linkData);
    return;
  }

  // Para el resto: Gemini
  try {
    const prompt = `Analiza esta URL y devuelve SOLO un objeto JSON válido sin markdown, sin explicaciones, sin bloques de código.
URL: ${url}

El JSON debe tener exactamente estas claves:
{
  "title": "título de la página o contenido (máx 80 chars)",
  "desc": "descripción breve del contenido (máx 120 chars)",
  "type": "uno de: noticia, artículo, vídeo, herramienta, tienda, red_social, repositorio, documentación, juego, receta, música, otro",
  "emoji": "un emoji que represente el tipo de contenido"
}`;

    const resp = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
    });
    const data = await resp.json();
    let text = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
    // strip possible markdown fences
    text = text.replace(/```json|```/g, '').trim();
    const parsed = JSON.parse(text);
    _linkData = { url, type, ...parsed, favicon: getFaviconUrl(url) };
    showLinkPreview(_linkData);
  } catch(err) {
    // fallback sin Gemini
    _linkData = { url, type, title: getDomain(url), desc: '', emoji: '🔗', favicon: getFaviconUrl(url) };
    showLinkPreview(_linkData);
    document.getElementById('link-ai-status').textContent = '⚠ Sin análisis AI — guardado con datos básicos';
  }
}

function showLinkPreview(data) {
  const preview = document.getElementById('link-ai-preview');
  const thumbWrap = document.getElementById('link-preview-thumb-wrap');
  const typeEl = document.getElementById('link-preview-type');
  const titleEl = document.getElementById('link-preview-title');
  const descEl = document.getElementById('link-preview-desc');
  const status = document.getElementById('link-ai-status');

  thumbWrap.innerHTML = '';
  if (data.type === 'youtube' && data.thumb) {
    thumbWrap.innerHTML = `<img src="${window.escHtml(data.thumb)}" style="width:100%;aspect-ratio:16/9;object-fit:cover;display:block" loading="lazy">`;
  } else if (data.type === 'spotify' && data.embedUrl) {
    thumbWrap.innerHTML = `<iframe src="${window.escHtml(data.embedUrl)}" height="80" frameborder="0" allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture" style="width:100%;border:none;display:block"></iframe>`;
  }

  const typeLabels = { youtube:'YouTube', spotify:'Spotify', noticia:'Noticia', artículo:'Artículo', vídeo:'Vídeo', herramienta:'Herramienta', tienda:'Tienda', red_social:'Red social', repositorio:'Repositorio', documentación:'Docs', juego:'Juego', receta:'Receta', música:'Música', otro:'Web', web:'Web', github:'GitHub', instagram:'Instagram', twitter:'Twitter/X', reddit:'Reddit' };
  typeEl.textContent = (data.emoji ? data.emoji + ' ' : '') + (typeLabels[data.type] || data.type);
  titleEl.textContent = data.title || getDomain(data.url);
  descEl.textContent = data.desc || '';
  preview.style.display = 'block';
  status.textContent = '✦ Análisis completado';
  document.getElementById('btn-save-link').disabled = false;
}

function buildLinkCard(id, l) {
  const type = l.type || detectLinkType(l.url);
  let card;

  if (type === 'youtube' && l.embedId) {
    // YouTube: thumbnail con botón play que carga el iframe al hacer clic
    card = document.createElement('div');
    card.className = 'link-card type-youtube';

    const thumbWrap = document.createElement('div');
    thumbWrap.style.cssText = 'position:relative;cursor:pointer;aspect-ratio:16/9;overflow:hidden;background:#000';

    const thumb = document.createElement('img');
    thumb.className = 'link-card-thumb';
    thumb.src = `https://img.youtube.com/vi/${l.embedId}/maxresdefault.jpg`;
    thumb.alt = l.title || '';
    thumb.loading = 'lazy';
    thumb.onerror = () => { thumb.src = `https://img.youtube.com/vi/${l.embedId}/hqdefault.jpg`; };
    thumb.style.cssText = 'width:100%;height:100%;object-fit:cover;display:block;transition:transform 0.3s,filter 0.3s';

    const playBtn = document.createElement('div');
    playBtn.style.cssText = 'position:absolute;inset:0;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,0.25);transition:background 0.2s';
    playBtn.innerHTML = '<div style="width:60px;height:60px;background:rgba(255,0,0,0.9);border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:1.5rem;box-shadow:0 4px 20px rgba(0,0,0,0.4)">▶</div>';

    thumbWrap.addEventListener('mouseenter', () => {
      thumb.style.transform = 'scale(1.03)';
      thumb.style.filter = 'brightness(0.85)';
      playBtn.style.background = 'rgba(0,0,0,0.4)';
    });
    thumbWrap.addEventListener('mouseleave', () => {
      thumb.style.transform = '';
      thumb.style.filter = '';
      playBtn.style.background = 'rgba(0,0,0,0.25)';
    });
    thumbWrap.addEventListener('click', () => {
      // swap to embed
      thumbWrap.innerHTML = '';
      const iframe = document.createElement('iframe');
      iframe.src = `https://www.youtube.com/embed/${l.embedId}?autoplay=1&rel=0`;
      iframe.allow = 'autoplay; encrypted-media; picture-in-picture';
      iframe.allowFullscreen = true;
      iframe.style.cssText = 'width:100%;height:100%;border:none;display:block';
      thumbWrap.style.aspectRatio = '16/9';
      thumbWrap.appendChild(iframe);
    });

    thumbWrap.appendChild(thumb);
    thumbWrap.appendChild(playBtn);
    card.appendChild(thumbWrap);

  } else if (type === 'spotify' && l.embedUrl) {
    card = document.createElement('div');
    card.className = 'link-card type-spotify';
    const iframe = document.createElement('iframe');
    iframe.src = l.embedUrl;
    iframe.height = '152';
    iframe.setAttribute('frameborder','0');
    iframe.allow = 'autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture';
    iframe.className = 'link-card-embed';
    iframe.loading = 'lazy';
    card.appendChild(iframe);

  } else {
    card = document.createElement('a');
    card.className = 'link-card';
    card.href = l.url;
    card.target = '_blank';
    card.rel = 'noopener';
    // thumbnail or emoji placeholder
    const thumbWrap = document.createElement('div');
    thumbWrap.style.cssText = 'position:relative;overflow:hidden';
    if (l.thumb) {
      const img = document.createElement('img');
      img.className = 'link-card-thumb';
      img.src = l.thumb;
      img.alt = '';
      img.loading = 'lazy';
      img.style.cssText = 'transition:transform 0.3s';
      img.onerror = () => {
        img.style.display = 'none';
        const ph = document.createElement('div');
        ph.className = 'link-card-thumb-placeholder';
        ph.textContent = l.emoji || '🔗';
        thumbWrap.appendChild(ph);
      };
      thumbWrap.appendChild(img);
    } else {
      const ph = document.createElement('div');
      ph.className = 'link-card-thumb-placeholder';
      // type-specific emoji/icon
      const typeIcons = { noticia:'📰', artículo:'📝', vídeo:'🎬', herramienta:'🛠️', tienda:'🛍️', red_social:'📱', repositorio:'💻', documentación:'📚', juego:'🎮', receta:'🍳', música:'🎵', github:'🐙', instagram:'📸', twitter:'𝕏', reddit:'🤖' };
      ph.textContent = l.emoji || typeIcons[l.type] || '🔗';
      ph.style.fontSize = '2.5rem';
      thumbWrap.appendChild(ph);
    }
    card.appendChild(thumbWrap);
  }

  // ── body info (all types) ──
  const body = document.createElement('div');
  body.className = 'link-card-body';

  // meta row: favicon + domain + badge
  const meta = document.createElement('div');
  meta.className = 'link-card-meta';

  const fav = document.createElement('img');
  fav.className = 'link-card-favicon';
  fav.src = l.favicon || getFaviconUrl(l.url);
  fav.onerror = () => fav.style.display = 'none';
  meta.appendChild(fav);

  const domain = document.createElement('span');
  domain.className = 'link-card-domain';
  domain.textContent = getDomain(l.url);
  meta.appendChild(domain);

  if (l.type && l.type !== 'web') {
    const typeLabels = { youtube:'YouTube', spotify:'Spotify', noticia:'Noticia', artículo:'Artículo', vídeo:'Vídeo', herramienta:'Herramienta', tienda:'Tienda', red_social:'Red social', repositorio:'Repo', documentación:'Docs', juego:'Juego', receta:'Receta', música:'Música', github:'GitHub', instagram:'Instagram', twitter:'Twitter/X', reddit:'Reddit' };
    const badge = document.createElement('span');
    badge.className = 'link-card-type-badge';
    badge.textContent = typeLabels[l.type] || l.type;
    meta.appendChild(badge);
  }
  body.appendChild(meta);

  // title
  const titleEl = document.createElement('div');
  titleEl.className = 'link-card-title';
  titleEl.textContent = l.title || getDomain(l.url);
  body.appendChild(titleEl);

  // description
  if (l.desc) {
    const descEl = document.createElement('div');
    descEl.className = 'link-card-desc';
    descEl.textContent = l.desc;
    body.appendChild(descEl);
  }

  card.appendChild(body);

  // delete btn (always on top-right)
  const delBtn = document.createElement('button');
  delBtn.className = 'link-card-delete';
  delBtn.innerHTML = '✕';
  delBtn.title = 'Eliminar';
  delBtn.addEventListener('click', async (e) => {
    e.preventDefault(); e.stopPropagation();
    const _db = window._db;
    const { deleteDoc, doc } = window._fb;
    await deleteDoc(doc(_db, 'links', id));
    window.showToast('Link eliminado');
  });
  card.appendChild(delBtn);

  return card;
}

function renderLinks() {
  const grid = document.getElementById('links-grid');
  const empty = document.getElementById('links-empty');
  const links = window._links || {};
  const ids = Object.keys(links);
  if (ids.length === 0) { empty.style.display = ''; return; }
  empty.style.display = 'none';
  while (grid.children.length > 1) grid.removeChild(grid.lastChild);
  ids.forEach(id => {
    const l = links[id];
    const card = buildLinkCard(id, l);
    grid.appendChild(card);
  });
}

window.addLink = async function() {
  if (!_linkData) { window.showToast('Espera al análisis del link'); return; }
  if (!window._db) { window.showToast('Configura Firebase primero'); return; }
  const saveData = {
    url: _linkData.url,
    title: _linkData.title || getDomain(_linkData.url),
    desc: _linkData.desc || '',
    type: _linkData.type || 'web',
    emoji: _linkData.emoji || '🔗',
    favicon: _linkData.favicon || getFaviconUrl(_linkData.url),
    thumb: _linkData.thumb || '',
    embedId: _linkData.embedId || '',
    embedUrl: _linkData.embedUrl || '',
    ts: serverTimestamp()
  };
  await addDoc(collection(db, 'links'), saveData);
  window.closeModal('modal-add-link');
  document.getElementById('link-url').value = '';
  document.getElementById('link-ai-preview').style.display = 'none';
  document.getElementById('link-ai-status').textContent = '';
  document.getElementById('btn-save-link').disabled = true;
  _linkData = null;
  window.showToast('Link guardado ✦');
};

window.deleteLink = async function(e, id) {
  e.preventDefault(); e.stopPropagation();
  const _db = window._db;
  const { deleteDoc, doc } = window._fb;
  if (!_db) return;
  await deleteDoc(doc(_db, 'links', id));
};
