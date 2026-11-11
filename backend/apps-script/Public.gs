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

    // Tahap 1 menyediakan tujuh halaman publik dengan konten awal yang
    // dapat diisi Super Admin melalui CONFIG. Integrasi data dinamis untuk
    // pengumuman/kegiatan tetap mengikuti roadmap Tahap 2.
    var churchName = Config.get('CHURCH_NAME', 'Gereja');
    var data = { message: 'Informasi belum diatur. Silakan hubungi pengurus gereja.' };

    if (menuKey === 'home') {
      data = { message: 'Selamat datang di portal resmi ' + churchName + '. ' + Config.get('CHURCH_TAGLINE', '') };
    } else if (menuKey === 'profile') {
      data = {
        message: [
          Config.get('CHURCH_HISTORY', 'Profil dan sejarah gereja belum diatur.'),
          'Visi: ' + Config.get('CHURCH_VISION', 'Belum diatur.'),
          'Misi: ' + Config.get('CHURCH_MISSION', 'Belum diatur.')
        ].join('\n\n')
      };
    } else if (menuKey === 'schedule') {
      data = { message: Config.get('PUBLIC_WORSHIP_SCHEDULE', 'Jadwal ibadah belum diperbarui. Silakan hubungi gereja untuk informasi terbaru.') };
    } else if (menuKey === 'announcements') {
      data = { message: Config.get('PUBLIC_ANNOUNCEMENTS_INFO', 'Belum ada pengumuman publik yang ditampilkan.') };
    } else if (menuKey === 'events') {
      data = { message: Config.get('PUBLIC_EVENTS_INFO', 'Informasi kegiatan dan kalender akan diperbarui oleh gereja.') };
    } else if (menuKey === 'ministries') {
      data = { message: Config.get('PUBLIC_MINISTRY_INFO', 'Informasi komisi dan pelayanan belum diatur.') };
    } else if (menuKey === 'contact') {
      data = {
        message: [
          'Alamat: ' + Config.get('CHURCH_ADDRESS', 'Belum diatur.'),
          'Telepon: ' + Config.get('CHURCH_PHONE', 'Belum diatur.'),
          'Email: ' + Config.get('CHURCH_EMAIL', 'Belum diatur.'),
          'Jam layanan: ' + Config.get('PUBLIC_CONTACT_HOURS', 'Silakan hubungi gereja.')
        ].join('\n')
      };
    }

    return { status: 'OK', menu_key: menuKey, data: data };
  }

  return { info: info, page: page };
})();
