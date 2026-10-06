// ==========================================
// 1. INISIALISASI & CEK LOGIN
// ==========================================
const dbUrl = localStorage.getItem('iot_db_url');
const dbSecret = localStorage.getItem('iot_db_secret');
const userId = localStorage.getItem('iot_user_id');

if (!dbUrl || !dbSecret || !userId) {
    window.location.href = 'index.html'; // Atau 'login.html'
}

const container = document.getElementById('dynamic-settings-container');
const backBtn = document.getElementById('backBtn');
const saveBtn = document.getElementById('saveBtn');
const STORAGE_KEY = 'iot_widget_visibility';

// ==========================================
// 2. HELPER: FORMAT LABEL MURNI DINAMIS
// ==========================================
function getHumanLabel(key) {
    return key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
}

function getWidgetType(key, value) {
    if (typeof value === 'boolean') return 'switch';
    if (typeof value === 'string') {
        if (key.startsWith('display')) return 'display'; // <-- Bedakan display
        return 'indicator';
    }
    if (typeof value === 'number') {
        return key.toLowerCase().includes('hlevel') ? 'hlevel' : 'gauge';
    }
    return 'unknown';
}

// ==========================================
// 3. FUNGSI UTAMA: AMBIL DATA DARI FIREBASE & RENDER
// ==========================================
async function loadDynamicSettings() {
    try {
        const cleanUrl = dbUrl.replace(/\/+$/, "");
        const url = `${cleanUrl}/${userId}.json?auth=${dbSecret}`;
        
        const response = await fetch(url);
        if (!response.ok) throw new Error("Gagal terhubung ke Firebase");
        
        const data = await response.json();
        if (!data) {
            container.innerHTML = '<p class="empty-state">Belum ada data widget untuk user ini.</p>';
            return;
        }

        // 1. TAMBAHKAN 'display' DI SINI
        const groups = { gauge: [], hlevel: [], indicator: [], switch: [], display: [] };
        
        for (const [key, value] of Object.entries(data)) {
            const type = getWidgetType(key, value);
            if (groups[type]) {
                groups[type].push(key);
            }
        }

        container.innerHTML = ''; 
        
        // 2. TAMBAHKAN 'display' DI ARRAY ORDER
        const order = ['gauge', 'hlevel', 'indicator', 'switch', 'display'];
        
        // 3. PERBAIKAN: TAMBAH TANDA KOMA (,) SETELAH 'Sakelar (Kontrol)'
        const titles = { 
            gauge: 'Gauge (Data Angka)', 
            hlevel: 'Horizontal Level', 
            indicator: 'Indikator (Teks dari Alat)', 
            switch: 'Sakelar (Kontrol)', // <-- INI YANG KURANG KOMA SEBELUMNYA!
            display: 'Display (Kirim Teks ke Alat)' 
        };

        order.forEach(type => {
            if (groups[type].length > 0) {
                const groupHtml = createGroupHtml(type, titles[type], groups[type]);
                container.insertAdjacentHTML('beforeend', groupHtml);
            }
        });

        applySavedPreferences();

    } catch (error) {
        container.innerHTML = `<p class="error-state">Error: ${error.message}</p>`;
    }
}

// ==========================================
// 4. PEMBUAT HTML
// ==========================================
function createGroupHtml(type, title, keys) {
    let itemsHtml = keys.map(key => {
        const label = getHumanLabel(key);
        return `
        <label class="checkbox-label">
            <input type="checkbox" data-widget="${key}" class="widget-checkbox">
            <span>${label}</span>
        </label>`;
    }).join('');

    return `
    <div class="widget-group">
        <h3>${title}</h3>
        <div class="widget-grid">
            ${itemsHtml}
        </div>
    </div>`;
}

function applySavedPreferences() {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY)) || {};
    document.querySelectorAll('.widget-checkbox').forEach(cb => {
        const key = cb.getAttribute('data-widget');
        cb.checked = saved.hasOwnProperty(key) ? saved[key] : true; 
    });
}

// ==========================================
// 5. EVENT LISTENERS
// ==========================================
saveBtn.addEventListener('click', () => {
    const settings = {};
    document.querySelectorAll('.widget-checkbox').forEach(cb => {
        settings[cb.getAttribute('data-widget')] = cb.checked;
    });
    
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    
    const originalText = saveBtn.textContent;
    saveBtn.textContent = 'Tersimpan!';
    
    setTimeout(() => {
        window.location.href = 'dashboard.html';
    }, 800);
});

backBtn.addEventListener('click', () => {
    window.location.href = 'dashboard.html';
});

// Jalankan saat halaman dimuat
loadDynamicSettings();