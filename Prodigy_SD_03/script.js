const STORAGE_KEY = 'contactsphere.contacts.v1';
const THEME_KEY = 'contactsphere.theme';

let contacts = loadContacts();
let currentFilter = 'all';
let currentSort = 'recent';
let searchTerm = '';
let editingId = null;
let pendingDeleteId = null;
let lastDeleted = null;
let undoTimer = null;

const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);

const grid = $('#contactsGrid');
const emptyState = $('#emptyState');
const viewTitle = $('#viewTitle');
const viewCount = $('#viewCount');
const searchInput = $('#searchInput');
const sortSelect = $('#sortSelect');
const sidebar = $('.sidebar');

function loadContacts() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}
function saveContacts() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(contacts));
}

function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}
function initials(name) {
  return name.trim().split(/\s+/).slice(0, 2).map(w => w[0]).join('').toUpperCase();
}
function avatarColor(name) {
  const colors = [
    'linear-gradient(135deg,#6366f1,#8b5cf6)',
    'linear-gradient(135deg,#06b6d4,#0ea5e9)',
    'linear-gradient(135deg,#f59e0b,#f97316)',
    'linear-gradient(135deg,#ec4899,#f43f5e)',
    'linear-gradient(135deg,#10b981,#059669)',
    'linear-gradient(135deg,#8b5cf6,#d946ef)',
  ];
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return colors[h % colors.length];
}
function fmtDate(ts) {
  const d = new Date(ts);
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}
function escapeHTML(s) {
  return String(s).replace(/[&<>"']/g, c =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function toast(msg, type = 'info', opts = {}) {
  const icons = { success: 'fa-circle-check', error: 'fa-circle-xmark', warn: 'fa-triangle-exclamation', info: 'fa-circle-info' };
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  el.innerHTML = `<i class="fa-solid ${icons[type] || icons.info}"></i><span>${escapeHTML(msg)}</span>`;
  if (opts.actionLabel) {
    const btn = document.createElement('button');
    btn.textContent = opts.actionLabel;
    btn.onclick = () => { opts.onAction && opts.onAction(); el.remove(); };
    el.appendChild(btn);
  }
  $('#toasts').appendChild(el);
  setTimeout(() => { el.style.opacity = '0'; el.style.transform = 'translateX(120%)'; }, opts.duration || 3500);
  setTimeout(() => el.remove(), (opts.duration || 3500) + 400);
}

function validate(data, ignoreId = null) {
  const errors = {};
  const nameOk = /^[A-Za-z][A-Za-z .'-]{1,49}$/.test(data.name);
  if (!data.name) errors.name = 'Name is required.';
  else if (!nameOk) errors.name = 'Use letters, spaces, . \' - only (2–50 chars).';

  const phoneDigits = data.phone.replace(/\D/g, '');
  if (!data.phone) errors.phone = 'Phone number is required.';
  else if (phoneDigits.length < 7 || phoneDigits.length > 15) errors.phone = 'Enter 7–15 digit number.';

  const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(data.email);
  if (!data.email) errors.email = 'Email is required.';
  else if (!emailOk) errors.email = 'Invalid email format.';

  const dupPhone = contacts.find(c => c.id !== ignoreId && c.phone.replace(/\D/g, '') === phoneDigits);
  if (!errors.phone && dupPhone) errors.phone = 'This phone number already exists.';
  const dupEmail = contacts.find(c => c.id !== ignoreId && c.email.toLowerCase() === data.email.toLowerCase());
  if (!errors.email && dupEmail) errors.email = 'This email already exists.';

  return errors;
}

function render() {
  let list = contacts.slice();
  if (currentFilter === 'favorites') list = list.filter(c => c.favorite);
  else if (currentFilter !== 'all') list = list.filter(c => c.category === currentFilter);

  if (searchTerm) {
    const q = searchTerm.toLowerCase();
    list = list.filter(c =>
      c.name.toLowerCase().includes(q) ||
      c.phone.toLowerCase().includes(q) ||
      c.email.toLowerCase().includes(q)
    );
  }

  if (currentSort === 'az') list.sort((a, b) => a.name.localeCompare(b.name));
  else if (currentSort === 'za') list.sort((a, b) => b.name.localeCompare(a.name));
  else list.sort((a, b) => b.createdAt - a.createdAt);

  const titles = { all: 'All Contacts', favorites: 'Favorites', family: 'Family', friends: 'Friends', work: 'Work', college: 'College' };
  viewTitle.textContent = titles[currentFilter] || 'Contacts';
  viewCount.textContent = `${list.length} ${list.length === 1 ? 'contact' : 'contacts'}`;

  if (list.length === 0) {
    emptyState.classList.remove('hidden');
    grid.innerHTML = '';
  } else {
    emptyState.classList.add('hidden');
    grid.innerHTML = list.map(cardHTML).join('');
  }

  updateCounts();
}

function cardHTML(c) {
  const catLabel = c.category ? c.category[0].toUpperCase() + c.category.slice(1) : '';
  return `
    <article class="card" data-id="${c.id}">
      <div class="card-top">
        <div class="avatar" style="background:${avatarColor(c.name)}">${escapeHTML(initials(c.name))}</div>
        <div style="min-width:0;flex:1">
          <div class="card-name">${escapeHTML(c.name)}</div>
          <span class="card-cat">${escapeHTML(catLabel)}</span>
        </div>
        <i class="fa-solid fa-star fav-star ${c.favorite ? 'on' : ''}" data-action="fav" title="Toggle favorite"></i>
      </div>
      <div class="card-info">
        <div><i class="fa-solid fa-phone"></i><a href="tel:${escapeHTML(c.phone)}">${escapeHTML(c.phone)}</a></div>
        <div><i class="fa-solid fa-envelope"></i><a href="mailto:${escapeHTML(c.email)}">${escapeHTML(c.email)}</a></div>
      </div>
      <div class="card-foot">
        <span class="card-date"><i class="fa-regular fa-calendar"></i> ${fmtDate(c.createdAt)}</span>
        <div class="card-actions">
          <button class="act" data-action="edit" title="Edit"><i class="fa-solid fa-pen"></i></button>
          <button class="act del" data-action="delete" title="Delete"><i class="fa-solid fa-trash"></i></button>
        </div>
      </div>
    </article>
  `;
}

function updateCounts() {
  $('#count-all').textContent = contacts.length;
  $('#count-fav').textContent = contacts.filter(c => c.favorite).length;
  ['family', 'friends', 'work', 'college'].forEach(cat => {
    $(`#count-${cat}`).textContent = contacts.filter(c => c.category === cat).length;
  });
  $('#statTotal').textContent = contacts.length;
  $('#statFav').textContent = contacts.filter(c => c.favorite).length;
  const weekAgo = Date.now() - 7 * 86400000;
  $('#statRecent').textContent = contacts.filter(c => c.createdAt >= weekAgo).length;
  $('#statCats').textContent = new Set(contacts.map(c => c.category)).size;
}

function openModal(id = null) {
  editingId = id;
  const modal = $('#contactModal');
  const form = $('#contactForm');
  form.reset();
  $$('.err').forEach(e => e.textContent = '');

  if (id) {
    const c = contacts.find(x => x.id === id);
    if (!c) return;
    $('#modalTitle').textContent = 'Edit Contact';
    $('#submitBtn').innerHTML = '<i class="fa-solid fa-check"></i> Update Contact';
    $('#contactId').value = c.id;
    $('#name').value = c.name;
    $('#phone').value = c.phone;
    $('#email').value = c.email;
    $('#category').value = c.category;
    $('#favorite').checked = !!c.favorite;
  } else {
    $('#modalTitle').textContent = 'Add Contact';
    $('#submitBtn').innerHTML = '<i class="fa-solid fa-check"></i> Save Contact';
  }
  modal.classList.add('open');
  setTimeout(() => $('#name').focus(), 100);
}
function closeModal() {
  $('#contactModal').classList.remove('open');
  editingId = null;
}

function openConfirm(id) {
  pendingDeleteId = id;
  $('#confirmModal').classList.add('open');
}
function closeConfirm() {
  $('#confirmModal').classList.remove('open');
  pendingDeleteId = null;
}

function handleSubmit(e) {
  e.preventDefault();
  const data = {
    name: $('#name').value.trim(),
    phone: $('#phone').value.trim(),
    email: $('#email').value.trim(),
    category: $('#category').value,
    favorite: $('#favorite').checked,
  };
  const errors = validate(data, editingId);
  $$('.err').forEach(e => e.textContent = '');
  if (Object.keys(errors).length) {
    Object.entries(errors).forEach(([k, v]) => {
      const el = document.querySelector(`[data-err="${k}"]`);
      if (el) el.textContent = v;
    });
    toast('Please fix the highlighted fields', 'error');
    return;
  }

  if (editingId) {
    const idx = contacts.findIndex(c => c.id === editingId);
    contacts[idx] = { ...contacts[idx], ...data, updatedAt: Date.now() };
    toast('Contact updated successfully', 'success');
  } else {
    contacts.unshift({ id: uid(), ...data, createdAt: Date.now(), updatedAt: Date.now() });
    toast('Contact added successfully', 'success');
  }
  saveContacts();
  render();
  closeModal();
}

function deleteContact(id) {
  const idx = contacts.findIndex(c => c.id === id);
  if (idx === -1) return;
  lastDeleted = { contact: contacts[idx], index: idx };
  contacts.splice(idx, 1);
  saveContacts();
  render();
  toast('Contact deleted', 'warn', {
    actionLabel: 'Undo',
    duration: 5000,
    onAction: () => {
      if (!lastDeleted) return;
      contacts.splice(lastDeleted.index, 0, lastDeleted.contact);
      saveContacts();
      render();
      toast('Contact restored', 'success');
      lastDeleted = null;
    },
  });
  clearTimeout(undoTimer);
  undoTimer = setTimeout(() => { lastDeleted = null; }, 5500);
}

function toggleFavorite(id) {
  const c = contacts.find(x => x.id === id);
  if (!c) return;
  c.favorite = !c.favorite;
  saveContacts();
  render();
}

function exportJSON() {
  if (contacts.length === 0) return toast('No contacts to export', 'warn');
  const blob = new Blob([JSON.stringify(contacts, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `contacts-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
  toast(`Exported ${contacts.length} contacts`, 'success');
}

function importJSON(file) {
  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const data = JSON.parse(e.target.result);
      if (!Array.isArray(data)) throw new Error('Invalid file format');
      let added = 0, skipped = 0;
      data.forEach(item => {
        if (!item.name || !item.phone || !item.email) { skipped++; return; }
        const phoneDigits = String(item.phone).replace(/\D/g, '');
        const dup = contacts.find(c =>
          c.phone.replace(/\D/g, '') === phoneDigits ||
          c.email.toLowerCase() === String(item.email).toLowerCase()
        );
        if (dup) { skipped++; return; }
        contacts.unshift({
          id: uid(),
          name: String(item.name),
          phone: String(item.phone),
          email: String(item.email),
          category: ['family', 'friends', 'work', 'college'].includes(item.category) ? item.category : 'friends',
          favorite: !!item.favorite,
          createdAt: item.createdAt || Date.now(),
          updatedAt: Date.now(),
        });
        added++;
      });
      saveContacts();
      render();
      toast(`Imported ${added} · Skipped ${skipped}`, added ? 'success' : 'warn');
    } catch (err) {
      toast('Invalid JSON file', 'error');
    }
  };
  reader.readAsText(file);
}

function initTheme() {
  const saved = localStorage.getItem(THEME_KEY) || 'light';
  document.documentElement.setAttribute('data-theme', saved);
  updateThemeIcon(saved);
}
function toggleTheme() {
  const cur = document.documentElement.getAttribute('data-theme');
  const next = cur === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', next);
  localStorage.setItem(THEME_KEY, next);
  updateThemeIcon(next);
}
function updateThemeIcon(theme) {
  $('#btnTheme').innerHTML = theme === 'dark'
    ? '<i class="fa-solid fa-sun"></i>'
    : '<i class="fa-solid fa-moon"></i>';
}

function bindEvents() {
  $('#btnAdd').addEventListener('click', () => openModal());

  $$('[data-close]').forEach(el => el.addEventListener('click', closeModal));
  $$('[data-cclose]').forEach(el => el.addEventListener('click', closeConfirm));

  $('#contactForm').addEventListener('submit', handleSubmit);

  $('#confirmDelete').addEventListener('click', () => {
    if (pendingDeleteId) deleteContact(pendingDeleteId);
    closeConfirm();
  });

  grid.addEventListener('click', (e) => {
    const card = e.target.closest('.card');
    if (!card) return;
    const id = card.dataset.id;
    const action = e.target.closest('[data-action]')?.dataset.action;
    if (action === 'fav') toggleFavorite(id);
    else if (action === 'edit') openModal(id);
    else if (action === 'delete') openConfirm(id);
  });

  searchInput.addEventListener('input', (e) => {
    searchTerm = e.target.value.trim();
    render();
  });

  sortSelect.addEventListener('change', (e) => {
    currentSort = e.target.value;
    render();
  });

  $$('.nav-item').forEach(item => {
    item.addEventListener('click', () => {
      $$('.nav-item').forEach(i => i.classList.remove('active'));
      item.classList.add('active');
      currentFilter = item.dataset.filter;
      render();
      sidebar.classList.remove('open');
    });
  });

  $('#btnTheme').addEventListener('click', toggleTheme);

  $('#btnSidebar').addEventListener('click', () => sidebar.classList.toggle('open'));

  $('#btnExport').addEventListener('click', exportJSON);
  $('#btnImport').addEventListener('click', () => $('#fileImport').click());
  $('#fileImport').addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) importJSON(file);
    e.target.value = '';
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === '/' && document.activeElement !== searchInput && !$('#contactModal').classList.contains('open')) {
      e.preventDefault();
      searchInput.focus();
    }
    if (e.key === 'Escape') { closeModal(); closeConfirm(); }
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
      e.preventDefault();
      openModal();
    }
  });
}

function seedIfEmpty() {
  if (contacts.length > 0) return;
  contacts = [
    { id: uid(), name: 'Aditi Sharma', phone: '9876543210', email: 'aditi@example.com', category: 'college', favorite: true, createdAt: Date.now() - 86400000 * 2, updatedAt: Date.now() },
    { id: uid(), name: 'Rahul Verma', phone: '9812345678', email: 'rahul.v@example.com', category: 'work', favorite: false, createdAt: Date.now() - 86400000, updatedAt: Date.now() },
    { id: uid(), name: 'Priya Patel', phone: '9900112233', email: 'priya@example.com', category: 'friends', favorite: true, createdAt: Date.now() - 3600000, updatedAt: Date.now() },
  ];
  saveContacts();
}

document.addEventListener('DOMContentLoaded', () => {
  initTheme();
  seedIfEmpty();
  bindEvents();
  render();
});
