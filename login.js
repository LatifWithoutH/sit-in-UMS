const loginForm = document.getElementById('login-form');
const loadingOverlay = document.getElementById('loadingOverlay');
const loadingText = document.getElementById('loadingText');

// Fungsi helper untuk jeda waktu (agar animasi "Berhasil" sempat terbaca)
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Cek jika sudah login, langsung lempar ke dashboard
if (localStorage.getItem('iot_db_url') && localStorage.getItem('iot_db_secret')) {
    window.location.href = 'dashboard.html';
}

loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    // 1. Ambil nilai dari form (TANPA .toLowerCase())
    const dbUrl = document.getElementById('db-url').value.trim();
    const dbSecret = document.getElementById('db-secret').value.trim();
    const userId = document.getElementById('user-id').value.trim(); // <-- PERUBAHAN DI SINI
	// Di dalam event listener submit form login:
	const wifiSsid = document.getElementById('wifiSsid').value;
	const wifiPass = document.getElementById('wifiPass').value;

	localStorage.setItem('iot_wifi_ssid', wifiSsid);
	localStorage.setItem('iot_wifi_pass', wifiPass);
	// ... (lanjut simpan dbUrl, dbSecret, userId seperti biasa)

    if (!userId || !dbUrl || !dbSecret) {
        alert("Mohon lengkapi semua field!");
        return;
    }

    // 2. Tampilkan Animasi "Menunggu"
    loadingOverlay.classList.remove('hidden');
    loadingText.textContent = "Memverifikasi kredensial...";

    try {
        // 3. Panggil fungsi dari adduser.js
        await ensureUserExists(dbUrl, dbSecret, userId);
        
        // 4. Animasi "Selesai"
        loadingText.textContent = "Berhasil! Mengalihkan ke dashboard...";
        
        // Tunggu 1.2 detik agar user sempat membaca pesan sukses
        await delay(1200);
        
        // 5. Simpan ke LocalStorage
        localStorage.setItem('iot_db_url', dbUrl);
        localStorage.setItem('iot_db_secret', dbSecret);
        localStorage.setItem('iot_user_id', userId);

        // 6. Pindah ke Dashboard
        window.location.href = 'dashboard.html';

    } catch (error) {
        console.error("Login Error:", error);
        // Sembunyikan animasi jika error
        loadingOverlay.classList.add('hidden');
        alert(`Gagal Login: ${error.message}`);
    }
});