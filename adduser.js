// Struktur data default sesuai kebutuhan modul IoT
const defaultDataStructure = {
    gauge1: 0,
    gauge2: 0,
    gauge3: 0,
    gauge4: 0,
    hlevel1: 0,
    hlevel2: 0,
    indicator1: "--",
    indicator2: "--",
    indicator3: "--",
    display1: "", // <--- TAMBAHKAN INI (Default teks kosong)
    display2: "", // <--- TAMBAHKAN INI (Default teks kosong)
    switch1: false,
    switch2: false,
    switch3: false,
    switch4: false,
    switch5: false
};

/**
 * Fungsi untuk memastikan user ada di Firebase.
 * Jika belum ada, akan dibuatkan struktur default.
 * @param {string} dbUrl - URL Firebase
 * @param {string} dbSecret - Token/Secret Firebase
 * @param {string} userId - ID User
 * @returns {Promise<boolean>} - True jika berhasil, throw error jika gagal
 */
async function ensureUserExists(dbUrl, dbSecret, userId) {
    const cleanUrl = dbUrl.replace(/\/+$/, ""); // Hapus semua slash di akhir
    
    // 1. Cek apakah user sudah ada
    const checkUrl = `${cleanUrl}/${userId}.json?auth=${dbSecret}`;
    const checkResponse = await fetch(checkUrl);
    
    if (!checkResponse.ok) {
        throw new Error("Gagal terhubung ke Firebase. Periksa URL dan Token.");
    }
    
    const existingData = await checkResponse.json();
    
    // 2. Jika belum ada (null), buat struktur baru
    if (existingData === null) {
        console.log(`User '${userId}' belum ada. Membuat struktur default...`);
        
        const createResponse = await fetch(checkUrl, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(defaultDataStructure)
        });
        
        if (!createResponse.ok) {
            throw new Error("Gagal membuat struktur data di Firebase.");
        }
        console.log("Struktur default berhasil dibuat.");
    } else {
        console.log(`User '${userId}' sudah ada. Langsung diproses.`);
    }
    
    return true;
}
