/**
 * Public — endpoint publik (tanpa login).
 * Hanya data yang memang diperuntukkan publik yang keluar dari sini.
 */

var Public = (function () {

  /** public.info — identitas gereja + daftar menu publik yang ON (tanpa rahasia). */
  function info(ctx) {
    var menus = Db.readAll('PUBLIC_MENU');
    var onMenus = menus
      .filter(function (m) { return m.status === 'ON'; })
      .sort(function (a, b) { return (a.sort_order || 0) - (b.sort_order || 0); });

    return {
      church: {
        name: Config.get('CHURCH_NAME', ''),
        tagline: Config.get('CHURCH_TAGLINE', ''),
        address: Config.get('CHURCH_ADDRESS', ''),
        phone: Config.get('CHURCH_PHONE', ''),
        email: Config.get('CHURCH_EMAIL', ''),
        logoUrl: Config.get('CHURCH_LOGO_URL', ''),
      },
      theme: {
        name: Config.get('THEME_PUBLIC', 'CLASSIC'),
        darkMode: Config.getBool('PUBLIC_DARK_MODE', false),
      },
      maintenanceMessage: Config.get('MAINTENANCE_MESSAGE', ''),
      menus: onMenus.map(function (m) {
        return { key: m.menu_key, label: m.menu_label, path: m.url_path, sort: m.sort_order };
      }),
    };
  }

  /** public.page — konten halaman publik berdasarkan menu_key. */
  function page(ctx) {
    var menuKey = String(ctx.payload.menu_key || '').trim();
    if (!menuKey) throw new AppError('VALIDATION', 'menu_key wajib diisi', 400);

    var menus = Db.readAll('PUBLIC_MENU');
    var menu = null;
    menus.forEach(function (m) { if (m.menu_key === menuKey) menu = m; });
    if (!menu) throw new AppError('NOT_FOUND', 'Menu tidak ditemukan', 404);

    if (menu.status === 'OFF_MAINTENANCE') {
      return {
        status: 'MAINTENANCE',
        message: Config.get('MAINTENANCE_MESSAGE', 'Halaman sedang dalam pemeliharaan.'),
      };
    }
    if (menu.status !== 'ON') {
      // Jangan bocorkan keberadaan konten; perlakukan seperti tidak ada.
      throw new AppError('NOT_FOUND', 'Halaman tidak ditemukan', 404);
    }

    // Placeholder konten per menu. Tahap 2 mengisi KEGIATAN/PENGUMUMAN/KEGIATAN;
    // jadwal ibadah (menu 'schedule') dan konten kegiatan memakai sheet Tahap 2.
    var data = null;
    if (menuKey === 'schedule') {
      data = { message: 'Jadwal ibadah akan tersedia setelah modul kegiatan berjalan (Tahap 2).' };
    } else if (menuKey === 'announcements') {
      data = { items: [], message: 'Pengumuman akan tersedia pada Tahap 2.' };
    } else if (menuKey === 'events') {
      data = { items: [], message: 'Kegiatan akan tersedia pada Tahap 2.' };
    }

    return { status: 'OK', menu_key: menuKey, data: data };
  }

  return { info: info, page: page };
})();
