# Panduan Menjalankan Aplikasi Mobile LOOM (untuk pengujian)

Dokumen ini adalah panduan langkah demi langkah untuk menjalankan aplikasi mobile LOOM dari nol. Aplikasi ini dibangun dengan **React Native Expo** dan membutuhkan pengaturan akses perangkat keras asli (Bluetooth/BLE), sehingga tidak bisa dijalankan menggunakan aplikasi Expo Go biasa.

---

## 1. Prasyarat (Yang Harus Diinstal)

Sebelum mulai ngoding, pastikan komputer/laptop Anda sudah memiliki:

1. **Node.js** (Versi LTS disarankan).
2. **Android Studio** (Wajib diinstal karena kita butuh Android SDK dan Java bawaannya).
3. Kabel USB yang mendukung transfer data (Type-C / Micro USB).
4. HP Android Fisik.

---

## 2. Mengatur Variabel Sistem (Penting untuk Windows)

Agar laptop Anda bisa membuat (_compile_) aplikasi Bluetooth ini, Anda harus mendaftarkan Java dan Android SDK ke sistem Windows Anda.

### A. Daftarkan `JAVA_HOME`

1. Buka File Explorer, cari folder **jbr** di tempat Anda menginstal Android Studio (biasanya: `C:\\Program Files\\Android\\Android Studio\\jbr`). Copy jalur (path) foldernya.
2. Tekan tombol Windows, ketik **Environment Variables**, dan pilih **Edit the system environment variables**.
3. Klik tombol **Environment Variables**.
4. Di kotak atas (_User variables_), klik **New**:
   - Variable name: `JAVA_HOME`
   - Variable value: _(Paste jalur folder jbr tadi)_
5. Di kotak atas, cari variabel bernama **Path**, klik **Edit** -> **New**, lalu ketikkan: `%JAVA_HOME%\\bin`

### B. Daftarkan `ANDROID_HOME`

1. Cari folder SDK Android Anda (biasanya tersembunyi di: `C:\\Users\\<NamaUserAnda>\\AppData\\Local\\Android\\Sdk`). Copy jalurnya.
2. Kembali ke menu Environment Variables, buat **New** lagi di kotak atas:
   - Variable name: `ANDROID_HOME`
   - Variable value: _(Paste jalur folder Sdk tadi)_
3. Di variabel **Path**, tambahkan dua baris baru ini:
   - `%ANDROID_HOME%\\platform-tools`
   - `%ANDROID_HOME%\\emulator`
4. **TUTUP SEMUA TERMINAL / VS CODE ANDA** lalu buka kembali agar sistem ter-refresh.

---

## 3. Instalasi Pustaka (Dependencies)

1. Buka terminal Anda dan arahkan ke folder aplikasi mobile:
   ```bash
   cd apps/mobile
   ```
2. Instal semua pustaka (Wajib menggunakan flag legacy untuk menghindari bentrok versi React):
   ```Bash
   npm install --legacy-peer-deps
   ```

## 4. Persiapan HP Android Anda

1. Buka Pengaturan (Settings) -> Tentang Ponsel (About Phone).
2. Ketuk Build Number 7 kali dengan cepat sampai mode pengembang aktif.
3. Kembali ke Pengaturan, cari Opsi Pengembang (Developer Options).
4. Aktifkan USB Debugging.
5. Colokkan HP ke laptop menggunakan kabel USB.
6. Buka kunci layar HP Anda. Jika muncul peringatan "Allow USB debugging?", centang "Always allow from this computer" lalu tekan OK / Izinkan.
7. (Opsional) Untuk mengecek apakah HP sudah terbaca, ketik adb devices di terminal. Jika ada ID HP dan tulisan device, berarti siap.

## 5. Menjalankan Aplikasi (Build Pertama Kali)

Karena ada modul Bluetooth, Anda wajib membuat kerangka aplikasinya langsung ke HP Anda. Proses ini butuh internet dan memakan waktu sekitar 2-5 menit.

Pastikan posisi terminal berada di apps/mobile, lalu jalankan:

```Bash
npx expo run:android
```

Tunggu hingga 100% dan muncul tulisan BUILD SUCCESSFUL. Aplikasi akan otomatis terbuka di layar HP Anda.

## 6. Pengembangan Harian (Fast Refresh)

Kabar baiknya, Anda TIDAK PERLU lagi menunggu lama seperti langkah 5 untuk hari-hari berikutnya!

Selama Anda tidak menginstal pustaka perangkat keras (native) baru, setiap kali Anda mau ngoding, cukup jalankan:

```Bash
npx expo start
```

Buka aplikasi LOOM di HP Anda, dan setiap kali Anda menekan Ctrl + S (Save) pada file kode .tsx, layar HP Anda akan berubah secara instan!

## 7. Solusi Masalah Umum (Troubleshooting)

- Error ERESOLVE / Conflicting peer dependency saat npm install: Selalu gunakan tambahan --legacy-peer-deps.

- adb is not recognized: Anda lupa memasukkan platform-tools ke Path (Lihat Langkah 2B).

- SDK location not found: ANDROID_HOME belum diatur dengan benar.

- Device offline: Cabut kabel USB, matikan lalu nyalakan lagi USB Debugging di HP, lalu colok kembali dan perhatikan layar HP untuk mengizinkan pop-up.

- Aplikasi tertutup/crash saat scan Bluetooth: Pastikan Anda mengizinkan akses Lokasi dan Perangkat Sekitar pada aplikasi di pengaturan HP Anda.
