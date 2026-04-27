/**
 * app.js - Orquestador principal y Navegación
 */

document.addEventListener('DOMContentLoaded', () => {
    // Inicialización por defecto
    const dateInput = document.getElementById('entryDate');
    if (dateInput) dateInput.valueAsDate = new Date();
    
    migrateIfNeeded();
    refreshCategories();
    updateDoctorBar();
    updateHeader();
    
    // Inicializar Google Drive
    if (typeof initGoogleDrive === 'function') initGoogleDrive();
    
    // Cargar Client ID si existe
    const googleClientIdInput = document.getElementById('google-client-id');
    if (googleClientIdInput) googleClientIdInput.value = getClientId();
    
    // Cargar tab inicial (Daily)
    showTab('daily');
});

function toggleMobileTabs() {
    const tabs = document.getElementById('main-tabs');
    const selector = document.querySelector('.mobile-tab-selector');
    if (tabs) tabs.classList.toggle('expanded');
    if (selector) selector.classList.toggle('expanded');
}

function showTab(tab, btn) {
    // Actualizar clases activas en botones
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    
    let activeBtn = btn;
    if (!activeBtn) {
        activeBtn = document.querySelector(`.tab[onclick*="'${tab}'"]`);
    }
    if (activeBtn) {
        activeBtn.classList.add('active');
        const nameEl = document.getElementById('current-tab-name');
        if (nameEl) nameEl.textContent = activeBtn.textContent.trim();
    }

    // Cerrar menú móvil si está abierto
    const tabsEl = document.getElementById('main-tabs');
    if (tabsEl && tabsEl.classList.contains('expanded')) {
        tabsEl.classList.remove('expanded');
        const selector = document.querySelector('.mobile-tab-selector');
        if(selector) selector.classList.remove('expanded');
    }

    // Mostrar/Ocultar secciones
    ['daily','monthly','stats','global','compare','billing','data','config'].forEach(t => {
        const el = document.getElementById(`${t}-tab`);
        if (el) el.style.display = (t === tab) ? 'block' : 'none';
    });

    // Actualizar datos del tab seleccionado
    updateGlobalMonthSelect();

    if      (tab === 'stats')    { updateStats();    }
    else if (tab === 'global')   { if (window.updateGlobal) updateGlobal(); }
    else if (tab === 'compare')  { initCompare(); }
    else if (tab === 'billing')  { initBilling(); }
    else if (tab === 'data')     { updateDataTab(); if (typeof getClientId === 'function') document.getElementById('google-client-id').value = getClientId(); }
    else if (tab === 'config')   { loadPrices(); _pendingCategories = null; renderCategoryList(); updateLogoPreview(); renderDoctorManager(); }
    else if (tab === 'daily')    { initDailyTable(); loadDayData(); updateHistory(); }
    else if (tab === 'monthly')  { loadMonthlyData(); }
}

function onGlobalMonthChange() {
    const activeTab = ['daily','monthly','stats','global','compare','billing','data','config'].find(t => {
        const el = document.getElementById(`${t}-tab`);
        return el && el.style.display === 'block';
    });

    if      (activeTab === 'stats')   updateStats();
    else if (activeTab === 'monthly') loadMonthlyData();
    else if (activeTab === 'daily')   { loadDayData(); updateHistory(); }
    else if (activeTab === 'billing') updateBilling();
    else if (activeTab === 'global')  { if (window.updateGlobal) updateGlobal(); }
}

function updateGlobalMonthSelect() {
    const isGlobalTab = document.getElementById('global-tab')?.style.display === 'block';
    const months = isGlobalTab ? (window.getAvailableMonthsAllDoctors ? getAvailableMonthsAllDoctors() : []) : (window.getAvailableMonths ? getAvailableMonths() : []);
    
    const sel = document.getElementById('globalMonthSelect');
    if (!sel) return;
    const prev = sel.value;
    sel.innerHTML = months.map(m => `<option value="${m}">${formatMonth(m)}</option>`).join('');
    sel.value = (prev && months.includes(prev)) ? prev : (months[0] || getCurrentMonth());
}

function getAvailableMonths() {
    const months = new Set();
    const prefix = dk('clinicEntries');
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(prefix)) {
            try {
                const entries = JSON.parse(localStorage.getItem(key) || '[]');
                entries.forEach(e => months.add(e.date.substring(0, 7)));
            } catch(e) {}
        }
    }
    // Añadir últimos 3 meses por defecto
    const now = new Date();
    for (let i = 0; i < 3; i++) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        months.add(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
    }
    return [...months].sort().reverse();
}

/** Utility to toggle visibility of datasets in charts */
function toggleDataset(chart, index) {
    const meta = chart.getDatasetMeta(index);
    meta.hidden = meta.hidden === null ? !chart.data.datasets[index].hidden : null;
    chart.update();
}
