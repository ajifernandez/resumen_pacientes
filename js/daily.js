/**
 * daily.js - Lógica de Entrada Diaria e Historial
 */

function initDailyTable() {
    const el = document.getElementById('dailyTableBody');
    if (!el) return;
    el.innerHTML = CATEGORIES.map(cat => `
        <tr class="category-row">
            <td>${cat}</td>
            <td>
                <input type="number" id="day_${catId(cat)}"
                       min="0" value="0" oninput="updateDayTotal()">
            </td>
        </tr>
    `).join('');
}

function updateDayTotal() {
    let total = 0;
    CATEGORIES.forEach(cat => {
        const input = document.getElementById(`day_${catId(cat)}`);
        if (input) total += parseInt(input.value) || 0;
    });
    const totalEl = document.getElementById('dayTotal');
    if (totalEl) totalEl.textContent = total;
}

function loadDayData() {
    const date = document.getElementById('entryDate').value;
    CATEGORIES.forEach(cat => {
        const input = document.getElementById(`day_${catId(cat)}`);
        if (input) input.value = 0;
    });

    if (date) {
        getEntries()
            .filter(e => e.date === date)
            .forEach(e => {
                const input = document.getElementById(`day_${catId(e.category)}`);
                if (input) input.value = e.count;
            });
    }
    updateDayTotal();
    const saveMsg = document.getElementById('saveMsg');
    if (saveMsg) saveMsg.style.display = 'none';
}

function saveDay() {
    const date = document.getElementById('entryDate').value;
    if (!date) { toast('Selecciona una fecha', 'warning'); return; }

    const entries = getEntries().filter(e => e.date !== date);
    let saved = 0, totalPatients = 0;

    CATEGORIES.forEach(cat => {
        const input = document.getElementById(`day_${catId(cat)}`);
        if (input) {
            const count = parseInt(input.value) || 0;
            if (count > 0) {
                entries.push({ id: nextId(), date, category: cat, count });
                saved++;
                totalPatients += count;
            }
        }
    });

    if (saved === 0) { toast('No hay pacientes para guardar', 'warning'); return; }

    saveEntries(entries);
    showInlineMsg('saveMsg', `✓ Guardado — ${totalPatients} pacientes en ${saved} categorías`);
    toast(`Día guardado: ${totalPatients} pacientes`, 'success');
}

function updateHistory() {
    const sel = document.getElementById('globalMonthSelect');
    const month = (sel && sel.value) ? sel.value : getCurrentMonth();
    const { entries } = getMonthData(month);
    const tbody = document.querySelector('#historyTable tbody');
    const summaryEl = document.getElementById('historySummary');
    if (!tbody) return;

    if (entries.length === 0) {
        tbody.innerHTML = `<tr><td colspan="4" style="text-align:center;color:#888;padding:24px;">
            No hay registros para este mes
        </td></tr>`;
        if (summaryEl) summaryEl.innerHTML = '';
        return;
    }

    // Resumen pills
    const totalPac = entries.reduce((s, e) => s + e.count, 0);
    const days = new Set(entries.map(e => e.date)).size;
    if (summaryEl) {
        summaryEl.innerHTML = `
            <div class="summary-pills">
                <span class="pill">${totalPac} pacientes</span>
                <span class="pill">${days} días registrados</span>
                <span class="pill">Media: ${days ? Math.round(totalPac / days) : 0} pac/día</span>
            </div>
        `;
    }

    // Agrupar por fecha, más reciente primero
    const grouped = {};
    entries.forEach(e => {
        if (!grouped[e.date]) grouped[e.date] = [];
        grouped[e.date].push(e);
    });

    tbody.innerHTML = Object.keys(grouped).sort((a, b) => b.localeCompare(a)).map(date => {
        const dayEntries = grouped[date].sort(
            (a, b) => CATEGORIES.indexOf(a.category) - CATEGORIES.indexOf(b.category)
        );
        const dayTotal = dayEntries.reduce((s, e) => s + e.count, 0);

        const header = `
            <tr class="day-group-header">
                <td colspan="3">${formatDate(date)}</td>
                <td style="text-align:right;">${dayTotal} pac.</td>
            </tr>
        `;

        const rows = dayEntries.map(e => `
            <tr>
                <td style="padding-left:24px; color:#aaa; font-size:0.85rem;">↳</td>
                <td>${e.category}</td>
                <td>${e.count}</td>
                <td>
                    <button class="btn btn-danger btn-sm" onclick="deleteEntry(${e.id})">
                        Eliminar
                    </button>
                </td>
            </tr>
        `).join('');

        return header + rows;
    }).join('');
}

function deleteEntry(id) {
    saveEntries(getEntries().filter(e => e.id !== id));
    updateHistory();
    toast('Registro eliminado', 'info');
}

function getMonthData(month) {
    const entries = getEntries().filter(e => e.date.startsWith(month));
    const data = {};
    CATEGORIES.forEach(cat => data[cat] = 0);
    entries.forEach(e => {
        if (data[e.category] !== undefined) {
            data[e.category] += e.count;
        } else {
            data['Other'] = (data['Other'] || 0) + e.count;
        }
    });
    return { entries, data };
}
