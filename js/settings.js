/**
 * config.js - Configuración, Médicos y Backups
 */

function showConfigSection(section, btn) {
    // Actualizar botones del sidebar
    document.querySelectorAll('.config-nav-item').forEach(el => el.classList.remove('active'));
    if (btn) btn.classList.add('active');

    // Mostrar sección correspondiente
    document.querySelectorAll('.config-section').forEach(el => el.classList.remove('active'));
    const target = document.getElementById(`config-section-${section}`);
    if (target) target.classList.add('active');
}

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
    const docs = getDoctors();
    const doc = docs.find(d => d.id === id);
    if (!doc) return;

    const comms = getCommissions(doc.id);
    document.getElementById('editDoctorId').value = doc.id;
    document.getElementById('editDoctorName').value = doc.name;
    document.getElementById('editDoctorSpecialty').value = doc.specialty || '';
    document.getElementById('editDoctorNif').value = doc.nif || '';
    document.getElementById('editDoctorPhone').value = doc.phone || '';
    document.getElementById('editDoctorComm').value = comms.default || 30;
    document.getElementById('editDoctorIrpf').value = comms.irpf || 15;

    document.getElementById('editDoctorModal').style.display = 'flex';
}

function closeEditDoctorModal() {
    document.getElementById('editDoctorModal').style.display = 'none';
}

function saveEditDoctor() {
    const id = document.getElementById('editDoctorId').value;
    const name = document.getElementById('editDoctorName').value.trim();
    if (!name) { toast('El nombre es obligatorio', 'warning'); return; }

    const docs = getDoctors();
    const doc = docs.find(d => d.id === id);
    if (!doc) return;

    doc.name = name;
    doc.specialty = document.getElementById('editDoctorSpecialty').value.trim();
    doc.nif = document.getElementById('editDoctorNif').value.trim();
    doc.phone = document.getElementById('editDoctorPhone').value.trim();

    // Guardar también comisiones específicas
    const comms = getCommissions(id);
    comms.default = parseFloat(document.getElementById('editDoctorComm').value) || 30;
    comms.irpf = parseFloat(document.getElementById('editDoctorIrpf').value) || 15;
    saveCommissions(comms, id);

    saveDoctors(docs);
    closeEditDoctorModal();
    renderDoctorManager();
    updateDoctorBar();
    updateHeader();
    loadPrices(); // Refrescar si estábamos en la pestaña de tarifas
    toast('Datos del médico actualizados');
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
    const comms  = getCommissions(); // Usa el médico actual
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
    const cats = (_pendingCategories || CATEGORIES).filter(c => c.trim().length > 0).sort((x,y) => x.localeCompare(y, 'es'));
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
        <div style="display:flex; align-items:center; gap:10px; padding:8px 0; border-bottom:1px solid var(--border-color);">
            <span style="width:14px; height:14px; border-radius:3px; background:${COLOR_PALETTE[i % COLOR_PALETTE.length]}; flex-shrink:0;"></span>
            <span style="flex:1; font-size:0.95rem;">${cat}</span>
            <button class="btn btn-sm" style="background:var(--accent); color:#fff;" onclick="renameCategory(${i})">✏️</button>
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
    _pendingCategories.sort((x,y) => x.localeCompare(y, 'es'));
    input.value = '';
    renderCategoryList();
}

function loadPreset(name) {
    const preset = SPECIALTY_PRESETS[name];
    if (!preset) return;
    _pendingCategories = preset.slice().sort((x,y) => x.localeCompare(y, 'es'));
    renderCategoryList();
    toast(`Preset "${name}" cargado`);
}

function renameCategory(idx) {
    if (!_pendingCategories) _pendingCategories = CATEGORIES.slice();
    const oldName = _pendingCategories[idx];
    const newName = prompt(`Nuevo nombre para "${oldName}":`, oldName);
    if (!newName || !newName.trim()) return;
    const trimmed = newName.trim();
    if (trimmed === oldName) return;
    if (_pendingCategories.includes(trimmed)) { toast('Esa categoría ya existe', 'warning'); return; }

    const isSaved = CATEGORIES.includes(oldName);
    _pendingCategories[idx] = trimmed;
    _pendingCategories.sort((x,y) => x.localeCompare(y, 'es'));

    if (isSaved) propagateCategoryRename(oldName, trimmed);
    renderCategoryList();
    toast(`"${oldName}" → "${trimmed}"${isSaved ? ' (datos actualizados)' : ''}`);
}

function propagateCategoryRename(oldName, newName) {
    const doctors = getDoctors();

    doctors.forEach(doc => {
        const id = doc.id;

        // Entries
        const entriesKey = `clinicEntries_${id}`;
        const entries = JSON.parse(localStorage.getItem(entriesKey) || '[]');
        const updatedEntries = entries.map(e => e.category === oldName ? { ...e, category: newName } : e);
        localStorage.setItem(entriesKey, JSON.stringify(updatedEntries));

        // Prices
        const pricesKey = `clinicPrices_${id}`;
        const prices = JSON.parse(localStorage.getItem(pricesKey) || '{}');
        if (oldName in prices) {
            prices[newName] = prices[oldName];
            delete prices[oldName];
            localStorage.setItem(pricesKey, JSON.stringify(prices));
        }

        // Commissions
        const commsKey = `clinicCommissions_${id}`;
        const comms = JSON.parse(localStorage.getItem(commsKey) || '{}');
        if (oldName in comms) {
            comms[newName] = comms[oldName];
            delete comms[oldName];
            localStorage.setItem(commsKey, JSON.stringify(comms));
        }

        // Price overrides (each month)
        const overridesKey = `clinicPriceOverrides_${id}`;
        const overrides = JSON.parse(localStorage.getItem(overridesKey) || '{}');
        let overridesChanged = false;
        Object.keys(overrides).forEach(month => {
            if (oldName in overrides[month]) {
                overrides[month][newName] = overrides[month][oldName];
                delete overrides[month][oldName];
                overridesChanged = true;
            }
        });
        if (overridesChanged) localStorage.setItem(overridesKey, JSON.stringify(overrides));

        // Billing data
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key.startsWith(`clinicBilling_`) && key.endsWith(`_${id}`)) {
                const billing = JSON.parse(localStorage.getItem(key) || '{}');
                if (oldName in billing) {
                    billing[newName] = billing[oldName];
                    delete billing[oldName];
                    localStorage.setItem(key, JSON.stringify(billing));
                }
            }
        }
    });

    // Update global category list in localStorage
    const saved = JSON.parse(localStorage.getItem('clinicCategories') || '[]');
    const idx = saved.indexOf(oldName);
    if (idx !== -1) { saved[idx] = newName; localStorage.setItem('clinicCategories', JSON.stringify(saved)); }
}

// Las funciones de exportación e importación se han movido a js/backup.js
