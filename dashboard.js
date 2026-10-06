// ==========================================
// 1. SATPAM (GUARD): CEK LOGIN
// ==========================================
const dbUrl = localStorage.getItem('iot_db_url');
const dbSecret = localStorage.getItem('iot_db_secret');
const userId = localStorage.getItem('iot_user_id');

if (!dbUrl || !dbSecret || !userId) {
    window.location.href = 'login.html';
}

// ==========================================
// HELPER: CEK VISIBILITAS WIDGET
// ==========================================
function isWidgetVisible(key) {
    const savedSettings = JSON.parse(localStorage.getItem('iot_widget_visibility')) || {};
    return savedSettings.hasOwnProperty(key) ? savedSettings[key] : true;
}

// Tampilkan User ID di Header
const userDisplay = document.getElementById('user-display');
if (userDisplay) {
    userDisplay.textContent = `Pengguna: ${userId}`;
}

const container = document.getElementById('dynamic-dashboard');
let pollingInterval = null;

// ==========================================
// HELPER: Mapping key ke label teks yang rapi
// ==========================================
function getHumanLabel(key) {
    return key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
}

// ==========================================
// 2. FUNGSI KIRIM DATA
// ==========================================
function sendData(key, value) {
    const cleanUrl = dbUrl.replace(/\/+$/, "");
    const url = `${cleanUrl}/${userId}/${key}.json?auth=${dbSecret}`;
    
    fetch(url, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(value)
    }).catch(err => console.error("Error mengirim data:", err));
}

// ==========================================
// 3. FUNGSI UTAMA: AMBIL DATA & RENDER DINAMIS
// ==========================================
async function fetchAndRenderDashboard() {
    try {
        const cleanUrl = dbUrl.replace(/\/+$/, "");
        const url = `${cleanUrl}/${userId}.json?auth=${dbSecret}`;
        
        const response = await fetch(url);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        
        const data = await response.json();
        if (!data) return;

        const loadingMsg = container.querySelector('.loading-text');
        if (loadingMsg) loadingMsg.remove();

        Object.keys(data).forEach(key => {
            if (!isWidgetVisible(key)) {
                const existingWidget = document.getElementById(`widget-${key}`);
                if (existingWidget) existingWidget.remove();
                return; 
            }
        
            const value = data[key];
            const type = typeof value;
            let widgetEl = document.getElementById(`widget-${key}`);

            if (!widgetEl) {
                let html = '';
                
                if (type === 'boolean') {
                    html = createSwitchWidget(key, value);
                } 
                else if (type === 'number') {
                    if (key.includes('hlevel') || key.includes('jarak') || key.includes('ketinggian')) {
                        html = createHLevelWidget(key, value);
                    } else {
                        html = createGaugeWidget(key, value);
                    }
                } 
                else if (type === 'string') {
                    if (key.startsWith('display')) {
                        html = createDisplayWidget(key, value);
                    } else {
                        html = createIndicatorWidget(key, value);
                    }
                }

                if (html) {
                    container.insertAdjacentHTML('beforeend', html);
                    widgetEl = document.getElementById(`widget-${key}`);
                }
            }

            if (widgetEl) {
                updateWidgetValue(widgetEl, key, value, type);
            }
        });

    } catch (error) {
        console.error("Gagal mengambil data:", error);
    }
}

// ==========================================
// 4. PABRIK WIDGET (TEMPLATE HTML)
// ==========================================
function createGaugeWidget(key, value) {
    const numValue = typeof value === 'number' ? value : 0;
    const percentage = Math.min((numValue / 100) * 100, 100);
    const offset = 283 - (283 * percentage / 100);
    const label = getHumanLabel(key);
    
    return `
    <div class="widget gauge-widget" id="widget-${key}">
        <div class="widget-header">
            <span class="widget-title">${label}</span>
            <span class="widget-value">${numValue}</span>
        </div>
        <div class="gauge-container">
            <div class="gauge-circle">
                <svg viewBox="0 0 100 100">
                    <circle cx="50" cy="50" r="45" class="gauge-bg"/>
                    <circle cx="50" cy="50" r="45" class="gauge-fill" style="stroke-dashoffset: ${offset};"></circle>
                </svg>
                <div class="gauge-text">
                    <span>${numValue}</span>
                    <small>unit</small>
                </div>
            </div>
        </div>
    </div>`;
}

function createHLevelWidget(key, value) {
    const numValue = typeof value === 'number' ? value : 0;
    const percentage = Math.min((numValue / 200) * 100, 100);
    const label = getHumanLabel(key);
    
    return `
    <div class="widget hlevel-widget" id="widget-${key}">
        <div class="widget-header">
            <span class="widget-title">${label}</span>
            <span class="widget-value">${numValue}</span>
        </div>
        <div class="hlevel-bar">
            <div class="hlevel-fill" style="width: ${percentage}%;"></div>
        </div>
        <div class="hlevel-label">
            <span>0</span>
            <span>${numValue}</span>
            <span>Maks</span>
        </div>
    </div>`;
}

function createIndicatorWidget(key, value) {
    const label = getHumanLabel(key);
    return `
    <div class="widget indicator-widget" id="widget-${key}">
        <div class="widget-header">
            <span class="widget-title">${label}</span>
        </div>
        <div class="indicator-content">
            <span class="indicator-text">${value}</span>
        </div>
    </div>`;
}

// FUNGSI DISPLAY WIDGET (AUTO-SEND, TANPA TOMBOL)
function createDisplayWidget(key, value) {
    const label = getHumanLabel(key);
    const safeValue = value || "";
    return `
    <div class="widget display-widget" id="widget-${key}">
        <div class="widget-header">
            <span class="widget-title">${label}</span>
            <span class="display-status" id="status-${key}"></span>
        </div>
        <div class="display-content">
            <input type="text" 
                   class="display-input" 
                   id="input-${key}" 
                   value="${safeValue}" 
                   placeholder="Ketik pesan..." 
                   data-key="${key}">
        </div>
    </div>`;
}

function createSwitchWidget(key, value) {
    const isChecked = (value === true || value === "true") ? 'checked' : '';
    const label = getHumanLabel(key);
    
    return `
    <div class="widget switch-widget" id="widget-${key}">
        <div class="widget-header">
            <span class="widget-title">${label}</span>
        </div>
        <div class="switch-container">
            <label class="switch">
                <input type="checkbox" id="toggle-${key}" ${isChecked}>
                <span class="slider"></span>
            </label>
        </div>
    </div>`;
}

// ==========================================
// 5. FUNGSI UPDATE NILAI (ANTI-FLICKER)
// ==========================================
function updateWidgetValue(widgetEl, key, value, type) {
    if (type === 'number') {
        const numValue = typeof value === 'number' ? value : 0;
        
        if (widgetEl.classList.contains('gauge-widget')) {
            const percentage = Math.min((numValue / 100) * 100, 100);
            const offset = 283 - (283 * percentage / 100);
            const circle = widgetEl.querySelector('.gauge-fill');
            const text = widgetEl.querySelector('.gauge-text span');
            const valDisplay = widgetEl.querySelector('.widget-value');
            
            if (circle) circle.style.strokeDashoffset = offset;
            if (text) text.textContent = numValue;
            if (valDisplay) valDisplay.textContent = numValue;
        } 
        else if (widgetEl.classList.contains('hlevel-widget')) {
            const percentage = Math.min((numValue / 200) * 100, 100);
            const fill = widgetEl.querySelector('.hlevel-fill');
            const text = widgetEl.querySelector('.hlevel-label span:nth-child(2)');
            const valDisplay = widgetEl.querySelector('.widget-value');
            
            if (fill) fill.style.width = `${percentage}%`;
            if (text) text.textContent = numValue;
            if (valDisplay) valDisplay.textContent = numValue;
        }
    } 
    else if (type === 'string') {
        if (key.startsWith('display')) {
            const input = widgetEl.querySelector('.display-input');
            // PENTING: Jangan update value jika user sedang mengetik (fokus) di input tersebut
            if (input && document.activeElement !== input) {
                input.value = value;
            }
        } else {
            const text = widgetEl.querySelector('.indicator-text');
            if (text) text.textContent = value;
        }
    } 
    else if (type === 'boolean') {
        const toggle = widgetEl.querySelector('input[type="checkbox"]');
        if (toggle) {
            const isChecked = (value === true || value === "true");
            if (toggle.checked !== isChecked) {
                toggle.checked = isChecked;
            }
        }
    }
}

// ==========================================
// 6. EVENT DELEGATION
// ==========================================

// 6a. Sakelar
container.addEventListener('change', (e) => {
    if (e.target.matches('input[type="checkbox"]')) {
        const key = e.target.id.replace('toggle-', '');
        sendData(key, e.target.checked);
    }
});

// 6b. Display Input (Auto-send dengan Debounce)
container.addEventListener('input', (e) => {
    if (e.target.matches('.display-input')) {
        const key = e.target.getAttribute('data-key');
        const value = e.target.value;
        
        // Clear timeout sebelumnya
        if (window.displayTimeouts && window.displayTimeouts[key]) {
            clearTimeout(window.displayTimeouts[key]);
        }
        
        // Set timeout baru (kirim setelah 800ms tidak ada ketikan)
        if (!window.displayTimeouts) window.displayTimeouts = {};
        window.displayTimeouts[key] = setTimeout(() => {
            sendData(key, value);
            showSendStatus(key, 'sent');
        }, 800);
    }
});

// 6c. Display Input (Kirim langsung saat tekan Enter)
container.addEventListener('keypress', (e) => {
    if (e.target.matches('.display-input') && e.key === 'Enter') {
        e.preventDefault();
        const key = e.target.getAttribute('data-key');
        const value = e.target.value;
        sendData(key, value);
        showSendStatus(key, 'sent');
        e.target.blur(); // Hilangkan fokus keyboard setelah enter
    }
});

// 6d. Fungsi Visual Feedback (Centang Hijau)
function showSendStatus(key, status) {
    const statusEl = document.getElementById(`status-${key}`);
    if (!statusEl) return;
    
    if (status === 'sent') {
        statusEl.innerHTML = '✓';
        statusEl.style.color = '#28a745'; // Warna hijau sukses
        setTimeout(() => {
            statusEl.innerHTML = '';
        }, 1500);
    }
}

// ==========================================
// 7. LOGOUT
// ==========================================
function logout() {
    localStorage.removeItem('iot_db_url');
    localStorage.removeItem('iot_db_secret');
    localStorage.removeItem('iot_user_id');
    if (pollingInterval) clearInterval(pollingInterval);
    window.location.href = 'login.html';
}

const logoutBtn = document.getElementById('logoutBtn');
if (logoutBtn) {
    logoutBtn.addEventListener('click', logout);
}

// ==========================================
// 8. JALANKAN SAAT HALAMAN DIMUAT
// ==========================================
console.log("Dashboard diinisialisasi untuk pengguna:", userId);
fetchAndRenderDashboard();
pollingInterval = setInterval(fetchAndRenderDashboard, 3000);

// ==========================================
// 9. FUNGSI DOWNLOAD KODE ARDUINO OTOMATIS
// ==========================================
function downloadArduinoCode() {
    const moduleKey = document.getElementById('moduleSelect').value;
    
    if (!moduleKey) {
        alert('⚠️ Silakan pilih modul terlebih dahulu!');
        return;
    }
    if (!ARDUINO_TEMPLATES[moduleKey]) {
        alert('❌ Template kode untuk modul ini belum tersedia.');
        return;
    }

    const wifiSsid = localStorage.getItem('iot_wifi_ssid') || 'UMS Wifi';
    const wifiPass = localStorage.getItem('iot_wifi_pass') || 'ums.wifi';
    const currentDbUrl = localStorage.getItem('iot_db_url');
    const currentDbSecret = localStorage.getItem('iot_db_secret');
    const currentUserId = localStorage.getItem('iot_user_id');

    let finalCode = ARDUINO_TEMPLATES[moduleKey];
    finalCode = finalCode.replaceAll('{{WIFI_SSID}}', wifiSsid);
    finalCode = finalCode.replaceAll('{{WIFI_PASSWORD}}', wifiPass);
    finalCode = finalCode.replaceAll('{{DATABASE_URL}}', currentDbUrl);
    finalCode = finalCode.replaceAll('{{API_KEY}}', currentDbSecret);
    finalCode = finalCode.replaceAll('{{USER_ID}}', currentUserId);

    const blob = new Blob([finalCode], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    
    const date = new Date().toISOString().slice(0, 10);
    a.href = url;
    a.download = `${moduleKey}_${currentUserId}_${date}.ino`;
    
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    console.log(`✅ Kode ${moduleKey} berhasil diracik dan diunduh!`);
}

// ==========================================
// 10. FUNGSI AUTO-POPULATE DROPDOWN MODUL
// ==========================================
function populateModuleDropdown() {
    const select = document.getElementById('moduleSelect');
    if (!select || typeof ARDUINO_TEMPLATES === 'undefined') return;
    
    while (select.options.length > 1) {
        select.remove(1);
    }
    
    const moduleLabels = {
        "modul04": "Modul 04 - LED, Buzzer, Relay",
        "modul05LCD": "Modul 05 - LCD 16x2 I2C",
        "modul05OLED": "Modul 05 - OLED Display 128x64",
        "modul06LDR": "Modul 06 - Sensor Cahaya LDR",
        "modul06BH1750": "Modul 06 - Sensor Cahaya BH1750",
        "modul06POTENSI": "Modul 06 - Potensiometer",
        "modul07DHT": "Modul 07 - DHT11 (Suhu & Kelembaban)",
        "modul08": "Modul 08 - BMP180 (Cuaca & Ketinggian)",
        "modul09": "Modul 09 - Smart Agriculture (Tanah/Hujan)",
        "modul10PIR": "Modul 10 - Sensor PIR (Gerakan)",
        "modul10BAG02": "Modul 10 - Sensor Ultrasonik (Jarak)",
        "modul11": "Modul 11 - Motor Servo",
        "modul12": "Modul 12 - RFID MFRC522",
        "modul13REG": "Modul 13 - Fingerprint (Enroll/Daftar)",
        "modul13READ": "Modul 13 - Fingerprint (Read/Verifikasi)",
        "modul13DEL": "Modul 13 - Fingerprint (Delete/Hapus)",
        "modul14": "Modul 14 - Sensor Gesture APDS9960"
    };
    
    Object.keys(ARDUINO_TEMPLATES).forEach(key => {
        const option = document.createElement('option');
        option.value = key;
        option.textContent = moduleLabels[key] || key;
        select.appendChild(option);
    });
}

populateModuleDropdown();

// ==========================================
// 11. FUNGSI DOWNLOAD SEMUA MODUL (.ZIP)
// ==========================================
async function downloadAllModules() {
    const statusEl = document.getElementById('download-status');
    if (statusEl) {
        statusEl.style.display = 'block';
        statusEl.textContent = '⏳ Sedang meracik file ZIP... Mohon tunggu.';
    }

    try {
        const wifiSsid = localStorage.getItem('iot_wifi_ssid') || 'UMS Wifi';
        const wifiPass = localStorage.getItem('iot_wifi_pass') || 'ums.wifi';
        const currentDbUrl = localStorage.getItem('iot_db_url');
        const currentDbSecret = localStorage.getItem('iot_db_secret');
        const currentUserId = localStorage.getItem('iot_user_id');

        const zip = new JSZip();

        const folderStructure = {
            "modul04": "modul04/modul04.ino",
            "modul05LCD": "modul05/modul05LCD.ino",
            "modul05OLED": "modul05/modul05OLED.ino",
            "modul06BH1750": "modul06/modul06BH1750.ino",
            "modul06LDR": "modul06/modul06LDR.ino",
            "modul06POTENSI": "modul06/modul06POTENSI.ino",
            "modul07DHT": "modul07/modul07DHT.ino",
            "modul08": "modul08/modul08.ino",
            "modul09": "modul09/modul09.ino",
            "modul10BAG02": "modul10/modul10BAG02.ino",
            "modul10PIR": "modul10/modul10PIR.ino",
            "modul11": "modul11/modul11.ino",
            "modul12": "modul12/modul12.ino",
            "modul13DEL": "modul13/modul13DEL.ino",
            "modul13READ": "modul13/modul13READ.ino",
            "modul13REG": "modul13/modul13REG.ino",
            "modul14": "modul14/modul14.ino"
        };

        for (const [key, template] of Object.entries(ARDUINO_TEMPLATES)) {
            let finalCode = template
                .replaceAll('{{WIFI_SSID}}', wifiSsid)
                .replaceAll('{{WIFI_PASSWORD}}', wifiPass)
                .replaceAll('{{DATABASE_URL}}', currentDbUrl)
                .replaceAll('{{API_KEY}}', currentDbSecret)
                .replaceAll('{{USER_ID}}', currentUserId);

            const filePath = folderStructure[key] || `${key}/${key}.ino`;
            zip.file(filePath, finalCode);
        }

        const content = await zip.generateAsync({ type: "blob" });
        const date = new Date().toISOString().slice(0, 10);
        saveAs(content, `Kode_Arduino_Lengkap_${currentUserId}_${date}.zip`);

        if (statusEl) {
            statusEl.textContent = '✅ Berhasil! File ZIP telah diunduh.';
            setTimeout(() => { statusEl.style.display = 'none'; }, 3000);
        }

    } catch (error) {
        console.error("Gagal membuat ZIP:", error);
        if (statusEl) {
            statusEl.textContent = '❌ Gagal membuat file ZIP. Cek console untuk detail.';
            statusEl.style.color = 'var(--danger, red)';
        }
    }
}