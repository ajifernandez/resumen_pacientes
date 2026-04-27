/**
 * backup.js - Sincronización Google Drive y Backups Locales
 */

let accessToken = localStorage.getItem('clinicGoogleAccessToken');
let tokenExpiry = localStorage.getItem('clinicGoogleTokenExpiry');
const SCOPES = 'https://www.googleapis.com/auth/drive.file';

function getClientId() {
    const saved = localStorage.getItem('clinicGoogleClientId');
    if (saved) return saved;
    return '216799672881-f38vrsusffug734rb09bejicsphtu31n.apps.googleusercontent.com';
}

function saveClientId(id) {
    if (!id) { toast('Client ID no puede estar vacío', 'warning'); return; }
    localStorage.setItem('clinicGoogleClientId', id.trim());
    toast('Google Client ID guardado correctamente', 'success');
}

function updateDataTab() {
    const clientIdInput = document.getElementById('google-client-id');
    if (clientIdInput) clientIdInput.value = getClientId();
    
    // Si tenemos un token guardado, actualizar la UI
    if (accessToken && !isTokenExpired()) {
        updateDriveUI(true);
    }
}

function isTokenExpired() {
    if (!accessToken || !tokenExpiry) return true;
    return Date.now() > parseInt(tokenExpiry);
}

function initGoogleDrive() {
    // Verificar si el token sigue siendo válido al cargar
    if (accessToken && !isTokenExpired()) {
        updateDriveUI(true);
        console.log('Google Drive: Sesión restaurada');
    } else if (accessToken) {
        // Token expirado, limpiar
        accessToken = null;
        tokenExpiry = null;
        localStorage.removeItem('clinicGoogleAccessToken');
        localStorage.removeItem('clinicGoogleTokenExpiry');
        updateDriveUI(false);
    }
}

function connectGoogleDrive() {
    const CLIENT_ID = getClientId();
    if (!CLIENT_ID || CLIENT_ID.includes('TU_CLIENT_ID')) {
        toast('Configura tu Google Client ID para continuar', 'warning', 5000);
        return;
    }

    if (typeof google === 'undefined') {
        toast('Cargando librería de Google...', 'info');
        setTimeout(connectGoogleDrive, 2000);
        return;
    }

    const tokenClient = google.accounts.oauth2.initTokenClient({
        client_id: CLIENT_ID,
        scope: SCOPES,
        callback: (tokenResponse) => {
            if (tokenResponse && tokenResponse.access_token) {
                accessToken = tokenResponse.access_token;
                // Los tokens de Google suelen durar 3600 segundos (1 hora)
                // Restamos un margen de 2 minutos por seguridad
                const expiresIn = (tokenResponse.expires_in || 3600) - 120;
                tokenExpiry = Date.now() + (expiresIn * 1000);
                
                localStorage.setItem('clinicGoogleAccessToken', accessToken);
                localStorage.setItem('clinicGoogleTokenExpiry', tokenExpiry);
                
                updateDriveUI(true);
                toast('Conectado a Google Drive', 'success');
                syncToGoogleDrive();
            }
        },
    });

    const canReauthSilently = accessToken && !isTokenExpired();
    tokenClient.requestAccessToken({ prompt: canReauthSilently ? '' : 'select_account' });
}

function disconnectGoogleDrive() {
    accessToken = null;
    tokenExpiry = null;
    localStorage.removeItem('clinicGoogleAccessToken');
    localStorage.removeItem('clinicGoogleTokenExpiry');
    updateDriveUI(false);
    toast('Desconectado de Google Drive', 'info');
}

function updateDriveUI(connected) {
    const btnConnect = document.getElementById('btn-drive-connect');
    const btnSync = document.getElementById('btn-drive-sync');
    const btnDisconnect = document.getElementById('btn-drive-disconnect');
    
    if (btnConnect) btnConnect.style.display = connected ? 'none' : 'block';
    if (btnSync) btnSync.style.display = connected ? 'block' : 'none';
    if (btnDisconnect) btnDisconnect.style.display = connected ? 'block' : 'none';
    
    const dot = document.querySelector('#drive-sync-status .status-dot');
    const text = document.getElementById('drive-status-text');
    
    if (dot) dot.style.background = connected ? '#27ae60' : '#ccc';
    if (text) text.textContent = connected ? 'Conectado' : 'No conectado';
}

async function syncToGoogleDrive() {
    if (!accessToken || isTokenExpired()) {
        if (accessToken) {
            toast('La sesión de Google ha expirado. Reconectando...', 'info');
            connectGoogleDrive();
        }
        return;
    }

    toast('Sincronizando con Drive...', 'info');
    const data = exportToJSON(true); 
    const filename = `clinica_backup_${new Date().toISOString().split('T')[0]}.json`;

    try {
        // 1. Buscar si ya existe el archivo hoy para actualizarlo
        const searchRes = await fetch(`https://www.googleapis.com/drive/v3/files?q=name='${filename}' and trashed=false`, {
            headers: { 'Authorization': `Bearer ${accessToken}` }
        });
        const searchData = await searchRes.json();
        
        let fileId = null;
        if (searchData.files && searchData.files.length > 0) {
            fileId = searchData.files[0].id;
        }

        const metadata = {
            name: filename,
            mimeType: 'application/json'
        };

        const form = new FormData();
        form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
        form.append('file', new Blob([data], { type: 'application/json' }));

        let url = 'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart';
        let method = 'POST';

        if (fileId) {
            url = `https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=multipart`;
            method = 'PATCH';
        }

        const res = await fetch(url, {
            method: method,
            headers: { 'Authorization': `Bearer ${accessToken}` },
            body: form
        });

        if (res.ok) {
            toast('Sincronización completada', 'success');
            const text = document.getElementById('drive-status-text');
            if (text) text.textContent = 'Conectado (Sincronizado: ' + new Date().toLocaleTimeString() + ')';
        } else {
            throw new Error('Error al subir archivo a Drive');
        }
    } catch (err) {
        console.error(err);
        toast('Error de sincronización: ' + err.message, 'error');
    }
}

// ── Exportación ──────────────────────────────────────────────────────────

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
    toast('Copia de seguridad local exportada');
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

// ── Importación ──────────────────────────────────────────────────────────

function importJSON() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/json';
    input.onchange = e => {
        const file = e.target.files[0];
        const reader = new FileReader();
        reader.onload = f => {
            try {
                const data = JSON.parse(f.target.result);
                if (data.version === 2) {
                    if (!confirm('Este archivo contiene una copia completa de configuración y datos de todos los médicos. ¿Deseas restaurarla? Esto sobrescribirá los datos actuales.')) return;
                    
                    localStorage.clear();
                    if (data.doctors) saveDoctors(data.doctors);
                    if (data.clinicInfo) localStorage.setItem('clinicInfo', JSON.stringify(data.clinicInfo));
                    if (data.clinicLogo) localStorage.setItem('clinicLogo', data.clinicLogo);
                    
                    if (data.allEntries)   Object.keys(data.allEntries).forEach(id => localStorage.setItem(`clinicEntries_${id}`, JSON.stringify(data.allEntries[id])));
                    if (data.allPrices)    Object.keys(data.allPrices).forEach(id => localStorage.setItem(`clinicPrices_${id}`, JSON.stringify(data.allPrices[id])));
                    if (data.allComms)     Object.keys(data.allComms).forEach(id => localStorage.setItem(`clinicCommissions_${id}`, JSON.stringify(data.allComms[id])));
                    if (data.allOverrides) Object.keys(data.allOverrides).forEach(id => localStorage.setItem(`clinicPriceOverrides_${id}`, JSON.stringify(data.allOverrides[id])));
                    
                    location.reload();
                } else {
                    // Formato antiguo o parcial
                    const mode = document.querySelector('input[name="importMode"]:checked').value;
                    const entriesData = data.entries || data.monthlyEntries || [];
                    if (mode === 'replace') {
                        saveEntries(entriesData);
                        if (data.prices) savePricesToStorage(data.prices);
                        toast('Datos importados (Reemplazar)', 'success');
                    } else {
                        const current = getEntries();
                        saveEntries([...current, ...entriesData]);
                        toast('Datos importados (Añadir)', 'success');
                    }
                    setTimeout(() => location.reload(), 1000);
                }
            } catch(err) {
                console.error(err);
                toast('Error al importar el archivo JSON', 'danger');
            }
        };
        reader.readAsText(file);
    };
    input.click();
}
