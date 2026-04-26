/**
 * billing.js - Facturación e Informes
 */

function initBilling() {
    updateBilling();
}

function updateBilling() {
    const sel = document.getElementById('globalMonthSelect');
    if (!sel || !sel.value) {
        setTimeout(updateBilling, 100);
        return;
    }
    const month = sel.value;
    const doctorId = getCurrentDoctorId() || 'doc_default';
    
    // Tabla de edición de facturación
    const prices = getEffectivePrices(month);
    const billingKey = 'clinicBilling_' + month + '_' + doctorId;
    let billingData = {};
    try { billingData = JSON.parse(localStorage.getItem(billingKey)) || {}; } catch(e) {}

    const el = document.getElementById('billingContent');
    if (!el) return;

    let html = `<div style="margin-bottom:12px; color:var(--text-muted); font-size:0.9rem; font-weight:600;">Editando: ${formatMonth(month)}</div>`;
    html += '<div class="table-scroll"><table><thead><tr>';
    html += '<th>Aseguradora</th><th style="text-align:right;">Precio (€)</th><th style="text-align:right;">Facturados</th><th style="text-align:right;">Total (€)</th>';
    html += '</tr></thead><tbody>';

    let totalMonthBilled = 0, totalMonthReceived = 0;

    CATEGORIES.forEach(cat => {
        const price = prices[cat] || 0;
        const billedCount = billingData[cat] || 0;
        const received = billedCount * price;

        totalMonthBilled += billedCount;
        totalMonthReceived += received;

        html += `<tr><td style="font-weight:600;">${cat}</td>`;
        html += `<td style="text-align:right; color:var(--primary);">${price > 0 ? price.toFixed(2) : '—'}</td>`;
        html += `<td style="text-align:right;"><input type="number" id="bill_${catId(cat)}" value="${billedCount}" min="0" style="width:80px; text-align:center; padding:6px;"></td>`;
        html += `<td style="text-align:right; font-weight:600;">${received > 0 ? received.toFixed(2) : '—'}</td></tr>`;
    });

    html += `<tr style="background:#f0fdfa; font-weight:700; border-top:2px solid #5eead4;">
        <td>TOTAL</td><td></td>
        <td style="text-align:right;">${totalMonthBilled}</td>
        <td style="text-align:right;">${totalMonthReceived.toFixed(2)}</td>
    </tr></tbody></table></div>`;
    
    // Añadir sección de resumen de rango
    html += `
        <div style="margin-top:24px; padding-top:24px; border-top:2px solid #e2e8f0;">
            <div style="display:flex; gap:12px; align-items:center; margin-bottom:16px; flex-wrap:wrap;">
                <span style="color:var(--text-muted); font-weight:500;">Resumen rango:</span>
                <select id="billingRangeFrom" class="doctor-select" onchange="updateBillingRange()" style="min-width:180px;"></select>
                <span style="color:var(--text-muted);">hasta</span>
                <select id="billingRangeTo" class="doctor-select" onchange="updateBillingRange()" style="min-width:180px;"></select>
            </div>
            <div style="display:flex; gap:24px; flex-wrap:wrap;">
                <div class="stat-card"><div class="number" id="rangeAttended">0</div><div class="label">Total Atendidos</div></div>
                <div class="stat-card"><div class="number" id="rangeBilled">0</div><div class="label">Total Facturados</div></div>
                <div class="stat-card" id="rangeDiffCard" style="background:#f0fdfa;">
                    <div class="number" id="rangeDiff" style="color:#27ae60;">0</div>
                    <div class="label" id="rangeDiffPct">Diferencia (0%)</div>
                </div>
            </div>
        </div>`;
        
    el.innerHTML = html;

    // Inicializar selectores de rango
    const rangeFrom = document.getElementById('billingRangeFrom');
    const rangeTo = document.getElementById('billingRangeTo');
    if (rangeFrom && rangeTo) {
        if (typeof getAvailableMonths === 'function') {
            const months = getAvailableMonths().slice(0, 12);
            rangeFrom.innerHTML = months.map(m => `<option value="${m}">${formatMonth(m)}</option>`).join('');
            rangeTo.innerHTML = months.map(m => `<option value="${m}">${formatMonth(m)}</option>`).join('');
            rangeFrom.value = months[months.length - 2] || months[0];
            rangeTo.value = month;
            updateBillingRange();
        }
    }
}

function updateBillingRange() {
    const rangeFrom = document.getElementById('billingRangeFrom');
    const rangeTo = document.getElementById('billingRangeTo');
    if (!rangeFrom || !rangeTo) return;
    
    let monthFrom = rangeFrom.value;
    let monthTo = rangeTo.value;
    
    let totalAttended = 0;
    let totalBilled = 0;
    
    if (typeof getAvailableMonths !== 'function') return;
    const allMonths = getAvailableMonths().sort();
    let startMonth = monthFrom;
    let endMonth = monthTo;
    if (startMonth > endMonth) { [startMonth, endMonth] = [endMonth, startMonth]; }
    
    let inRange = false;
    allMonths.forEach(m => {
        if (m === startMonth) inRange = true;
        if (inRange) {
            // Sumar atendidos de TODOS los médicos
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key && key.startsWith('clinicEntries_')) {
                    try {
                        const entries = JSON.parse(localStorage.getItem(key) || '[]').filter(e => e.date.startsWith(m));
                        totalAttended += entries.reduce((s, e) => s + (parseInt(e.count) || 0), 0);
                    } catch(e) {}
                }
            }
            // Sumar facturados de TODOS los médicos
            for (let i = 0; i < localStorage.length; i++) {
                const bkey = localStorage.key(i);
                if (bkey && bkey.startsWith('clinicBilling_') && bkey.includes('_' + m + '_')) {
                    try {
                        const billData = JSON.parse(localStorage.getItem(bkey) || '{}');
                        Object.values(billData).forEach(val => totalBilled += parseInt(val) || 0);
                    } catch(e) {}
                }
            }
        }
        if (m === endMonth) inRange = false;
    });
    
    const diff = totalBilled - totalAttended;
    const diffPct = totalAttended > 0 ? Math.round((totalBilled - totalAttended) / totalAttended * 1000) / 10 : 0;
    
    const attendedEl = document.getElementById('rangeAttended');
    const billedEl = document.getElementById('rangeBilled');
    const diffEl = document.getElementById('rangeDiff');
    const diffPctEl = document.getElementById('rangeDiffPct');
    const diffCardEl = document.getElementById('rangeDiffCard');
    
    if (attendedEl) attendedEl.textContent = totalAttended;
    if (billedEl) billedEl.textContent = totalBilled;
    if (diffEl) {
        diffEl.textContent = (diff >= 0 ? '+' : '') + diff;
        diffEl.style.color = diff >= 0 ? '#27ae60' : '#e74c3c';
    }
    if (diffPctEl) diffPctEl.textContent = `Diferencia (${diffPct}%)`;
    if (diffCardEl) diffCardEl.style.background = diff >= 0 ? '#dcfce7' : '#fee2e2';
}

function saveBillingData() {
    const month = document.getElementById('globalMonthSelect').value;
    const billingData = {};
    CATEGORIES.forEach(cat => {
        const input = document.getElementById('bill_' + catId(cat));
        if (input && parseInt(input.value) > 0) {
            billingData[cat] = parseInt(input.value);
        }
    });
    const doctorId = getCurrentDoctorId() || 'doc_default';
    localStorage.setItem('clinicBilling_' + month + '_' + doctorId, JSON.stringify(billingData));
    updateBilling();
    toast('Datos de facturación guardados', 'success');
}

function printBilling() {
    const month = document.getElementById('globalMonthSelect').value;
    const monthLabel = formatMonth(month);
    const info = getClinicInfo();
    const doc = getCurrentDoctor();
    const clinicLogo = localStorage.getItem('clinicLogo');
    const prices = getEffectivePrices(month);
    const doctorId = getCurrentDoctorId() || 'doc_default';
    const billingKey = 'clinicBilling_' + month + '_' + doctorId;
    let billingData = {};
    try { billingData = JSON.parse(localStorage.getItem(billingKey)) || {}; } catch(e) {}

    let totalBilled = 0, totalReceived = 0;
    let rows = '';
    CATEGORIES.forEach(cat => {
        const price = prices[cat] || 0;
        const billedCount = billingData[cat] || 0;
        if (billedCount > 0) {
            const received = billedCount * price;
            totalBilled += billedCount;
            totalReceived += received;
            rows += `<tr><td>${cat}</td><td class="num">${price.toFixed(2)}</td><td class="num">${billedCount}</td><td class="num">${received.toFixed(2)}</td></tr>`;
        }
    });

    const logoHtml = clinicLogo ? `<img src="${clinicLogo}" alt="" style="max-height:50px; max-width:150px; object-fit:contain; margin-bottom:6px; display:block; border-radius:4px;">` : '';
    const today = new Date().toLocaleDateString('es-ES', { day:'2-digit', month:'long', year:'numeric' });
    const orderNum = 'FAC-' + month.replace('-', '');

    let html = `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"><title>Facturacion ${monthLabel}</title>
    <style>*,*::before,*::after{box-sizing:border-box;margin:0;padding:0;font-family:"Segoe UI",Tahoma,Verdana,sans-serif}
    body{background:#f4f6fb;padding:20px;color:#222;font-size:15px}
    .page{background:white;max-width:1200px;margin:0 auto;padding:36px 40px;border-radius:12px;box-shadow:0 4px 30px rgba(0,0,0,0.12)}
    .inv-header{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:32px;padding-bottom:20px;border-bottom:3px solid #667eea;gap:16px}
    .inv-from{line-height:1.7;font-size:0.9rem;color:#444}
    .inv-clinic{font-size:1.35rem;font-weight:700;color:#222;margin-bottom:4px}
    .inv-meta{text-align:right;flex-shrink:0}
    .inv-num{font-size:1.6rem;font-weight:700;color:#667eea}
    .inv-date,.inv-period{font-size:0.85rem;color:#666;margin-top:4px}
    .inv-title{font-size:1rem;font-weight:600;color:#555;margin-bottom:6px;letter-spacing:0.5px;text-transform:uppercase}
    .inv-subtitle{font-size:0.82rem;color:#888;margin-bottom:16px}
    table{width:100%;border-collapse:collapse;font-size:0.9rem}
    thead tr{background:#f1f5f9;color:#222}
    th{padding:10px 10px;text-align:left;font-weight:600}
    th.num{text-align:right}
    td{padding:9px 10px;border-bottom:1px solid #eee;vertical-align:middle}
    td.num{text-align:right}
    tr:last-child{font-weight:700;background:#f0fdfa;border-top:2px solid #5eead4}
    .print-bar{max-width:1200px;margin:0 auto 16px;display:flex;gap:10px;align-items:center;flex-wrap:wrap}
    .btn-print{padding:10px 20px;background:#667eea;color:white;border:none;border-radius:8px;cursor:pointer;font-size:0.95rem}
    .btn-close{padding:10px 20px;background:#e74c3c;color:white;border:none;border-radius:8px;cursor:pointer;font-size:0.95rem}
    @media print{@page{size:A4 portrait;margin:10mm}body{background:white;padding:0}.page{box-shadow:none;border-radius:0;padding:0;max-width:100%}.print-bar{display:none}}
    </style></head><body>
    <div class="print-bar"><button class="btn-print" onclick="window.print()">🖨️ Imprimir</button><button class="btn-close" onclick="window.close()">✕ Cerrar</button></div>
    <div class="page"><div class="inv-header"><div class="inv-from">${logoHtml}<div class="inv-clinic">${info.name || 'Clinica'}</div>`;
    if (doc && doc.specialty) html += `<div style="font-size:0.9rem;color:#667eea;font-weight:600;margin-bottom:2px;">${doc.specialty}</div>`;
    if (doc && doc.name) html += `<div>${doc.name}</div>`;
    if (doc && doc.nif) html += `<div>NIF: ${doc.nif}</div>`;
    if (info.address) html += `<div>${info.address}</div>`;
    if (doc && doc.phone) html += `<div>Tel: ${doc.phone}</div>`;
    html += `</div><div class="inv-meta"><div class="inv-num">${orderNum}</div><div class="inv-date">Emitida: ${today}</div><div class="inv-period">Período: ${monthLabel}</div></div></div>
    <div class="inv-title">Facturación — ${monthLabel}</div>
    <div class="inv-subtitle">Resumen de pacientes facturados por aseguradora.</div>
    <table><thead><tr><th>Aseguradora</th><th class="num">Precio (€)</th><th class="num">Facturados</th><th class="num">Total (€)</th></tr></thead><tbody>
    ${rows}
    <tr><td>TOTAL</td><td></td><td class="num">${totalBilled}</td><td class="num">${totalReceived.toFixed(2)}</td></tr>
    </tbody></table></div></body></html>`;

    const win = window.open('', '_blank');
    win.document.write(html);
    win.document.close();
}
