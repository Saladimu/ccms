/**
 * Keep Alive Trigger — jalankan setiap 5 menit via Apps Script Trigger.
 * Memanggil internal action (doPost) agar GAS instance tetap "warm",
 * menghindari cold start 10-30 detik setelah idle 10-30 menit.
 *
 * CARA PAKAI (sekali saja di Apps Script Editor):
 * 1. Buka Apps Script Editor → file `tools/KeepAlive.gs`
 * 2. Pilih fungsi `setupKeepAliveTrigger` → Run ▶
 * 3. Izinkan akses → Selesai. Trigger akan jalan otomatis tiap 5 menit.
 *
 * Fungsi ini HANYA dipanggil oleh trigger, tidak dari luar.
 * Di log akan terlihat: "Keep-alive OK: {status: 200, ok: true, ...}"
 */

/**
 * Setup trigger time-driven setiap 5 menit.
 * Jalankan SEKALI dari Editor: pilih fungsi `setupKeepAliveTrigger` → Run.
 */
function setupKeepAliveTrigger() {
  // Hapus trigger lama (jika ada) agar tidak duplikat
  var triggers = ScriptApp.getProjectTriggers();
  for (var i = 0; i < triggers.length; i++) {
    if (triggers[i].getHandlerFunction() === 'keepAlive') {
      ScriptApp.deleteTrigger(triggers[i]);
    }
  }

  // Buat trigger baru: time-driven, every 5 minutes
  ScriptApp.newTrigger('keepAlive')
    .timeBased()
    .everyMinutes(5)
    .create();

  Logger.log('Keep-alive trigger created: every 5 minutes');
}

/**
 * Hapus trigger keep-alive (untuk maintenance/debug).
 */
function deleteKeepAliveTrigger() {
  var triggers = ScriptApp.getProjectTriggers();
  for (var i = 0; i < triggers.length; i++) {
    if (triggers[i].getHandlerFunction() === 'keepAlive') {
      ScriptApp.deleteTrigger(triggers[i]);
      Logger.log('Keep-alive trigger deleted');
    }
  }
}

/**
 * Fungsi keep-alive — dipanggil oleh trigger tiap 5 menit.
 * Memanggil action `public.info` (ringan, tidak butuh auth, hanya baca 2 sheet).
 * Log akan menunjukkan "Keep-alive OK" atau error jika ada.
 */
function keepAlive() {
  try {
    // Panggil internal doPost dengan action public.info
    var ctx = {
      action: 'public.info',
      payload: {},
      token: '',
      ip: '127.0.0.1',
      userAgent: 'KeepAlive/1.0',
    };

    var result = Router.resolve(ctx.action);
    if (result.needsSession) {
      // public.info tidak butuh session
    }
    var data = result.handler(ctx);

    Logger.log('Keep-alive OK: ' + JSON.stringify({ status: 200, ok: true, data: !!data }));
  } catch (e) {
    Logger.log('Keep-alive ERROR: ' + e.message);
  }
}