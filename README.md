# CCMS — Church Community Management System

Sistem Manajemen Komunitas Gereja terpusat berbasis Cloudflare Pages + Worker (API Gateway), Google Apps Script (Backend), dan Google Sheets & Drive (Database & Storage).

---

## 🚀 Status Proyek

| Tahap | Nama | Status |
|-------|------|--------|
| 1 | Foundations, Security, AuthN/AuthZ, Public Portal & Internal App | ✅ **SELESAI** |
| 2 | Operasional (Jemaat, Komisi, Pengumuman, Kegiatan) | ⏳ Dalam Rencana |
| 3 | Keuangan, AI & Go-Live | ⏳ Dalam Rencana |

> Tahap 1 sekaligus **Production Ready** dengan:
> - Login admin: `admin` / `Admin123!` (ganti password setelah first login)
> - Role: `SUPER_ADMIN` (23 permissions lengkap)
> - Public Portal + Internal App (siap deploy ke Cloudflare Pages)
> - API Gateway dengan **cache 60 detik untuk endpoint publik** + **keep-alive trigger** (mengurangi cold start 10-30 detik)

---

## 📁 Dokumentasi & Navigasi Repo

```text
ccms/
├── docs/
│   ├── requirements/
│   │   ├── CCMS_Master_Requirements_and_Project_Framework.md  # Dokumen Induk (Phase 1–7)
│   │   ├── ROADMAP_3_TAHAPAN.md                              # Roadmap Implementasi
│   │   ├── TAHAP1_IMPLEMENTASI_SELESAI.md                     # Ringkasan Tahap 1
│   │   └── USER_GUIDE_TAHAP1.md                               # Panduan Langkah demi Langkah
│   └── database/
│       └── DATA_DICTIONARY_TAHAP1.md                         # Data Dictionary Sheet Tahap 1
├── frontend/
│   ├── public/                                                # Static Web Portal Publik (Pages)
│   └── internal/                                              # Static Web Internal CCMS (Pages)
├── worker/                                                    # Cloudflare Worker API Gateway
│   ├── src/index.js
│   ├── wrangler.toml
│   └── package.json
├── backend/
│   └── apps-script/                                           # Google Apps Script Backend
│       ├── Code.gs
│       ├── Router.gs
│       ├── Auth.gs
│       ├── Db.gs
│       ├── Config.gs
│       ├── Users.gs
│       ├── PublicMenu.gs
│       ├── Public.gs
│       ├── Audit.gs
│       ├── tools/
│       │   ├── SetupDatabase.gs
│       │   └── KeepAlive.gs          # Keep-alive trigger (every 5 min)
│       └── appsscript.json
└── deployment/
    ├── cloudflare/README.md                                   # Panduan Deploy Cloudflare Pages & Worker
    └── google/README.md                                       # Panduan Deploy Apps Script & Setup Sheets
```

---

## 🧪 Cara Menjalankan & Verifikasi

### 1. Setup Database (sekali saja)
- Buka [Apps Script Editor](https://script.google.com) → Project **CCMS Backend (DEV)**
- Jalankan `setupDatabase()` → Log akan menampilkan spreadsheet ID dan password admin
- Jalankan `setupKeepAliveTrigger()` → Buat trigger tiap 5 menit

### 2. Deploy Frontend ke Cloudflare Pages
```bash
cd worker   # atau langsung via dashboard Cloudflare
npx wrangler pages deploy frontend/public --project-name=ccms-public
npx wrangler pages deploy frontend/internal --project-name=ccms-internal
```

### 3. Deploy Worker (API Gateway)
```bash
CLOUDFLARE_API_TOKEN="xxxxx" npx wrangler deploy
```

### 4. Verification Script
```bash
# Test public.info (cache HIT setelah request pertama)
python3 -c "
import urllib.request, json
url = 'https://ccms-api.ccms-gereja.workers.dev/api/'
data = json.dumps({'action': 'public.info'}).encode()
req = urllib.request.Request(url, data=data, headers={'Content-Type': 'application/json'})
r = urllib.request.urlopen(req, timeout=60)
print('Cache:', r.headers.get('X-CCMS-Cache'), '| Duration:', r.headers.get('CF-Cache-Status'))
print(json.loads(r.read().decode()).get('data', {}).get('church', {}).get('name'))
"
```

---

## 🔐 Credensial (Simpan Aman)

| Item | Nilai |
|------|-------|
| **Super Admin Username** | `admin` |
| **Super Admin Password** | `Admin123!` (ganti via `users.resetPassword`) |
| **API Gateway** | `https://ccms-api.ccms-gereja.workers.dev/api/` |
| **Spreadsheet** | Diakses via Script Properties (`CCMS_SPREADSHEET_ID`) |

---

## 📋 Work Packages Selesai

| WP | Nama | Status |
|----|------|--------|
| WP-01 | Project Foundation | ✅ |
| WP-02 | Backend Foundation | ✅ |
| WP-03 | Authentication & Authorization | ✅ |
| WP-04 | Database & System Configuration | ✅ |
| WP-05 | Public Portal | ✅ |
| WP-06 | Internal Dashboard | ✅ |

---

## 📊 Ringkasan Tahap 1

- **8 Sheet Database** selesai dikonfigurasi (USERS, ROLES, PERMISSIONS, USER_ROLES, CONFIG, PUBLIC_MENU, AUDIT_LOG, LOGIN_ATTEMPTS)
- **JWT HS256 authentication** dengan lockout 3x gagal → 5 menit
- **RBAC** dengan 6 role & 23 permissions
- **Cache API Gateway** 60 detik untuk endpoint publik
- **Keep-alive trigger** tiap 5 menit (mengurangi cold start)

---

Lihat [`docs/requirements/TAHAP1_IMPLEMENTASI_SELESAI.md`](docs/requirements/TAHAP1_IMPLEMENTASI_SELESAI.md) untuk detail teknis lengkap.