# CCMS — Church Community Management System

Sistem Manajemen Komunitas Gereja terpusat berbasis Cloudflare Pages + Worker (API Gateway), Google Apps Script (Backend), dan Google Sheets & Drive (Database & Storage).

---

## 🚀 Status Proyek & URL Live

| Tahap | Nama | Status |
|-------|------|--------|
| 1 | Foundations, Security, AuthN/AuthZ, Public Portal & Internal App | ✅ **SELESAI & LIVE** |
| 2 | Operasional (Jemaat, Komisi, Pengumuman, Kegiatan) | ⏳ Dalam Rencana |
| 3 | Keuangan, AI & Go-Live | ⏳ Dalam Rencana |

### 🌐 URL Resmi Production (Tahap 1)

| Layanan | URL | Akses |
|---------|-----|-------|
| **Public Portal** | `https://ccms-public.pages.dev` | Publik (tanpa login) |
| **Internal App** | `https://ccms-internal.pages.dev` | Admin / Pengurus |
| **API Gateway** | `https://ccms-api.ccms-gereja.workers.dev/api/` | REST API |
| **Google Spreadsheet** | Diakses via Script Properties (`CCMS_SPREADSHEET_ID`) | Database |

*(Deployment Hash URLs: Public `https://4d40e962.ccms-public.pages.dev`, Internal `https://d77ae448.ccms-internal.pages.dev`)*

---

## ⚡ Optimasi Performa Terpasang (Priority 1)

1. **Keep-Alive Trigger (GAS):** Trigger time-driven setiap 5 menit (`tools/KeepAlive.gs`) menjaga instance Apps Script tetap warm — **mengeliminasi cold start 10–30 detik**.
2. **Worker Edge Cache (60s):** Action publik (`public.info`, `public.page`) di-cache di Cloudflare Edge selama 60 detik — **repeat page load <300ms** (tidak menembus ke Google Sheets berulang).
3. **Cache-Control Header:** Response publik menyertakan header `public, max-age=60` sehingga browser user meng-cache response.
4. **Browser Preconnect:** Tag `<link rel="preconnect">` dan `dns-prefetch` pada `index.html` menghemat 100–300ms TLS handshake saat fetch pertama.

---

## 📁 Dokumentasi & Navigasi Repo

```text
ccms/
├── docs/
│   ├── requirements/
│   │   ├── CCMS_Master_Requirements_and_Project_Framework.md  # Dokumen Induk (Phase 1–7)
│   │   ├── ROADMAP_3_TAHAPAN.md                              # Roadmap Implementasi
│   │   ├── TAHAP1_IMPLEMENTASI_SELESAI.md                     # Ringkasan Teknis Tahap 1
│   │   └── USER_GUIDE_TAHAP1.md                               # Panduan Langkah demi Langkah
│   └── database/
│       └── DATA_DICTIONARY_TAHAP1.md                         # Data Dictionary Sheet Tahap 1
├── frontend/
│   ├── public/index.html                                     # Static Web Portal Publik (Pages)
│   └── internal/index.html                                   # Static Web Internal CCMS (Pages)
├── worker/                                                    # Cloudflare Worker API Gateway
│   ├── src/index.js                                           # Routing, CORS, Timeout 55s, Cache 60s
│   ├── wrangler.toml                                          # Config GAS_URL & ALLOWED_ORIGINS
│   └── package.json
├── backend/
│   └── apps-script/                                           # Google Apps Script Backend
│       ├── Code.gs                                            # Entry point & error handling
│       ├── Router.gs                                          # Lazy route mapping
│       ├── Auth.gs                                            # JWT HS256, SHA-256 hash, Lockout 3x->5m
│       ├── Db.gs                                              # Sheet CRUD dengan merge update & LockService
│       ├── Config.gs                                          # Cache config
│       ├── Users.gs                                           # User CRUD & soft-delete revokeRole
│       ├── PublicMenu.gs                                      # Public menu status management
│       ├── Public.gs                                          # Public endpoints
│       ├── Audit.gs                                           # Append-only audit log
│       ├── tools/
│       │   ├── SetupDatabase.gs                               # Automated sheet & seed generator
│       │   ├── KeepAlive.gs                                   # 5-min warm trigger
│       │   └── FixScripts.gs                                  # Maintenance (recreateAdmin, verifyAllSheets)
│       └── appsscript.json
└── deployment/
    ├── cloudflare/README.md                                   # Panduan Deploy Cloudflare Pages & Worker
    └── google/README.md                                       # Panduan Deploy Apps Script & Setup Sheets
```

---

## 🔐 Kredensial & Autentikasi (Tahap 1)

| Field | Nilai Default | Catatan |
|-------|---------------|---------|
| **Username** | `admin` | Lowercase |
| **Password** | `Admin123!` | Wajib diubah via `users.resetPassword` setelah first login |
| **Role** | `SUPER_ADMIN` | Memiliki 23 permissions lengkap |
| **Hashing** | SHA-256 iterated (50.000x) + salt 16 bytes | Diolah di `Auth.gs` |
| **Lockout** | 3 kali gagal berturut-turut → blokir 5 menit | Ditegakkan di backend |

---

## 🛠️ Pemeliharaan & Debugging Backend (Apps Script)

Di Apps Script Editor, tersedia fungsi utilitas di `tools/FixScripts.gs`:

- **`verifyAllSheets()`** — Verifikasi integritas 8 sheet, jumlah baris, admin user, dan role assignment.
- **`recreateAdminClean()`** — Reset ulang akun `admin` dengan password `Admin123!` dan role `SUPER_ADMIN`.
- **`fixAdminRole()`** — Menambahkan role `SUPER_ADMIN` ke user `admin` jika terlepas.
- **`setupKeepAliveTrigger()`** — Mendaftarkan trigger 5 menit untuk menjaga backend tetap warm.

---

## 🧪 Cara Menjalankan & Verifikasi API

```bash
# 1. Test Public Info (Response cacing Cache MISS / HIT)
python3 -c "
import urllib.request, json
url = 'https://ccms-api.ccms-gereja.workers.dev/api/'
data = json.dumps({'action': 'public.info'}).encode()
req = urllib.request.Request(url, data=data, headers={'Content-Type': 'application/json', 'User-Agent': 'Mozilla/5.0'})
r = urllib.request.urlopen(req, timeout=30)
print('Cache:', r.headers.get('X-CCMS-Cache'), '| Status:', r.status)
print(json.loads(r.read().decode()).get('data', {}).get('church', {}).get('name'))
"

# 2. Test Login
python3 -c "
import urllib.request, json
url = 'https://ccms-api.ccms-gereja.workers.dev/api/'
data = json.dumps({'action': 'auth.login', 'payload': {'username': 'admin', 'password': 'Admin123!'}}).encode()
req = urllib.request.Request(url, data=data, headers={'Content-Type': 'application/json', 'User-Agent': 'Mozilla/5.0'})
r = urllib.request.urlopen(req, timeout=60)
print(r.read().decode())
"
```

---

## 📋 Work Packages Tahap 1 Selesai

- [x] **WP-01 Project Foundation** (Repo, environment DEV/STAGING/PROD, Cloudflare, clasp)
- [x] **WP-02 Backend Foundation** (API Gateway, standard response, error handling)
- [x] **WP-03 Authentication & Authorization** (JWT, PBKDF2 hashing, Lockout 3x→5m, RBAC 23 perms)
- [x] **WP-04 Database & System Configuration** (8 sheet awal, config cache, theme tokens)
- [x] **WP-05 Public Portal** (Public info API, dynamic menu status ON/OFF/Maintenance)
- [x] **WP-06 Internal Dashboard** (Skeleton app, token session storage, role-based UI)

---

Lihat rincian teknis lengkap di [`docs/requirements/TAHAP1_IMPLEMENTASI_SELESAI.md`](docs/requirements/TAHAP1_IMPLEMENTASI_SELESAI.md).
