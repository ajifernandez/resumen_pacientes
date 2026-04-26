/**
 * config.js - Configuración, Médicos y Backups
 */

// ── Gestión de Médicos ──────────────────────────────────────────────────

function renderDoctorManager() {
    const el = document.getElementById('doctorMgrContent');
    if (!el) return;
    const docs = getDoctors();
    const curId = getCurrentDoctorId();

    if (docs.length === 0) {
        el.innerHTML = '<p style="color:#94a3b8; padding:20px; text-align:center;">No hay médicos configurados.</p>';
        return;
    }

    el.innerHTML = docs.map(d => `
        <div class="doctor-item ${d.id === curId ? 'active' : ''}" onclick="switchDoctor('${d.id}')">
            <div style="flex:1;">
                <div style="font-weight:600; font-size:1.05rem;">${d.name}</div>
                <div style="font-size:0.85rem; color:var(--text-muted);">${d.specialty || 'Sin especialidad'} · ${d.nif || 'Sin NIF'}</div>
            </div>
            <div style="display:flex; gap:8px;">
                <button class="btn btn-outline btn-sm" onclick="event.stopPropagation(); editDoctor('${d.id}')">✏️</button>
                <button class="btn btn-danger btn-sm" onclick="event.stopPropagation(); removeDoctor('${d.id}')">×</button>
            </div>
        </div>
    `).join('');
}

function addDoctor() {
    const name = document.getElementById('newDoctorName').value.trim();
    const spec = document.getElementById('newDoctorSpecialty').value.trim();
    const nif  = document.getElementById('newDoctorNif').value.trim();
    const phone = document.getElementById('newDoctorPhone').value.trim();

    if (!name) { toast('El nombre es obligatorio', 'warning'); return; }

    const docs = getDoctors();
    const id = 'doc_' + Date.now();
    docs.push({ id, name, specialty: spec, nif, phone });
    saveDoctors(docs);
    
    // Limpiar campos
    ['newDoctorName','newDoctorSpecialty','newDoctorNif','newDoctorPhone'].forEach(id => document.getElementById(id).value = '');
    
    renderDoctorManager();
    updateDoctorBar();
    toast('Médico añadido');
}

function removeDoctor(id) {
    if (!confirm('¿Seguro que quieres eliminar este médico y todos sus datos?')) return;
    let docs = getDoctors();
    docs = docs.filter(d => d.id !== id);
    saveDoctors(docs);

    // Limpiar sus datos de localStorage
    const keysToRemove = [];
    for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.endsWith('_' + id)) keysToRemove.push(k);
    }
    keysToRemove.forEach(k => localStorage.removeItem(k));

    if (getCurrentDoctorId() === id) {
        localStorage.removeItem('clinicCurrentDoctor');
        _currentDoctorId = null;
        const next = getDoctors()[0];
        if (next) switchDoctor(next.id);
    }

    renderDoctorManager();
    updateDoctorBar();
    updateHeader();
    toast('Médico eliminado', 'info');
}

function editDoctor(id) {
    const doc = getDoctors().find(d => d.id === id);
    if (!doc) return;
    const newName = prompt('Nombre del médico:', doc.name);
    if (newName === null) return;
    doc.name = newName;
    doc.specialty = prompt('Especialidad:', doc.specialty || '');
    doc.nif = prompt('NIF:', doc.nif || '');
    doc.phone = prompt('Teléfono:', doc.phone || '');
    
    saveDoctors(getDoctors());
    renderDoctorManager();
    updateDoctorBar();
    updateHeader();
    toast('Datos actualizados');
}

// ── Datos de Clínica ────────────────────────────────────────────────────

function saveClinicInfo() {
    const name = document.getElementById('clinicName').value.trim();
    const address = document.getElementById('clinicAddress').value.trim();
    
    const info = getClinicInfo();
    info.name = name;
    info.address = address;
    
    localStorage.setItem('clinicInfo', JSON.stringify(info));
    updateHeader();
    showInlineMsg('clinicSaveMsg', '✓ Datos guardados');
    toast('Información de clínica guardada');
}

function updateHeader() {
    const el = document.getElementById('app-header');
    if (!el) return;
    const logo = localStorage.getItem('clinicLogo');
    const info = getClinicInfo();
    const doc  = getCurrentDoctor();
    const defaultLogo = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0iIzRmNDZlNSI+PHBhdGggZD0iTTE5IDNINWMtMS4xIDAtMiAuOS0yIDJ2MTRjMCAxLjEuOSAyIDIgMmgxNGMxLjEgMCAyLS45IDItMlY1YzAtMS4xLS45LTItMi0yem0tMSAxMWgtNHY0aC00di00SDZ2LTRoNHYtNGg0djRoNHY0eiIvPjwvc3ZnPg==';
    
    const docPart = doc?.name ? ` — ${doc.name}` : '';
    const esp     = doc?.specialty ? ` · ${doc.specialty}` : '';
    const logoSrc = logo || defaultLogo;
    
    el.innerHTML = `<img src="${logoSrc}" alt="${info.name || 'Clínica'}" style="max-height:54px; vertical-align:middle; margin-right:12px; border-radius:6px; object-fit:contain;">${info.name || ''}${docPart}${esp}`;
}

function handleLogoUpload(event) {
    const file = event.target.files[0];
    if (!file) return;
    if (file.size > 524288) { toast('El logo no debe superar 512 KB', 'warning'); return; }
    const reader = new FileReader();
    reader.onload = function(e) {
        localStorage.setItem('clinicLogo', e.target.result);
        updateLogoPreview();
        updateHeader();
        toast('Logo guardado');
    };
    reader.readAsDataURL(file);
    event.target.value = '';
}

function removeLogo() {
    localStorage.removeItem('clinicLogo');
    updateLogoPreview();
    updateHeader();
    toast('Logo eliminado', 'info');
}

function updateLogoPreview() {
    const logo = localStorage.getItem('clinicLogo');
    const img = document.getElementById('logoPreviewImg');
    const btn = document.getElementById('logoRemoveBtn');
    if (img) { img.src = logo || ''; img.style.display = logo ? 'inline-block' : 'none'; }
    if (btn) btn.style.display = logo ? 'inline-flex' : 'none';
    
    // También rellenar campos de texto de clínica
    const info = getClinicInfo();
    const nameInp = document.getElementById('clinicName');
    const addrInp = document.getElementById('clinicAddress');
    if (nameInp) nameInp.value = info.name || '';
    if (addrInp) addrInp.value = info.address || '';
}

// ── Tarifas y Categorías ────────────────────────────────────────────────

function loadPrices() {
    const prices = getPrices();
    const comms  = getCommissions();
    const tbody  = document.getElementById('configTableBody');
    if (!tbody) return;

    tbody.innerHTML = CATEGORIES.map(cat => `
        <tr>
            <td>${cat}</td>
            <td><input type="number" step="0.01" class="price-input" data-cat="${cat}" value="${prices[cat] || 0}"></td>
            <td><input type="number" step="0.1" class="comm-input" data-cat="${cat}" value="${comms[cat] || ''}" placeholder="${comms.default || 30}"></td>
        </tr>
    `).join('');

    const defComm = document.getElementById('defaultCommission');
    if (defComm) defComm.value = comms.default || 30;
    const defIrpf = document.getElementById('defaultIrpf');
    if (defIrpf) defIrpf.value = comms.irpf || 15;
}

function savePrices() {
    const prices = {};
    const comms  = {
        default: parseFloat(document.getElementById('defaultCommission').value) || 30,
        irpf:    parseFloat(document.getElementById('defaultIrpf').value) || 15
    };

    document.querySelectorAll('.price-input').forEach(inp => {
        prices[inp.dataset.cat] = parseFloat(inp.value) || 0;
    });
    document.querySelectorAll('.comm-input').forEach(inp => {
        if (inp.value !== "") comms[inp.dataset.cat] = parseFloat(inp.value);
    });

    savePricesToStorage(prices);
    saveCommissions(comms);
    showInlineMsg('pricesSaveMsg', '✓ Tarifas guardadas');
    toast('Precios y comisiones actualizados');
}

function saveConfigCategories() {
    const cats = (_pendingCategories || CATEGORIES).filter(c => c.trim().length > 0);
    if (cats.length === 0) { toast('Añade al menos una categoría', 'warning'); return; }
    localStorage.setItem(dk('clinicCategories'), JSON.stringify(cats));
    refreshCategories();
    
    if (window.initDailyTable) initDailyTable();
    if (window.loadDayData) loadDayData();
    if (window.updateGlobalMonthSelect) updateGlobalMonthSelect();
    if (window.loadMonthlyData) loadMonthlyData();
    
    _pendingCategories = null;
    renderCategoryList();
    loadPrices();
    showInlineMsg('catSaveMsg', '✓ Categorías guardadas');
    toast('Categorías actualizadas');
}

function renderCategoryList() {
    const el = document.getElementById('categoriesList');
    if (!el) return;
    if (!_pendingCategories) _pendingCategories = CATEGORIES.slice();
    const cats = _pendingCategories;
    
    if (cats.length === 0) {
        el.innerHTML = '<p style="color:#94a3b8; font-size:0.9rem;">Sin categorías. Añade una o carga un preset.</p>';
        return;
    }
    el.innerHTML = cats.map((cat, i) => `
        <div style="display:flex; align-items:center; gap:10px; padding:8px 0; border-bottom:1px solid #f1f5f9;">
            <span style="width:14px; height:14px; border-radius:3px; background:${COLOR_PALETTE[i % COLOR_PALETTE.length]}; flex-shrink:0;"></span>
            <span style="flex:1; font-size:0.95rem;">${cat}</span>
            <button class="btn btn-danger btn-sm" onclick="pendingRemoveCategory(${i})">×</button>
        </div>
    `).join('');
}

function pendingRemoveCategory(idx) {
    if (!_pendingCategories) _pendingCategories = CATEGORIES.slice();
    _pendingCategories.splice(idx, 1);
    renderCategoryList();
}

function addCategory() {
    const input = document.getElementById('newCatInput');
    const name = (input.value || '').trim();
    if (!name) return;
    if (!_pendingCategories) _pendingCategories = CATEGORIES.slice();
    if (_pendingCategories.includes(name)) { toast('Esa categoría ya existe', 'warning'); return; }
    _pendingCategories.push(name);
    input.value = '';
    renderCategoryList();
}

function loadPreset(name) {
    const preset = SPECIALTY_PRESETS[name];
    if (!preset) return;
    _pendingCategories = preset.slice();
    renderCategoryList();
    toast(`Preset "${name}" cargado`);
}

// ── Exportación / Importación ───────────────────────────────────────────

function exportToJSON(returnString = false) {
    const backup = {
        version: 2,
        exportDate: new Date().toISOString().slice(0, 10),
        doctors: getDoctors(),
        clinicInfo: getClinicInfo(),
        clinicLogo: localStorage.getItem('clinicLogo') || '',
        allEntries: {},
        allPrices: {},
        allComms: {},
        allOverrides: {}
    };

    // Recopilar datos de todos los médicos
    const docs = getDoctors();
    docs.forEach(d => {
        const id = d.id;
        backup.allEntries[id]   = JSON.parse(localStorage.getItem(`clinicEntries_${id}`) || '[]');
        backup.allPrices[id]    = JSON.parse(localStorage.getItem(`clinicPrices_${id}`) || '{}');
        backup.allComms[id]     = JSON.parse(localStorage.getItem(`clinicCommissions_${id}`) || '{}');
        backup.allOverrides[id] = JSON.parse(localStorage.getItem(`clinicPriceOverrides_${id}`) || '{}');
    });

    const json = JSON.stringify(backup, null, 2);
    if (returnString) return json;
    downloadFile(json, `clinica_backup_${backup.exportDate}.json`, 'application/json');
    toast('Backup completo exportado');
}

function exportToCSV() {
    const month = document.getElementById('globalMonthSelect').value;
    const { entries } = getMonthData(month);
    const prices = getPrices();

    let csv = '\uFEFF';
    csv += 'Fecha,Categoría,Cantidad,Precio unitario (€),Total (€)\n';
    entries.forEach(e => {
        const p = prices[e.category] || 0;
        csv += `${e.date},${e.category},${e.count},${p},${(e.count * p).toFixed(2)}\n`;
    });

    downloadFile(csv, `pacientes_${month}.csv`, 'text/csv;charset=utf-8;');
}

function exportAnnualToCSV() {
    const endMonth = document.getElementById('globalMonthSelect').value;
    const [y, m] = endMonth.split('-').map(Number);
    const end = new Date(y, m - 1, 1);
    
    let csv = '\uFEFF';
    csv += `Mes,${CATEGORIES.join(',')},Total Pacientes,Ingresos Brutos (€)\n`;

    for (let i = 11; i >= 0; i--) {
        const d = new Date(end.getFullYear(), end.getMonth() - i, 1);
        const ms = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        const me = getEntries().filter(e => e.date.startsWith(ms));
        const row = [formatMonth(ms)];
        let totalCount = 0, totalIncome = 0;
        const prices = getEffectivePrices(ms);
        
        CATEGORIES.forEach(cat => {
            const count = me.filter(e => e.category === cat).reduce((s, e) => s + e.count, 0);
            row.push(count);
            totalCount += count;
            totalIncome += count * (prices[cat] || 0);
        });
        row.push(totalCount, totalIncome.toFixed(2));
        csv += row.join(',') + '\n';
    }

    downloadFile(csv, `resumen_anual_${endMonth}.csv`, 'text/csv;charset=utf-8;');
}
