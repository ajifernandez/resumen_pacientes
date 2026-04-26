/**
 * stats.js - Estadísticas y Gráficos
 */

function updateStats() {
    const sel = document.getElementById('globalMonthSelect');
    const month = (sel && sel.value) ? sel.value : getCurrentMonth();

    const { entries, data } = getMonthData(month);
    const prices      = getPrices();
    const commissions = getCommissions();

    const total = Object.values(data).reduce((a, b) => a + b, 0);
    const days  = new Set(entries.map(e => e.date)).size;

    let totalGross = 0, totalRetention = 0;
    Object.entries(data).forEach(([cat, count]) => {
        const gross     = count * (prices[cat] || 0);
        const commPct   = effectiveCommission(cat, commissions);
        totalGross     += gross;
        totalRetention += gross * commPct / 100;
    });
    const totalNet = totalGross - totalRetention;
    const hasComm  = totalRetention > 0;

    let html = `
        <div class="stat-card">
            <div class="number">${total}</div>
            <div class="label">Total Pacientes</div>
        </div>
        <div class="stat-card">
            <div class="number">${days}</div>
            <div class="label">Días Trabajados</div>
        </div>
        <div class="stat-card">
            <div class="number">${days ? Math.round(total / days) : 0}</div>
            <div class="label">Media / Día</div>
        </div>
    `;

    if (totalGross > 0) {
        html += `
            <div class="stat-card">
                <div class="number" style="font-size:1.3rem;">${totalGross.toFixed(2)}€</div>
                <div class="label">Ingresos Brutos</div>
            </div>
        `;
        if (hasComm) {
            html += `
                <div class="stat-card" style="background:linear-gradient(135deg,#e74c3c,#c0392b);">
                    <div class="number" style="font-size:1.3rem;">− ${totalRetention.toFixed(2)}€</div>
                    <div class="label">Retención Clínica</div>
                </div>
                <div class="stat-card" style="background:linear-gradient(135deg,#27ae60,#1e8449);">
                    <div class="number" style="font-size:1.3rem;">${totalNet.toFixed(2)}€</div>
                    <div class="label">Neto a Percibir</div>
                </div>
                <div class="stat-card" style="background:linear-gradient(135deg,#27ae60,#1e8449);">
                    <div class="number" style="font-size:1.3rem;">${days ? (totalNet / days).toFixed(2) : '0.00'}€</div>
                    <div class="label">Neto / Día</div>
                </div>
            `;
        } else {
            html += `
                <div class="stat-card">
                    <div class="number" style="font-size:1.3rem;">${days ? (totalGross / days).toFixed(2) : '0.00'}€</div>
                    <div class="label">Ingresos / Día</div>
                </div>
            `;
        }
    }

    const top = Object.entries(data).sort((a, b) => b[1] - a[1])[0];
    if (top && top[1] > 0) {
        html += `
            <div class="stat-card">
                <div class="number" style="font-size:1.1rem;">${top[0]}</div>
                <div class="label">Top Categoría (${top[1]})</div>
            </div>
        `;
    }

    const cardsEl = document.getElementById('statsCards');
    if (cardsEl) cardsEl.innerHTML = html;
    
    updateCharts(month, data, entries, prices);
    updateAnnualChart(month);
}

function updateCharts(month, data, entries, prices) {
    if (pieChart)  pieChart.destroy();
    if (barChart)  barChart.destroy();
    if (lineChart) lineChart.destroy();

    const pieCtx = document.getElementById('pieChart')?.getContext('2d');
    if (pieCtx) {
        const activeCats = CATEGORIES.filter(k => data[k] > 0);
        pieChart = new Chart(pieCtx, {
            type: 'doughnut',
            data: {
                labels: activeCats,
                datasets: [{
                    data: activeCats.map(k => data[k]),
                    backgroundColor: activeCats.map(k => COLORS[CATEGORIES.indexOf(k) % COLORS.length])
                }]
            },
            options: {
                responsive: true, maintainAspectRatio: false,
                plugins: { legend: { display: false }, title: { display: true, text: 'Distribución por Categoría' } }
            }
        });
        chartMap['pieChart'] = pieChart;
        renderLegend(pieChart, 'legend-pieChart');
    }

    const barCtx = document.getElementById('barChart')?.getContext('2d');
    if (barCtx) {
        const catIncome = CATEGORIES.map(cat => (data[cat] || 0) * (prices[cat] || 0));
        barChart = new Chart(barCtx, {
            type: 'bar',
            data: {
                labels: CATEGORIES,
                datasets: [
                    {
                        label: 'Pacientes',
                        data: CATEGORIES.map(cat => data[cat] || 0),
                        backgroundColor: COLORS,
                        order: 1
                    },
                    {
                        type: 'line', label: 'Ingresos (€)', data: catIncome,
                        borderColor: '#e74c3c', backgroundColor: 'rgba(231,76,60,0.15)',
                        fill: true, tension: 0.3, yAxisID: 'y1', order: 0,
                        pointRadius: 5, pointHoverRadius: 7, borderWidth: 2
                    }
                ]
            },
            options: {
                responsive: true, maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    title: { display: true, text: 'Pacientes por Categoría' },
                    tooltip: {
                        mode: 'index', intersect: false,
                        callbacks: {
                            title: ti => ti[0]?.label || '',
                            label: () => null,
                            afterBody(ti) {
                                if (!ti.length) return [];
                                const cat = ti[0].label;
                                const count = data[cat] || 0;
                                const price = prices[cat] || 0;
                                return [`Pacientes: ${count}`, `─────────────`, `Ingresos: ${(count * price).toFixed(2)}€`];
                            }
                        }
                    }
                },
                scales: {
                    y:  { beginAtZero: true, title: { display: true, text: 'Pacientes' } },
                    y1: { type: 'linear', display: true, position: 'right', beginAtZero: true,
                          title: { display: true, text: 'Ingresos (€)' }, grid: { drawOnChartArea: false } }
                }
            }
        });
        chartMap['barChart'] = barChart;
        renderLegend(barChart, 'legend-barChart');
    }

    const lineCtx = document.getElementById('lineChart')?.getContext('2d');
    if (lineCtx) {
        const sortedDays = [...new Set(entries.map(e => e.date.slice(-2)))].sort((a, b) => parseInt(a) - parseInt(b));
        const dayCatData = {};
        const dayIncomeData = [];
        CATEGORIES.forEach(cat => dayCatData[cat] = []);

        sortedDays.forEach(day => {
            let dayIncome = 0;
            CATEGORIES.forEach(cat => {
                const total = entries.filter(e => e.date.slice(-2) === day && e.category === cat).reduce((s, e) => s + e.count, 0);
                dayCatData[cat].push(total);
                dayIncome += total * (prices[cat] || 0);
            });
            dayIncomeData.push(dayIncome);
        });

        const hasIncomeData = dayIncomeData.some(v => v > 0);
        lineChart = new Chart(lineCtx, {
            type: 'bar',
            data: {
                labels: sortedDays,
                datasets: [
                    ...CATEGORIES.map((cat, i) => ({
                        label: cat, data: dayCatData[cat], backgroundColor: COLORS[i % COLORS.length], stack: 'stack0', order: 1
                    })),
                    ...(hasIncomeData ? [{
                        type: 'line', label: 'Ingresos (€)', data: dayIncomeData,
                        borderColor: '#e74c3c', backgroundColor: 'rgba(231,76,60,0.1)',
                        fill: false, tension: 0.3, pointRadius: 4, pointHoverRadius: 6, borderWidth: 2, order: 0, yAxisID: 'y1'
                    }] : [])
                ]
            },
            options: {
                responsive: true, maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    title: { display: true, text: 'Pacientes e Ingresos por Día del Mes' },
                    tooltip: {
                        mode: 'index', intersect: false,
                        callbacks: {
                            title: ti => `Día ${ti[0]?.label || ''}`,
                            label: () => null,
                            afterBody(ti) {
                                if (!ti.length) return [];
                                const idx = ti[0].dataIndex;
                                const lines = [];
                                CATEGORIES.forEach(cat => {
                                    const val = dayCatData[cat][idx];
                                    if (val > 0) {
                                        const price = prices[cat] || 0;
                                        lines.push(`${cat}: ${val}${price > 0 ? ` (${(val * price).toFixed(2)}€)` : ''}`);
                                    }
                                });
                                lines.push(`─────────────`, `Total: ${CATEGORIES.reduce((s, cat) => s + dayCatData[cat][idx], 0)} pacientes`);
                                if (dayIncomeData[idx] > 0) lines.push(`Ingresos: ${dayIncomeData[idx].toFixed(2)}€`);
                                return lines;
                            }
                        }
                    }
                },
                scales: {
                    x: { stacked: true },
                    y: { beginAtZero: true, stacked: true, title: { display: true, text: 'Pacientes' } },
                    y1: hasIncomeData ? { type: 'linear', display: true, position: 'right', beginAtZero: true, title: { display: true, text: 'Ingresos (€)' }, grid: { drawOnChartArea: false } } : {}
                }
            }
        });
        chartMap['lineChart'] = lineChart;
        renderLegend(lineChart, 'legend-lineChart');
    }
}

function updateAnnualChart(endMonth) {
    const [y, m] = endMonth.split('-').map(Number);
    const end = new Date(y, m - 1, 1);
    const labels = [], monthTotals = [], monthKeys = [];
    const categoryData = {};
    CATEGORIES.forEach(cat => categoryData[cat] = []);
    
    for (let i = 11; i >= 0; i--) {
        const d = new Date(end.getFullYear(), end.getMonth() - i, 1);
        const ms = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        labels.push(d.toLocaleDateString('es-ES', { month: 'short', year: '2-digit' }));
        monthKeys.push(ms);
        
        const prices = getEffectivePrices(ms);
        const me = getEntries().filter(e => e.date.startsWith(ms));
        let mTotal = 0;
        CATEGORIES.forEach(cat => {
            const ct = me.filter(e => e.category === cat).reduce((s, e) => s + e.count, 0);
            categoryData[cat].push(ct);
            mTotal += ct * (prices[cat] || 0);
        });
        monthTotals.push(mTotal);
    }

    const ctx = document.getElementById('annualChart')?.getContext('2d');
    if (!ctx) return;

    if (annualChart) annualChart.destroy();
    annualChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels,
            datasets: [
                ...CATEGORIES.map((cat, i) => ({
                    label: cat, data: categoryData[cat], backgroundColor: COLORS[i % COLORS.length], stack: 'stack0'
                })),
                {
                    type: 'line', label: 'Ingresos (€)', data: monthTotals,
                    borderColor: '#e74c3c', backgroundColor: 'rgba(231,76,60,0.1)',
                    fill: true, tension: 0.3, order: -1, yAxisID: 'y1'
                }
            ]
        },
        options: {
            responsive: true, maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                title: { display: true, text: 'Resumen Anual — Pacientes e Ingresos (últimos 12 meses)' },
                tooltip: {
                    mode: 'index', intersect: false,
                    callbacks: {
                        title: ti => ti[0]?.label || '',
                        label: () => null,
                        afterBody(ti) {
                            if (!ti.length) return [];
                            const idx = ti[0].dataIndex;
                            const ms = monthKeys[idx];
                            const prices = getEffectivePrices(ms);
                            const lines = [];
                            CATEGORIES.forEach(cat => {
                                const val = categoryData[cat][idx];
                                const price = prices[cat] || 0;
                                if (val > 0) lines.push(`${cat}: ${val}${price > 0 ? ` (${(val * price).toFixed(2)}€)` : ''}`);
                            });
                            lines.push(`─────────────`, `Total: ${CATEGORIES.reduce((s, cat) => s + categoryData[cat][idx], 0)} pacientes`);
                            if (monthTotals[idx] > 0) lines.push(`Ingresos: ${monthTotals[idx].toFixed(2)}€`);
                            return lines;
                        }
                    }
                }
            },
            scales: {
                x:  { stacked: true },
                y:  { beginAtZero: true, stacked: true, title: { display: true, text: 'Pacientes' } },
                y1: { type: 'linear', display: true, position: 'right', beginAtZero: true, title: { display: true, text: 'Ingresos (€)' }, grid: { drawOnChartArea: false } }
            }
        }
    });
    chartMap['annualChart'] = annualChart;
    renderLegend(annualChart, 'legend-annualChart');
}

function renderLegend(chart, containerId) {
    const el = document.getElementById(containerId);
    if (!el) return;
    el.innerHTML = chart.data.datasets
        .filter(ds => ds.label && ds.type !== 'line')
        .map((ds, i) => `
            <div class="legend-item" onclick="toggleDataset(${chartMap[containerId.replace('legend-','')] ? Object.keys(chartMap).find(k => 'legend-'+k === containerId) : ''}, ${i})">
                <span class="legend-color" style="background:${ds.backgroundColor}"></span>
                <span class="legend-label">${ds.label}</span>
            </div>
        `).join('');
}

// ── Comparativa Global ────────────────────────────────────────────────

function getAvailableMonthsAllDoctors() {
    const months = new Set();
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('clinicEntries_')) {
            try {
                const entries = JSON.parse(localStorage.getItem(key) || '[]');
                entries.forEach(e => months.add(e.date.substring(0, 7)));
            } catch(e) {}
        }
    }
    const now = new Date();
    for (let i = 0; i < 3; i++) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        months.add(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
    }
    return [...months].sort().reverse();
}

function initCompare() {
    const docs = getDoctors();
    const selA = document.getElementById('compareDocA');
    const selB = document.getElementById('compareDocB');
    if (!selA || !selB) return;

    const options = `<option value="_all">Todos los médicos</option>` + docs.map(d => `<option value="${d.id}">${d.name}</option>`).join('');
    selA.innerHTML = options;
    selB.innerHTML = options;
    
    // Default: current doc vs all
    selA.value = getCurrentDoctorId();
    selB.value = '_all';

    const months = getAvailableMonthsAllDoctors();
    const mSelA = document.getElementById('compareMonthA');
    const mSelB = document.getElementById('compareMonthB');
    const mOpts = months.map(m => `<option value="${m}">${formatMonth(m)}</option>`).join('');
    mSelA.innerHTML = mOpts;
    mSelB.innerHTML = mOpts;
    
    updateCompare();
}

function updateCompare() {
    const docIdA = document.getElementById('compareDocA').value;
    const monthA = document.getElementById('compareMonthA').value;
    const docIdB = document.getElementById('compareDocB').value;
    const monthB = document.getElementById('compareMonthB').value;

    updateCompareCharts(docIdA, monthA, docIdB, monthB);
}

function updateCompareCharts(docIdA, monthA, docIdB, monthB) {
    if (compareLineChart) compareLineChart.destroy();
    if (compareAnnualChart) compareAnnualChart.destroy();

    const labelA = docIdA === '_all' ? 'Todos' : (getDoctors().find(d => d.id === docIdA)?.name || 'Médico A');
    const labelB = docIdB === '_all' ? 'Todos' : (getDoctors().find(d => d.id === docIdB)?.name || 'Médico B');

    // Lógica de datos comparativos...
    const catDataByMonthA = {}; CATEGORIES.forEach(cat => catDataByMonthA[cat] = []);
    const catDataByMonthB = {}; CATEGORIES.forEach(cat => catDataByMonthB[cat] = []);
    const commonLabels = [], monthKeysA = [], monthKeysB = [];

    const dateA = new Date(monthA + '-01');
    const dateB = new Date(monthB + '-01');

    for (let i = 11; i >= 0; i--) {
        const dA = new Date(dateA.getFullYear(), dateA.getMonth() - i, 1);
        const msA = `${dA.getFullYear()}-${String(dA.getMonth() + 1).padStart(2, '0')}`;
        const dB = new Date(dateB.getFullYear(), dateB.getMonth() - i, 1);
        const msB = `${dB.getFullYear()}-${String(dB.getMonth() + 1).padStart(2, '0')}`;

        commonLabels.push(dA.toLocaleDateString('es-ES', { month: 'short', year: '2-digit' }));
        monthKeysA.push(msA);
        monthKeysB.push(msB);

        const entriesA = docIdA === '_all'
            ? getDoctors().flatMap(doc => JSON.parse(localStorage.getItem(`clinicEntries_${doc.id}`) || '[]').filter(e => e.date.startsWith(msA)))
            : JSON.parse(localStorage.getItem(`clinicEntries_${docIdA}`) || '[]').filter(e => e.date.startsWith(msA));
        
        CATEGORIES.forEach(cat => {
            catDataByMonthA[cat].push(entriesA.filter(e => e.category === cat).reduce((s, e) => s + e.count, 0));
        });

        const entriesB = docIdB === '_all'
            ? getDoctors().flatMap(doc => JSON.parse(localStorage.getItem(`clinicEntries_${doc.id}`) || '[]').filter(e => e.date.startsWith(msB)))
            : JSON.parse(localStorage.getItem(`clinicEntries_${docIdB}`) || '[]').filter(e => e.date.startsWith(msB));
        
        CATEGORIES.forEach(cat => {
            catDataByMonthB[cat].push(entriesB.filter(e => e.category === cat).reduce((s, e) => s + e.count, 0));
        });
    }

    const ctx = document.getElementById('compareAnnualChart')?.getContext('2d');
    if (ctx) {
        compareAnnualChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: commonLabels,
                datasets: [
                    ...CATEGORIES.slice(0, 6).map((cat, i) => ({
                        label: `${labelA} - ${cat}`, data: catDataByMonthA[cat], backgroundColor: COLORS[i % COLORS.length], stack: 'stackA'
                    })),
                    ...CATEGORIES.slice(0, 6).map((cat, i) => ({
                        label: `${labelB} - ${cat}`, data: catDataByMonthB[cat], backgroundColor: COLORS[(i + 6) % COLORS.length], stack: 'stackB'
                    }))
                ]
            },
            options: {
                responsive: true, maintainAspectRatio: false,
                plugins: { legend: { display: false }, title: { display: true, text: 'Comparativa Anual de Pacientes' } },
                scales: { x: { title: { display: true, text: 'Mes' } }, y: { beginAtZero: true, title: { display: true, text: 'Pacientes' } } }
            }
        });
    }
}

async function generateProfessionalPDF() {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF('p', 'mm', 'a4');
    const pageWidth = doc.internal.pageSize.getWidth();
    
    const sel = document.getElementById('globalMonthSelect');
    const month = (sel && sel.value) ? sel.value : getCurrentMonth();
    const monthLabel = formatMonth(month);
    const { data } = getMonthData(month);
    const prices = getPrices();
    const commissions = getCommissions();
    const clinicInfo = getClinicInfo();
    const doctor = getCurrentDoctor();
    const logo = localStorage.getItem('clinicLogo');

    toast('Generando PDF...', 'info');

    // 1. Header & Logo
    let y = 15;
    if (logo) {
        try {
            doc.addImage(logo, 'PNG', 15, y, 40, 15);
            y += 20;
        } catch(e) { console.error('Error adding logo to PDF', e); }
    }

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(18);
    doc.text(clinicInfo.name || 'Clínica', logo ? 60 : 15, logo ? 22 : y);
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100);
    if (clinicInfo.address) {
        doc.text(clinicInfo.address, logo ? 60 : 15, logo ? 27 : y + 5);
    }
    
    y = logo ? 40 : y + 15;
    doc.setDrawColor(200);
    doc.line(15, y, pageWidth - 15, y);
    y += 10;

    // 2. Report Info
    doc.setTextColor(0);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text(`Informe Mensual: ${monthLabel}`, 15, y);
    y += 7;
    
    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    doc.text(`Médico: ${doctor?.name || 'N/A'} ${doctor?.specialty ? `(${doctor.specialty})` : ''}`, 15, y);
    y += 5;
    doc.text(`NIF: ${doctor?.nif || 'N/A'}`, 15, y);
    y += 10;

    // 3. Summary Table
    doc.setFont('helvetica', 'bold');
    doc.setFillColor(240, 244, 255);
    doc.rect(15, y, pageWidth - 30, 8, 'F');
    doc.text('Categoría', 20, y + 5.5);
    doc.text('Pacientes', 100, y + 5.5, { align: 'right' });
    doc.text('Precio', 130, y + 5.5, { align: 'right' });
    doc.text('Total Bruto', 180, y + 5.5, { align: 'right' });
    y += 8;

    doc.setFont('helvetica', 'normal');
    let totalPacientes = 0;
    let totalBruto = 0;

    CATEGORIES.forEach(cat => {
        const count = data[cat] || 0;
        if (count > 0) {
            const price = prices[cat] || 0;
            const total = count * price;
            totalPacientes += count;
            totalBruto += total;

            if (y > 270) { doc.addPage(); y = 20; }
            doc.text(cat, 20, y + 6);
            doc.text(count.toString(), 100, y + 6, { align: 'right' });
            doc.text(`${price.toFixed(2)}€`, 130, y + 6, { align: 'right' });
            doc.text(`${total.toFixed(2)}€`, 180, y + 6, { align: 'right' });
            y += 7;
            doc.setDrawColor(240);
            doc.line(15, y, pageWidth - 15, y);
        }
    });

    // Total Row
    y += 2;
    doc.setFont('helvetica', 'bold');
    doc.text('TOTAL', 20, y + 6);
    doc.text(totalPacientes.toString(), 100, y + 6, { align: 'right' });
    doc.text(`${totalBruto.toFixed(2)}€`, 180, y + 6, { align: 'right' });
    y += 15;

    // 4. Charts Capture
    try {
        const chartsContainer = document.querySelector('.charts-container');
        if (chartsContainer) {
            const canvas = await html2canvas(chartsContainer, { scale: 2 });
            const imgData = canvas.toDataURL('image/png');
            const imgProps = doc.getImageProperties(imgData);
            const imgHeight = (imgProps.height * (pageWidth - 30)) / imgProps.width;
            
            if (y + imgHeight > 280) { doc.addPage(); y = 20; }
            doc.addImage(imgData, 'PNG', 15, y, pageWidth - 30, imgHeight);
            y += imgHeight + 10;
        }
        
        const annualChartCanvas = document.getElementById('annualChart');
        if (annualChartCanvas) {
            const canvas = await html2canvas(annualChartCanvas.parentElement, { scale: 2 });
            const imgData = canvas.toDataURL('image/png');
            const imgProps = doc.getImageProperties(imgData);
            const imgHeight = (imgProps.height * (pageWidth - 30)) / imgProps.width;
            
            if (y + imgHeight > 280) { doc.addPage(); y = 20; }
            doc.addImage(imgData, 'PNG', 15, y, pageWidth - 30, imgHeight);
        }
    } catch (e) {
        console.error('Error capturing charts for PDF', e);
    }

    doc.save(`Informe_${doctor?.name || 'Clinica'}_${month}.pdf`);
    toast('PDF generado correctamente', 'success');
}
