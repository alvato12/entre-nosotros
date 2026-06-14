// ── gallery.js: Galería, lightbox, subida Cloudinary ──

const CLOUDINARY_CLOUD = 'datmyeovg';
const CLOUDINARY_PRESET = 'entre nosotros';

// ── Lightbox state ──
let _lbIds = [];
let _lbIdx = 0;

window.renderGallery = function() {
  const grid = document.getElementById('gallery-grid');
  const empty = document.getElementById('gallery-empty');
  const photos = window._photos || {};
  const ids = Object.keys(photos);
  _lbIds = ids;
  if (ids.length === 0) { empty.style.display = ''; return; }
  empty.style.display = 'none';
  while (grid.children.length > 1) grid.removeChild(grid.lastChild);
  ids.forEach((id, idx) => {
    const p = photos[id];
    const item = document.createElement('div');
    item.className = 'gallery-item';
    item.style.cursor = 'pointer';
    const img = document.createElement('img');
    img.src = p.url; img.alt = p.caption || ''; img.loading = 'lazy';
    img.onerror = () => item.style.display = 'none';
    const overlay = document.createElement('div');
    overlay.className = 'gallery-item-overlay';
    const hint = document.createElement('div');
    hint.style.cssText = 'font-size:0.7rem;color:rgba(255,255,255,0.5);margin-bottom:0.2rem';
    hint.textContent = '⤢ ver a pantalla completa';
    const cap = document.createElement('div');
    cap.className = 'gallery-item-caption';
    cap.textContent = p.caption || '';
    overlay.appendChild(hint); overlay.appendChild(cap);
    item.appendChild(img); item.appendChild(overlay);
    item.addEventListener('click', () => openLightbox(idx));
    grid.appendChild(item);
  });
};

window.openLightbox = function(idx) {
  const photos = window._photos || {};
  _lbIds = Object.keys(photos);
  _lbIdx = idx;
  _lbShow();
  document.getElementById('lightbox').classList.add('open');
  document.body.style.overflow = 'hidden';
};

function _lbShow() {
  const photos = window._photos || {};
  const id = _lbIds[_lbIdx];
  const p = photos[id];
  if (!p) return;
  const imgEl = document.getElementById('lightbox-img');
  imgEl.style.opacity = '0';
  imgEl.src = p.url;
  imgEl.onload = () => { imgEl.style.opacity = '1'; };
  document.getElementById('lightbox-caption').textContent = p.caption || '';
  document.getElementById('lightbox-counter').textContent = (_lbIdx + 1) + ' / ' + _lbIds.length;
}

window.lightboxNav = function(dir) {
  _lbIdx = (_lbIdx + dir + _lbIds.length) % _lbIds.length;
  _lbShow();
};

window.closeLightbox = function() {
  document.getElementById('lightbox').classList.remove('open');
  document.body.style.overflow = '';
};

window.lightboxDelete = async function() {
  const id = _lbIds[_lbIdx];
  if (!id) return;
  if (!confirm('¿Eliminar esta foto?')) return;
  try {
    await window._deleteDoc('gallery', id);
    closeLightbox();
    window.showToast('Foto eliminada');
  } catch(err) {
    window.showToast('Error al eliminar: ' + err.message);
  }
};

document.addEventListener('keydown', e => {
  const lb = document.getElementById('lightbox');
  if (!lb || !lb.classList.contains('open')) return;
  if (e.key === 'ArrowRight') lightboxNav(1);
  else if (e.key === 'ArrowLeft') lightboxNav(-1);
  else if (e.key === 'Escape') closeLightbox();
});

// ── Upload ──
window.switchUploadTab = function(tab) {
  document.querySelectorAll('.upload-tab').forEach((t,i) => t.classList.toggle('active', (i===0&&tab==='file')||(i===1&&tab==='url')));
  document.getElementById('upload-panel-file').classList.toggle('active', tab==='file');
  document.getElementById('upload-panel-url').classList.toggle('active', tab==='url');
  window._uploadTab = tab;
};
window._uploadTab = 'file';
window._selectedFile = null;

window.handleFileSelect = function(input) {
  const file = input.files[0];
  if (!file) return;
  window._selectedFile = file;
  const reader = new FileReader();
  reader.onload = e => {
    document.getElementById('upload-preview-img').src = e.target.result;
    document.getElementById('upload-preview-name').textContent = file.name + ' (' + (file.size/1024/1024).toFixed(1) + ' MB)';
    document.getElementById('upload-preview').style.display = 'block';
  };
  reader.readAsDataURL(file);
};

document.addEventListener('DOMContentLoaded', () => {
  const dz = document.getElementById('drop-zone');
  if (!dz) return;
  dz.addEventListener('dragover', e => { e.preventDefault(); dz.classList.add('dragging'); });
  dz.addEventListener('dragleave', () => dz.classList.remove('dragging'));
  dz.addEventListener('drop', e => {
    e.preventDefault(); dz.classList.remove('dragging');
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) {
      window._selectedFile = file;
      const dt = new DataTransfer(); dt.items.add(file);
      document.getElementById('photo-file').files = dt.files;
      handleFileSelect(document.getElementById('photo-file'));
    }
  });
  document.getElementById('lightbox')?.addEventListener('click', e => {
    if (e.target.id === 'lightbox') closeLightbox();
  });
});

window.addPhoto = async function() {
  const caption = document.getElementById('photo-caption').value.trim();
  if (!window._db) { window.showToast('Configura Firebase primero'); return; }
  const tab = window._uploadTab || 'file';
  if (tab === 'url') {
    const url = document.getElementById('photo-url').value.trim();
    if (!url) { window.showToast('Introduce una URL'); return; }
    await window._addDoc('gallery', { url, caption });
    window.closeModal('modal-add-photo');
    document.getElementById('photo-url').value = '';
    document.getElementById('photo-caption').value = '';
    window.showToast('Foto añadida ✦');
    return;
  }
  const file = window._selectedFile;
  if (!file) { window.showToast('Selecciona una imagen'); return; }
  const btn = document.getElementById('btn-save-photo');
  const prog = document.getElementById('upload-progress');
  btn.disabled = true; btn.textContent = 'Subiendo…';
  prog.style.display = 'block'; prog.textContent = 'Subiendo a Cloudinary…';
  try {
    const form = new FormData();
    form.append('file', file);
    form.append('upload_preset', CLOUDINARY_PRESET);
    const resp = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD}/image/upload`, { method: 'POST', body: form });
    const data = await resp.json();
    if (data.error) throw new Error(data.error.message);
    await window._addDoc('gallery', { url: data.secure_url, caption, public_id: data.public_id });
    window.closeModal('modal-add-photo');
    document.getElementById('photo-caption').value = '';
    document.getElementById('upload-preview').style.display = 'none';
    window._selectedFile = null;
    window.showToast('Foto subida ✦');
  } catch(err) {
    window.showToast('Error al subir: ' + err.message);
  } finally {
    btn.disabled = false; btn.textContent = 'Guardar';
    prog.style.display = 'none';
  }
};
