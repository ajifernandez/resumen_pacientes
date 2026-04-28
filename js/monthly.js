/**
 * monthly.js - Lógica de Entrada Mensual (Cuadrícula)
 */

function renderMonthlyGrid(month) {
    if (!month) return;
    const [y, m] = month.split('-').map(Number);
    const daysInMonth = new Date(y, m, 0).getDate();
    
    const head = document.getElementById('monthlyTableHead');
    const body = document.getElementById('monthlyTableBody');
    const foot = document.getElementById('monthlyTableFoot');
    if (!head || !body || !foot) return;
    
    let headHTML = '<tr><th>Día</th>';
    CATEGORIES.forEach((cat, i) => headHTML += `<th><span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${COLORS[i]};margin-right:4px;"></span>${cat}</th>`);
    headHTML += '<th class="monthly-total-col">Total Día</th></tr>';
    head.innerHTML = headHTML;
    
    let bodyHTML = '';
    bodyHTML += '<tr class="monthly-price-row"><td style="font-size:0.65rem; color:var(--text-muted); line-height:1;">Precio<br>(€)</td>';
    CATEGORIES.forEach(cat => {
        const id = `month_price_${catId(cat)}`;
        bodyHTML += `<td><input type="number" step="0.01" id="${id}" style="color:var(--primary); font-weight:600; font-size:0.7rem;" placeholder=""></td>`;
    });
    bodyHTML += `<td class="monthly-total-col"></td></tr>`;
    
    for (let d = 1; d <= daysInMonth; d++) {
        bodyHTML += `<tr><td>${d}</td>`;
        CATEGORIES.forEach(cat => {
            const id = `month_${d}_${catId(cat)}`;
            bodyHTML += `<td><input type="number" id="${id}" min="0" value="" oninput="updateMonthlyTotals()"></td>`;
        });
        bodyHTML += `<td class="monthly-total-col" id="month_day_total_${d}">0</td></tr>`;
    }
    body.innerHTML = bodyHTML;
    
    let footHTML = '<tr class="monthly-total-row"><td>TOTAL</td>';
    CATEGORIES.forEach(cat => footHTML += `<td id="month_cat_total_${catId(cat)}">0</td>`);
    footHTML += `<td id="month_grand_total">0</td></tr>`;
    foot.innerHTML = footHTML;
}

function renderQuickEntry() {
    const el = document.getElementById('quickMonthlyEntry');
    if (!el) return;
    el.innerHTML = CATEGORIES.map(cat => `
        <div style="display:flex; flex-direction:column; gap:4px;">
            <label style="font-size:0.75rem; color:var(--text-muted); font-weight:600; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;" title="${cat}">${cat}</label>
            <input type="number" id="quick_${catId(cat)}" placeholder="Total mes..." 
                   style="width:100%; padding:8px; border-radius:8px; border:1px solid var(--border-color); background:var(--input-bg); color:var(--text-main); font-weight:700;"
                   oninput="syncQuickToGrid('${cat}')">
        </div>
    `).join('');
}

function syncQuickToGrid(cat) {
    const quickInp = document.getElementById(`quick_${catId(cat)}`);
    const gridInp  = document.getElementById(`month_1_${catId(cat)}`);
    if (quickInp && gridInp) {
        gridInp.value = quickInp.value;
        updateMonthlyTotals();
    }
}

function loadMonthlyData() {
    const sel = document.getElementById('globalMonthSelect');
    const month = (sel && sel.value) ? sel.value : getCurrentMonth();
    if (!month) return;
    
    renderMonthlyGrid(month);
    
    const basePrices = getPrices();
    const overrides = getPriceOverrides()[month] || {};
    CATEGORIES.forEach(cat => {
        const input = document.getElementById(`month_price_${catId(cat)}`);
        if (input) {
            input.placeholder = basePrices[cat] !== undefined ? basePrices[cat] : '0';
            input.value = overrides[cat] !== undefined ? overrides[cat] : '';
        }
    });
    
    const entries = getEntries().filter(e => e.date.startsWith(month));
    entries.forEach(e => {
        const day = parseInt(e.date.split('-')[2], 10);
        const input = document.getElementById(`month_${day}_${catId(e.category)}`);
        if (input) input.value = e.count;
        
        // Si es el día 1, también ponemos en la carga rápida
        if (day === 1) {
            const quickInp = document.getElementById(`quick_${catId(e.category)}`);
            if (quickInp) quickInp.value = e.count;
        }
    });
    
    updateMonthlyTotals();
    initMonthlyTableCrosshair();
    const saveMsg = document.getElementById('saveMonthMsg');
    if (saveMsg) saveMsg.style.display = 'none';
}

function updateMonthlyTotals() {
    const sel = document.getElementById('globalMonthSelect');
    const month = (sel && sel.value) ? sel.value : getCurrentMonth();
    if (!month) return;
    const [y, m] = month.split('-').map(Number);
    const daysInMonth = new Date(y, m, 0).getDate();
    
    let grandTotal = 0;
    let daysWorked = 0;
    const catTotals = {};
    CATEGORIES.forEach(cat => catTotals[cat] = 0);
    
    for (let d = 1; d <= daysInMonth; d++) {
        let dayTotal = 0;
        CATEGORIES.forEach(cat => {
            const input = document.getElementById(`month_${d}_${catId(cat)}`);
            const val = parseInt(input ? input.value : 0) || 0;
            dayTotal += val;
            catTotals[cat] += val;
        });
        const dayEl = document.getElementById(`month_day_total_${d}`);
        if (dayEl) dayEl.textContent = dayTotal || '';
        if (dayTotal > 0) daysWorked++;
        grandTotal += dayTotal;
    }
    
    CATEGORIES.forEach(cat => {
        const catEl = document.getElementById(`month_cat_total_${catId(cat)}`);
        if (catEl) catEl.textContent = catTotals[cat] || '0';
    });
    
    const grandEl = document.getElementById('month_grand_total');
    if (grandEl) grandEl.textContent = grandTotal;
    
    const monthTotalEl = document.getElementById('monthTotal');
    if (monthTotalEl) monthTotalEl.textContent = grandTotal;
    const monthDaysEl = document.getElementById('monthDays');
    if (monthDaysEl) monthDaysEl.textContent = daysWorked + ' días trabajados';
    const countLine = document.getElementById('monthlyCountLine');
    if (countLine) countLine.textContent = `${grandTotal} pacientes · ${daysWorked} día${daysWorked !== 1 ? 's' : ''} trabajado${daysWorked !== 1 ? 's' : ''}`;
}

function saveMonth() {
    const sel = document.getElementById('globalMonthSelect');
    const month = (sel && sel.value) ? sel.value : getCurrentMonth();
    if (!month) { toast('Selecciona un mes', 'warning'); return; }
    
    const basePrices = getPrices();
    const monthOverrides = {};
    let hasAnyPrice = false;
    CATEGORIES.forEach(cat => {
        const el = document.getElementById(`month_price_${catId(cat)}`);
        if (el && el.value !== "") {
            monthOverrides[cat] = parseFloat(el.value);
            hasAnyPrice = true;
        } else if (basePrices[cat] !== undefined) {
            monthOverrides[cat] = basePrices[cat];
            hasAnyPrice = true;
        }
    });
    const allOverrides = getPriceOverrides();
    if (hasAnyPrice) {
        allOverrides[month] = monthOverrides;
        savePriceOverrides(allOverrides);
    } else {
        delete allOverrides[month];
        savePriceOverrides(allOverrides);
    }
    
    const entries = getEntries().filter(e => !e.date.startsWith(month));
    let saved = 0, totalPatients = 0;
    const [y, mStr] = month.split('-');
    const daysInMonth = new Date(parseInt(y), parseInt(mStr), 0).getDate();
    
    for (let d = 1; d <= daysInMonth; d++) {
        const dateStr = `${month}-${String(d).padStart(2, '0')}`;
        CATEGORIES.forEach(cat => {
            const el = document.getElementById(`month_${d}_${catId(cat)}`);
            if (el && el.value !== "") {
                const val = parseInt(el.value) || 0;
                if (val > 0) {
                    entries.push({ id: nextId(), date: dateStr, category: cat, count: val });
                    saved++;
                    totalPatients += val;
                }
            }
        });
    }
    
    saveEntries(entries);
    showInlineMsg('saveMonthMsg', `✓ Guardado — ${totalPatients} pacientes en el mes`);
    toast(`Mes guardado: ${totalPatients} pacientes`, 'success');
}

function initMonthlyTableCrosshair() {
    const table = document.querySelector('.monthly-table');
    if (!table || table._crosshair) return;
    table._crosshair = true;

    table.addEventListener('mouseover', e => {
        const cell = e.target.closest('td, th');
        if (!cell || !cell.closest('.monthly-table')) return;

        const colIdx = cell.cellIndex;
        const allRows = table.querySelectorAll('thead tr, tbody tr, tfoot tr');

        allRows.forEach(row => {
            Array.from(row.cells).forEach((c, i) => {
                c.classList.remove('cell-highlight-row', 'cell-highlight-col');
                if (c === cell || c.parentElement === cell.parentElement) c.classList.add('cell-highlight-row');
                if (i === colIdx) c.classList.add('cell-highlight-col');
            });
        });
    });

    table.addEventListener('mouseleave', () => {
        table.querySelectorAll('.cell-highlight-row, .cell-highlight-col')
             .forEach(c => c.classList.remove('cell-highlight-row', 'cell-highlight-col'));
    });
}
