# CCMS — Church Community Management System

Sistem Manajemen Komunitas Gereja terpusat berbasis Cloudflare Pages + Worker (API Gateway), Google Apps Script (Backend), dan Google Sheets & Drive (Database & Storage).

---

## Dokumentasi & Navigasi Repo

```text
ccms/
├── docs/
│   ├── requirements/
│   │   ├── CCMS_Master_Requirements_and_Project_Framework.md  # Dokumen Induk (Phase 1–7)
│   │   └── ROADMAP_3_TAHAPAN.md                              # Roadmap Implementasi & Pemetaan Issue
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
│       ├── tools/SetupDatabase.gs
│       └── appsscript.json
└── deployment/
    ├── cloudflare/README.md                                   # Panduan Deploy Cloudflare Pages & Worker
    └── google/README.md                                       # Panduan Deploy Apps Script & Setup Sheets
```

---

## Status Proyek

- **Tahap 1:** Foundations, Security, AuthN/AuthZ, Public Portal & Skeleton Dashboard (In Progress).
- **Tahap 2:** Operasional (Jemaat, Komisi, Pengumuman, Kegiatan).
- **Tahap 3:** Keuangan, AI & Go-Live.

Lihat [`docs/requirements/ROADMAP_3_TAHAPAN.md`](docs/requirements/ROADMAP_3_TAHAPAN.md) untuk detail entry/exit criteria dan status tiap Work Package.

---

## Cara Menjalankan & Deploy

1. **Backend Google Apps Script:** Lihat [`deployment/google/README.md`](deployment/google/README.md).
2. **API Gateway Worker:** Lihat [`deployment/cloudflare/README.md`](deployment/cloudflare/README.md).
3. **Frontend:** Deployed via Cloudflare Pages (folder `frontend/public` dan `frontend/internal`).
