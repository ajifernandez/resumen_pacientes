// ── Categorías por defecto (Médico de Familia) ────────────────────────────
const DEFAULT_CATEGORIES = [
    'Adeslas', 'Adeslas Revisión', 'Adeslas Funcionarios', 'Adeslas Vacuna Funcionarios',
    'DKV', 'DKV Revisión', 'DKV Famedic', 'DKV Famedic Revisión',
    'Mapfre', 'Mapfre Revisión',
    'AXA', 'AXA Revisión',
    'Privado Efectivo', 'Privado Tarjeta',
    'Vacunas'
];

// ── Paleta de colores (26 colores para hasta 26 categorías) ───────────────
const COLOR_PALETTE = [
    '#667eea','#5b8dee','#3b82f6','#93c5fd',
    '#10b981','#34d399','#059669','#6ee7b7',
    '#f59e0b','#fbbf24','#f97316','#fb923c',
    '#ef4444','#f87171','#dc2626','#fca5a5',
    '#8b5cf6','#a78bfa','#7c3aed','#c4b5fd',
    '#06b6d4','#22d3ee','#0891b2','#67e8f9',
    '#ec4899','#f43f5e'
];

// ── Presets de categorías por especialidad ────────────────────────────────
const SPECIALTY_PRESETS = {
    'Médico de Familia': [
        'Adeslas','Adeslas Revisión','Adeslas Funcionarios','Adeslas Vacuna Funcionarios',
        'DKV','DKV Revisión','DKV Famedic','DKV Famedic Revisión',
        'Mapfre','Mapfre Revisión','AXA','AXA Revisión',
        'Privado Efectivo','Privado Tarjeta','Vacunas'
    ],
    'Cardiología': [
        'Adeslas','Adeslas Revisión','DKV','DKV Revisión',
        'Mapfre','Mapfre Revisión','AXA','AXA Revisión',
        'Privado Efectivo','Privado Tarjeta','Ecocardio','Holter','Ergometría'
    ],
    'Ginecología': [
        'Adeslas','Adeslas Revisión','DKV','DKV Revisión',
        'Mapfre','Mapfre Revisión','AXA','AXA Revisión',
        'Privado Efectivo','Privado Tarjeta','Ecografía','Citología'
    ],
    'Pediatría': [
        'Adeslas','Adeslas Revisión','DKV','DKV Revisión',
        'Mapfre','Mapfre Revisión','AXA','AXA Revisión',
        'Privado Efectivo','Privado Tarjeta','Vacunas','Urgencias'
    ],
    'Logopedia': [
        'Sesión Individual','Sesión Grupal','Evaluación Inicial','Informe',
        'Adeslas','DKV','Mapfre','Mutua','Privado Efectivo','Privado Tarjeta'
    ],
    'Fisioterapia': [
        'Sesión Manual','Electroterapia','Punción Seca','Pilates Terapéutico',
        'Valoración Inicial','Adeslas','DKV','Mapfre','Mutua','Privado Efectivo','Privado Tarjeta'
    ],
    'Psicología': [
        'Primera Consulta','Sesión Individual','Sesión Pareja','Sesión Familiar',
        'Seguimiento','Adeslas','DKV','Mapfre','Privado Efectivo','Privado Tarjeta'
    ],
    'Dermatología': [
        'Adeslas','Adeslas Revisión','DKV','DKV Revisión',
        'Mapfre','Mapfre Revisión','AXA','AXA Revisión',
        'Privado Efectivo','Privado Tarjeta','Biopsia','Criocirugía','Cirugía'
    ]
};
