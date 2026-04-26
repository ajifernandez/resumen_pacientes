/**
 * core.js - Lógica central, almacenamiento y utilidades globales
 */

// ── Gestión de Temas ──────────────────────────────────────────────────
function toggleTheme() {
    const current = document.documentElement.getAttribute('data-theme');
    const target = current === 'dark' ? 'light' : 'dark';
    applyTheme(target);
}

function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('clinicTheme', theme);
    
    const icon = document.getElementById('theme-toggle-icon');
    if (icon) icon.textContent = theme === 'dark' ? '☀️' : '🌙';
    
    // Notificar a otros módulos si es necesario (ej: Chart.js)
    if (window.updateStats) window.updateStats();
    if (window.initCompare) window.initCompare();
}

function loadTheme() {
    const saved = localStorage.getItem('clinicTheme') || 'light';
    applyTheme(saved);
}

// Inicializar tema lo antes posible
loadTheme();

// ── Resto de variables de estado global ───────────────────────────────

// Variables de estado global
let CATEGORIES = (() => {
    try {
        const s = localStorage.getItem('clinicCategories');
        if (s) { const a = JSON.parse(s); if (Array.isArray(a) && a.length > 0) return a; }
    } catch(e) {}
    return DEFAULT_CATEGORIES.slice();
})();
let COLORS = CATEGORIES.map((_, i) => COLOR_PALETTE[i % COLOR_PALETTE.length]);

let pieChart, barChart, lineChart, annualChart, compareLineChart, compareAnnualChart;
const chartMap = {};

let _currentDoctorId = null;
let _pendingCategories = null;

// ── Gestión de Médicos ──────────────────────────────────────────────────

function getDoctors() {
    return JSON.parse(localStorage.getItem('clinicDoctors') || '[]');
}

function saveDoctors(docs) {
    localStorage.setItem('clinicDoctors', JSON.stringify(docs));
}

function getCurrentDoctorId() {
    if (_currentDoctorId) return _currentDoctorId;
    const stored = localStorage.getItem('clinicCurrentDoctor');
    if (stored) { _currentDoctorId = stored; return stored; }
    const docs = getDoctors();
    if (docs.length > 0) { _currentDoctorId = docs[0].id; return docs[0].id; }
    return null;
}

function getCurrentDoctor() {
    const id = getCurrentDoctorId();
    if (!id) return null;
    return getDoctors().find(d => d.id === id) || null;
}

/** Prefija una clave de localStorage con el ID del médico actual */
function dk(base) {
    const id = getCurrentDoctorId();
    return id ? `${base}_${id}` : base;
}

function switchDoctor(id) {
    _currentDoctorId = id;
    localStorage.setItem('clinicCurrentDoctor', id);
    refreshCategories();
    
    // Disparar eventos de actualización (si las funciones existen)
    if (window.initDailyTable) initDailyTable();
    if (window.loadDayData) loadDayData();
    if (window.updateGlobalMonthSelect) updateGlobalMonthSelect();
    if (window.loadMonthlyData) loadMonthlyData();
    if (window.updateHeader) updateHeader();
    if (window.updateDoctorBar) updateDoctorBar();
    
    const configTab = document.getElementById('config-tab');
    if (configTab && configTab.style.display !== 'none') {
        if (window.loadPrices) loadPrices();
        _pendingCategories = null;
        if (window.renderCategoryList) renderCategoryList();
        if (window.updateLogoPreview) updateLogoPreview();
        if (window.renderDoctorManager) renderDoctorManager();
    }
    const doc = getDoctors().find(d => d.id === id);
    toast(`Médico: ${doc ? doc.name : id}`, 'info');
}

function updateDoctorBar() {
    const sel = document.getElementById('doctorSelect');
    if (!sel) return;
    const docs = getDoctors();
    const curId = getCurrentDoctorId();
    sel.innerHTML = docs.map(d =>
        `<option value="${d.id}" ${d.id === curId ? 'selected' : ''}>${d.name}${d.specialty ? ' · ' + d.specialty : ''}</option>`
    ).join('');
    const bar = document.getElementById('doctorBar');
    if (bar) bar.style.display = docs.length > 0 ? 'flex' : 'none';
}

function migrateIfNeeded() {
    const docs = getDoctors();
    if (docs.length > 0) {
        const stored = localStorage.getItem('clinicCurrentDoctor');
        if (stored && docs.find(d => d.id === stored)) {
            _currentDoctorId = stored;
        } else {
            _currentDoctorId = docs[0].id;
            localStorage.setItem('clinicCurrentDoctor', _currentDoctorId);
        }
        return;
    }
    const info = JSON.parse(localStorage.getItem('clinicInfo') || '{}');
    const id = 'doc_' + Date.now();
    const doctor = {
        id,
        name:      info.doctor      || 'Médico 1',
        specialty: info.specialty   || '',
        nif:       info.nif         || '',
        phone:     info.phone       || ''
    };
    saveDoctors([doctor]);
    _currentDoctorId = id;
    localStorage.setItem('clinicCurrentDoctor', id);
}

// ── Almacenamiento y Datos ───────────────────────────────────────────────

function getEntries() {
    return JSON.parse(localStorage.getItem(dk('clinicEntries')) || '[]');
}

function saveEntries(entries) {
    localStorage.setItem(dk('clinicEntries'), JSON.stringify(entries));
}

function getPrices() {
    const saved = JSON.parse(localStorage.getItem(dk('clinicPrices')) || '{}');
    return { ...DEFAULT_PRICES, ...saved };
}

function savePricesToStorage(prices) {
    localStorage.setItem(dk('clinicPrices'), JSON.stringify(prices));
}

function getPriceOverrides() {
    return JSON.parse(localStorage.getItem(dk('clinicPriceOverrides')) || '{}');
}

function savePriceOverrides(overrides) {
    localStorage.setItem(dk('clinicPriceOverrides'), JSON.stringify(overrides));
}

function getEffectivePrices(month) {
    const overrides = getPriceOverrides()[month] || {};
    const base = getPrices();
    return { ...base, ...overrides };
}

function getCommissions() {
    return JSON.parse(localStorage.getItem(dk('clinicCommissions')) || '{}');
}

function saveCommissions(comm) {
    localStorage.setItem(dk('clinicCommissions'), JSON.stringify(comm));
}

function effectiveCommission(cat, commissions) {
    if (commissions[cat] !== undefined && commissions[cat] !== "") return parseFloat(commissions[cat]);
    return parseFloat(commissions.default || 30);
}

function getClinicInfo() {
    return JSON.parse(localStorage.getItem('clinicInfo') || '{}');
}

function nextId() {
    const id = parseInt(localStorage.getItem('clinicNextId') || '0') + 1;
    localStorage.setItem('clinicNextId', String(id));
    return id;
}

// ── Utilidades ─────────────────────────────────────────────────────────

function catId(cat) {
    return cat.replace(/\s+/g, '_');
}

function parseLocalDate(str) {
    const [y, m, d] = str.split('-').map(Number);
    return new Date(y, m - 1, d);
}

function formatDate(str) {
    return parseLocalDate(str).toLocaleDateString('es-ES', {
        weekday: 'short', day: '2-digit', month: '2-digit', year: 'numeric'
    });
}

function formatMonth(str) {
    const [y, m] = str.split('-').map(Number);
    return new Date(y, m - 1, 1).toLocaleDateString('es-ES', {
        month: 'long', year: 'numeric'
    });
}

function getCurrentMonth() {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

function formatCurrency(val) {
    return new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(val);
}

function refreshCategories() {
    try {
        const s = localStorage.getItem(dk('clinicCategories'));
        if (s) { const a = JSON.parse(s); if (Array.isArray(a) && a.length > 0) { CATEGORIES = a; COLORS = a.map((_, i) => COLOR_PALETTE[i % COLOR_PALETTE.length]); return; } }
    } catch(e) {}
    CATEGORIES = DEFAULT_CATEGORIES.slice();
    COLORS = CATEGORIES.map((_, i) => COLOR_PALETTE[i % COLOR_PALETTE.length]);
}

let toastTimer;
function toast(msg, type = 'success', duration = 3000) {
    const el = document.getElementById('toast');
    if (!el) return;
    el.textContent = msg;
    el.className = `${type} show`;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove('show'), duration);
}

function showInlineMsg(id, msg, duration = 5000) {
    const el = document.getElementById(id);
    if (!el) return;
    el.textContent = msg;
    el.style.display = 'inline';
    clearTimeout(el._t);
    el._t = setTimeout(() => { el.style.display = 'none'; }, duration);
}

function downloadFile(content, fileName, contentType) {
    const a = document.createElement("a");
    const file = new Blob([content], { type: contentType });
    a.href = URL.createObjectURL(file);
    a.download = fileName;
    a.click();
    URL.revokeObjectURL(a.href);
}
