// ── firebase.js: Firebase init + chat + notas + cartas + recuerdos + eventos + galería init + música init + links init ──

import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js';
import { getFirestore, collection, addDoc, onSnapshot, query, orderBy, deleteDoc, doc, serverTimestamp, setDoc }
  from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js';

// ════════════════════════════════════════════════
//  CONFIGURACIÓN FIREBASE — sustituye con tus valores
// ════════════════════════════════════════════════
const firebaseConfig = {
  apiKey: "AIzaSyBpW3GVi-iOY9X_AJ9XG1fSwrCn4pJSdFg",
  authDomain: "entre-nosotros-5c3c7.firebaseapp.com",
  projectId: "entre-nosotros-5c3c7",
  storageBucket: "entre-nosotros-5c3c7.firebasestorage.app",
  messagingSenderId: "337012960826",
  appId: "1:337012960826:web:c9d3d05ccfb36d5b14af2c"
};

let db;
try {
  const app = initializeApp(firebaseConfig);
  db = getFirestore(app);
  document.getElementById('status-dot').style.background = '#4ade80';
  document.getElementById('status-text').textContent = 'Conectado';
} catch(e) {
  document.getElementById('status-dot').style.background = '#f87171';
  document.getElementById('status-dot').style.boxShadow = '0 0 6px rgba(248,113,113,0.6)';
  document.getElementById('status-text').textContent = 'Sin Firebase';
}

// Exponer en window para scripts no-módulo
window._db = db;
window._fb = { collection, addDoc, onSnapshot, query, orderBy, deleteDoc, doc, serverTimestamp };
window._fb_extra = { setDoc, doc };

// ── CHAT ──
function initChat() {
  if (!db) return;
  const q = query(collection(db, 'chat'), orderBy('ts', 'asc'));
  onSnapshot(q, snap => {
    const msgs = document.getElementById('chat-messages');
    while (msgs.children.length > 1) msgs.removeChild(msgs.lastChild);
    snap.forEach(d => appendChatMsg(d.data(), d.id));
    msgs.scrollTop = msgs.scrollHeight;
  });
}

function appendChatMsg(data, id) {
  const msgs = document.getElementById('chat-messages');
  const mine = data.name === (localStorage.getItem('chatName') || '');
  const wrap = document.createElement('div');
  wrap.className = 'chat-msg ' + (mine ? 'mine' : 'theirs');
  const ts = data.ts ? new Date(data.ts.seconds * 1000).toLocaleTimeString('es', {hour:'2-digit',minute:'2-digit'}) : '';
  wrap.innerHTML = `<div class="chat-bubble">${window.escHtml(data.text)}</div>
    <div class="chat-msg-meta">${window.escHtml(data.name)} · ${ts}</div>`;
  msgs.appendChild(wrap);
}

window.sendMessage = async function() {
  const nameEl = document.getElementById('chat-name');
  const inputEl = document.getElementById('chat-input');
  const name = nameEl.value.trim() || 'Anónimo';
  const text = inputEl.value.trim();
  if (!text) return;
  localStorage.setItem('chatName', name);
  inputEl.value = '';
  if (!db) { window.showToast('Configura Firebase primero'); return; }
  await addDoc(collection(db, 'chat'), { name, text, ts: serverTimestamp() });
};

// ── NOTAS ──
function initNotes() {
  if (!db) return;
  const q = query(collection(db, 'notes'), orderBy('ts', 'desc'));
  onSnapshot(q, snap => {
    window._notes = {};
    snap.forEach(d => { window._notes[d.id] = d.data(); });
    window.renderNotes && window.renderNotes();
  });
}

window.addNote = async function() {
  const title = document.getElementById('note-title').value.trim();
  const body = document.getElementById('note-body').value.trim();
  const author = document.getElementById('note-author').value.trim();
  if (!title || !body) { window.showToast('Rellena título y contenido'); return; }
  if (!db) { window.showToast('Configura Firebase primero'); return; }
  await addDoc(collection(db, 'notes'), { title, body, author, ts: serverTimestamp() });
  window.closeModal('modal-add-note');
  document.getElementById('note-title').value = '';
  document.getElementById('note-body').value = '';
};

window.deleteNote = async function(e, id) {
  e.stopPropagation();
  if (!db) return;
  await deleteDoc(doc(db, 'notes', id));
};

// ── CARTAS ──
function initLetters() {
  if (!db) return;
  const q = query(collection(db, 'letters'), orderBy('ts', 'desc'));
  onSnapshot(q, snap => {
    window._letters = {};
    snap.forEach(d => { window._letters[d.id] = d.data(); });
    window.renderLetters && window.renderLetters();
  });
}

window.saveLetter = async function() {
  const from = document.getElementById('letter-from').value.trim();
  const subject = document.getElementById('letter-subject').value.trim();
  const body = document.getElementById('letter-body').value.trim();
  if (!from || !body) { window.showToast('Rellena remitente y texto'); return; }
  if (!db) { window.showToast('Configura Firebase primero'); return; }
  await addDoc(collection(db, 'letters'), { from, subject, body, ts: serverTimestamp() });
  window.closeModal('modal-write-letter');
  document.getElementById('letter-from').value = '';
  document.getElementById('letter-subject').value = '';
  document.getElementById('letter-body').value = '';
};

// ── RECUERDOS ──
function initMemories() {
  if (!db) return;
  const q = query(collection(db, 'memories'), orderBy('date', 'desc'));
  onSnapshot(q, snap => {
    window._memories = {};
    snap.forEach(d => { window._memories[d.id] = d.data(); });
    window.renderMemories && window.renderMemories();
  });
}

window.addMemory = async function() {
  const date = document.getElementById('memory-date').value;
  const title = document.getElementById('memory-title').value.trim();
  const body = document.getElementById('memory-body').value.trim();
  if (!title) { window.showToast('Escribe un título'); return; }
  if (!db) { window.showToast('Configura Firebase primero'); return; }
  await addDoc(collection(db, 'memories'), { date, title, body, ts: serverTimestamp() });
  window.closeModal('modal-add-memory');
  document.getElementById('memory-date').value = '';
  document.getElementById('memory-title').value = '';
  document.getElementById('memory-body').value = '';
};

// ── EVENTOS ──
function initEvents() {
  if (!db) return;
  const q = query(collection(db, 'events'), orderBy('date', 'asc'));
  onSnapshot(q, snap => {
    window._events = {};
    snap.forEach(d => { window._events[d.id] = d.data(); });
    window.renderCalendar && window.renderCalendar();
    window.renderEvents && window.renderEvents();
  });
}

window.addEvent = async function() {
  const name = document.getElementById('event-name').value.trim();
  const date = document.getElementById('event-date').value;
  const dateEnd = document.getElementById('event-date-end').value;
  const color = document.getElementById('event-color').value;
  if (!name || !date) { window.showToast('Rellena nombre y fecha'); return; }
  if (!db) { window.showToast('Configura Firebase primero'); return; }
  await addDoc(collection(db, 'events'), { name, date, dateEnd: dateEnd || date, color, ts: serverTimestamp() });
  window.closeModal('modal-add-event');
  document.getElementById('event-name').value = '';
  document.getElementById('event-date').value = '';
  document.getElementById('event-date-end').value = '';
};

// ── INIT ALL ──
window._top10 = {};
initChat();
initNotes();
initLetters();
initMemories();
initEvents();

// top10 listener
['carmen','alvaro'].forEach(person => {
  onSnapshot(doc(db, 'top10', person), snap => {
    if (!window._top10) window._top10 = {};
    window._top10[person] = snap.exists() ? (snap.data().songs || []) : [];
    window.renderTop && window.renderTop(person, window._top10[person]);
  });
});

// gallery, music, links init (defined in their own files but need db)
window._initGallery = function() {
  if (!db) return;
  const q = query(collection(db, 'gallery'), orderBy('ts', 'desc'));
  onSnapshot(q, snap => {
    window._photos = {};
    snap.forEach(d => { window._photos[d.id] = d.data(); });
    window.renderGallery && window.renderGallery();
  });
};
window._initGallery();

window._initMusic = function() {
  if (!db) return;
  const q = query(collection(db, 'music'), orderBy('ts', 'desc'));
  onSnapshot(q, snap => {
    window._music = {};
    snap.forEach(d => { window._music[d.id] = d.data(); });
    window.renderMusic && window.renderMusic();
  });
};
window._initMusic();

window._initLinks = function() {
  if (!db) return;
  const q = query(collection(db, 'links'), orderBy('ts', 'desc'));
  onSnapshot(q, snap => {
    window._links = {};
    snap.forEach(d => { window._links[d.id] = d.data(); });
    window.renderLinks && window.renderLinks();
  });
};
window._initLinks();

// addDoc/deleteDoc wrappers for non-module scripts
window._addDoc = (col, data) => addDoc(collection(db, col), { ...data, ts: serverTimestamp() });
window._deleteDoc = (col, id) => deleteDoc(doc(db, col, id));
window._setDoc = (col, id, data) => setDoc(doc(db, col, id), data);

const savedName = localStorage.getItem('chatName');
if (savedName) document.getElementById('chat-name').value = savedName;
