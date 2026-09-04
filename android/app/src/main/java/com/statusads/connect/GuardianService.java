package com.statusads.connect;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.bluetooth.BluetoothAdapter;
import android.bluetooth.BluetoothManager;
import android.bluetooth.le.ScanCallback;
import android.bluetooth.le.ScanResult;
import android.bluetooth.le.ScanSettings;
import android.content.BroadcastReceiver;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.content.SharedPreferences;
import android.content.pm.PackageManager;
import android.content.pm.ServiceInfo;
import android.hardware.Sensor;
import android.hardware.SensorEvent;
import android.hardware.SensorEventListener;
import android.hardware.SensorManager;
import android.net.Uri;
import android.os.Build;
import android.os.Handler;
import android.os.IBinder;
import android.os.Looper;
import android.os.PowerManager;
import android.os.SystemClock;
import android.os.VibrationEffect;
import android.os.Vibrator;
import android.os.VibratorManager;

import org.json.JSONArray;
import org.json.JSONObject;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.HashMap;
import java.util.Iterator;
import java.util.Map;

/**
 * GuardianService — a sentinela 24/7 do Modo Guardião (v3.8.0).
 *
 * Serviço foreground que mantém a protecção VIVA mesmo com a app fechada
 * (deslizada dos recentes) e depois de reiniciar o telemóvel:
 *
 *  · Notificação discreta "Protecção activa" (canal silencioso, baixa prioridade)
 *  · Botão Power ×4 com o ecrã apagado  → dispara SOS (detector movido do
 *    PanicPlugin para cá: um único detector, activo 24/7)
 *  · Agitação forte ×3 (acelerómetro via sensor LINEAR_ACCELERATION) → dispara
 *    SOS mesmo com o WebView morto
 *
 * Ao disparar com a app fechada:
 *  · Ecrã ligado  → abre a MainActivity (deep link com.statusads.connect://sos?t=…)
 *  · Ecrã apagado → notificação FULL-SCREEN INTENT (padrão de alarme — acorda
 *    e mostra por cima do ecrã de bloqueio) + vibração curta
 *
 * O estado "armed" é lido de SharedPreferences (espelhado pelo PanicPlugin
 * a partir do WebView), por isso os gatilhos nativos nunca dependem do JS.
 */
public class GuardianService extends Service implements SensorEventListener {

    private static final String PREFS = "guardian_prefs";
    private static final String CH_STATUS = "guardian_status";
    private static final String CH_ALERT = "guardian_alert";
    private static final int NOTIF_STATUS = 4001;
    private static final int NOTIF_ALERT = 4002;

    // Power ×4 (idêntico ao antigo detector do PanicPlugin)
    private static final int REQUIRED_EVENTS = 4;
    private static final long POWER_WINDOW_MS = 6000;
    private static final int MAX_EVENTS = 16;

    // Agitação ×3 (idêntico a src/lib/shake.ts)
    private static final float SPIKE_THRESHOLD = 26f;   // m/s²
    private static final long SPIKE_WINDOW_MS = 2500;
    private static final int REQUIRED_SPIKES = 3;
    private static final long SHAKE_COOLDOWN_MS = 120_000;

    // Registo de testemunhas (scan BLE periódico enquanto armado)
    private static final long WITNESS_SCAN_INTERVAL_MS = 45_000; // janela a cada 45s
    private static final long WITNESS_SCAN_WINDOW_MS = 4_000;    // scan de 4s
    private static final long WITNESS_TTL_MS = 3 * 60 * 60 * 1000L; // memória de 3h
    private static final int WITNESS_MAX_ENTRIES = 150;

    private SharedPreferences prefs;
    private BroadcastReceiver powerReceiver;
    private SensorManager sensorManager;
    private boolean sensorActive = false;

    private final long[] powerEvents = new long[MAX_EVENTS];
    private int powerEventCount = 0;

    private final long[] spikes = new long[REQUIRED_SPIKES];
    private int spikeCount = 0;
    private long shakeCooldownUntil = 0L;

    // testemunhas
    private Handler witnessHandler;
    private BluetoothAdapter bluetoothAdapter;
    private boolean scanningNow = false;
    private final HashMap<String, WitnessDevice> witnessLog = new HashMap<>();

    /** Dispositivo BLE visto perto do utilizador (MAC só em hash). */
    private static class WitnessDevice {
        String name;       // nome anunciado ou null
        int bestRssi;
        long firstSeen;
        long lastSeen;
        int hits;
    }

    @Override
    public void onCreate() {
        super.onCreate();
        prefs = getSharedPreferences(PREFS, Context.MODE_PRIVATE);
        createChannels();
        startForegroundCompat();
        registerPowerReceiver();
        startShakeSensor();
        loadWitnessLog();
        witnessHandler = new Handler(Looper.getMainLooper());
        witnessHandler.postDelayed(witnessScanRunnable, 5_000);
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        // Re-verificação (serviço pode ser re-arrancado pelo sistema): refresca
        // a notificação e religa/desliga os detectores conforme o estado actual.
        if (!prefs.getBoolean("armed", false)) {
            stopSelf();
            return START_NOT_STICKY;
        }
        startForegroundCompat();
        registerPowerReceiver();
        startShakeSensor();
        // START_STICKY: se o sistema matar a sentinela, ela volta a nascer.
        return START_STICKY;
    }

    @Override
    public void onDestroy() {
        if (powerReceiver != null) {
            try {
                unregisterReceiver(powerReceiver);
            } catch (Exception ignored) {
            }
            powerReceiver = null;
        }
        stopShakeSensor();
        stopWitnessScanner();
        super.onDestroy();
    }

    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }

    // ── Detectores ───────────────────────────────────────────────────────────

    private void registerPowerReceiver() {
        if (powerReceiver != null) return; // já activo
        powerReceiver = new BroadcastReceiver() {
            @Override
            public void onReceive(Context context, Intent intent) {
                String action = intent.getAction();
                if (Intent.ACTION_SCREEN_ON.equals(action) || Intent.ACTION_SCREEN_OFF.equals(action)) {
                    registerPowerEvent();
                }
            }
        };
        IntentFilter filter = new IntentFilter();
        filter.addAction(Intent.ACTION_SCREEN_ON);
        filter.addAction(Intent.ACTION_SCREEN_OFF);
        try {
            registerReceiver(powerReceiver, filter);
        } catch (Exception e) {
            android.util.Log.w("GuardianService", "receiver power: " + e.getMessage());
        }
    }

    private synchronized void registerPowerEvent() {
        long now = SystemClock.elapsedRealtime();

        if (powerEventCount >= MAX_EVENTS) {
            System.arraycopy(powerEvents, 1, powerEvents, 0, MAX_EVENTS - 1);
            powerEventCount = MAX_EVENTS - 1;
        }
        powerEvents[powerEventCount++] = now;

        int start = 0;
        while (start < powerEventCount && now - powerEvents[start] > POWER_WINDOW_MS) start++;
        if (start > 0) {
            System.arraycopy(powerEvents, start, powerEvents, 0, powerEventCount - start);
            powerEventCount -= start;
        }

        if (powerEventCount >= REQUIRED_EVENTS) {
            powerEventCount = 0;
            triggerPanic("power");
        }
    }

    private void startShakeSensor() {
        if (sensorActive) return;
        if (!prefs.getBoolean("shake_enabled", true)) return;
        try {
            sensorManager = (SensorManager) getSystemService(Context.SENSOR_SERVICE);
            if (sensorManager == null) return;
            Sensor s = sensorManager.getDefaultSensor(Sensor.TYPE_LINEAR_ACCELERATION);
            if (s == null) s = sensorManager.getDefaultSensor(Sensor.TYPE_ACCELEROMETER);
            if (s == null) return;
            sensorActive = sensorManager.registerListener(this, s, SensorManager.SENSOR_DELAY_GAME);
        } catch (Exception e) {
            android.util.Log.w("GuardianService", "sensor: " + e.getMessage());
        }
    }

    private void stopShakeSensor() {
        if (sensorManager != null) {
            try {
                sensorManager.unregisterListener(this);
            } catch (Exception ignored) {
            }
        }
        sensorActive = false;
    }

    @Override
    public void onSensorChanged(SensorEvent event) {
        if (event == null || event.values == null || event.values.length < 3) return;
        long now = SystemClock.elapsedRealtime();
        if (now < shakeCooldownUntil) return;

        float x = event.values[0];
        float y = event.values[1];
        float z = event.values[2];
        float mag = (float) Math.sqrt(x * x + y * y + z * z);

        if (mag > SPIKE_THRESHOLD) {
            // janela deslizante de picos
            if (spikeCount >= REQUIRED_SPIKES) {
                System.arraycopy(spikes, 1, spikes, 0, REQUIRED_SPIKES - 1);
                spikeCount = REQUIRED_SPIKES - 1;
            }
            spikes[spikeCount++] = now;
            int alive = 0;
            for (int i = 0; i < spikeCount; i++) {
                if (now - spikes[i] <= SPIKE_WINDOW_MS) spikes[alive++] = spikes[i];
            }
            spikeCount = alive;

            if (spikeCount >= REQUIRED_SPIKES) {
                spikeCount = 0;
                shakeCooldownUntil = now + SHAKE_COOLDOWN_MS;
                triggerPanic("shake");
            }
        }
    }

    @Override
    public void onAccuracyChanged(Sensor sensor, int accuracy) {
    }

    // ── Registo de testemunhas (scan BLE 24/7 enquanto armado) ───────────────
    // A cada 45s abre uma janela de scan de 4s. Cada dispositivo: MAC em hash
    // (privacidade), nome anunciado, RSSI máximo, 1.ª/últ. vez, nº de vezes visto.
    // Guardado em prefs para o JS ler (e para sobreviver ao processo). No pânico,
    // o log é congelado em "witness_snapshot" para acompanhar o incidente.

    private final Runnable witnessScanRunnable = new Runnable() {
        @Override
        public void run() {
            startWitnessWindow();
            witnessHandler.postDelayed(this, WITNESS_SCAN_INTERVAL_MS);
        }
    };

    private final ScanCallback witnessScanCallback = new ScanCallback() {
        @Override
        public void onScanResult(int callbackType, ScanResult result) {
            try {
                if (result == null || result.getDevice() == null) return;
                String mac = result.getDevice().getAddress();
                if (mac == null || mac.isEmpty()) return;
                String hash = sha12(mac);

                String name = null;
                try {
                    name = result.getDevice().getName();
                } catch (SecurityException se) {
                    // BLUETOOTH_CONNECT ainda não concedido — segue com o nome do anúncio
                }
                if (name == null && result.getScanRecord() != null) {
                    name = result.getScanRecord().getDeviceName();
                }
                int rssi = result.getRssi();

                WitnessDevice d = witnessLog.get(hash);
                if (d == null) {
                    d = new WitnessDevice();
                    d.firstSeen = System.currentTimeMillis();
                    d.hits = 0;
                    d.bestRssi = -127;
                    witnessLog.put(hash, d);
                }
                if (name != null && !name.isEmpty()) d.name = name;
                if (rssi > d.bestRssi) d.bestRssi = rssi;
                d.lastSeen = System.currentTimeMillis();
                d.hits++;
            } catch (Exception ignored) {
            }
        }

        @Override
        public void onScanFailed(int errorCode) {
            scanningNow = false;
        }
    };

    private void startWitnessWindow() {
        if (!prefs.getBoolean("witness_enabled", true)) return;
        if (!prefs.getBoolean("armed", false)) return;
        if (scanningNow) return;

        // permissões runtime (Android 12+: SCAN/CONNECT; <12: FINE_LOCATION)
        boolean hasPerm;
        if (Build.VERSION.SDK_INT >= 31) {
            hasPerm = checkSelfPermission(android.Manifest.permission.BLUETOOTH_SCAN) == PackageManager.PERMISSION_GRANTED
                    && checkSelfPermission(android.Manifest.permission.BLUETOOTH_CONNECT) == PackageManager.PERMISSION_GRANTED;
        } else {
            hasPerm = checkSelfPermission(android.Manifest.permission.ACCESS_FINE_LOCATION) == PackageManager.PERMISSION_GRANTED;
        }
        if (!hasPerm) return;

        try {
            if (bluetoothAdapter == null) {
                BluetoothManager bm = (BluetoothManager) getSystemService(Context.BLUETOOTH_SERVICE);
                if (bm == null) return;
                bluetoothAdapter = bm.getAdapter();
            }
            if (bluetoothAdapter == null || !bluetoothAdapter.isEnabled()) return;
            if (bluetoothAdapter.getBluetoothLeScanner() == null) return;

            ScanSettings settings = new ScanSettings.Builder()
                    .setScanMode(ScanSettings.SCAN_MODE_BALANCED)
                    .build();
            bluetoothAdapter.getBluetoothLeScanner().startScan(null, settings, witnessScanCallback);
            scanningNow = true;

            witnessHandler.postDelayed(() -> {
                try {
                    if (bluetoothAdapter != null && bluetoothAdapter.getBluetoothLeScanner() != null) {
                        bluetoothAdapter.getBluetoothLeScanner().stopScan(witnessScanCallback);
                    }
                } catch (Exception ignored) {
                }
                scanningNow = false;
                pruneWitnessLog();
                persistWitnessLog();
            }, WITNESS_SCAN_WINDOW_MS);
        } catch (SecurityException se) {
            scanningNow = false;
        } catch (Exception e) {
            scanningNow = false;
            android.util.Log.w("GuardianService", "scan testemunhas: " + e.getMessage());
        }
    }

    private void stopWitnessScanner() {
        if (witnessHandler != null) {
            witnessHandler.removeCallbacksAndMessages(null);
        }
        if (scanningNow && bluetoothAdapter != null) {
            try {
                bluetoothAdapter.getBluetoothLeScanner().stopScan(witnessScanCallback);
            } catch (Exception ignored) {
            }
        }
        scanningNow = false;
    }

    private void pruneWitnessLog() {
        long cutoff = System.currentTimeMillis() - WITNESS_TTL_MS;
        Iterator<Map.Entry<String, WitnessDevice>> it = witnessLog.entrySet().iterator();
        while (it.hasNext()) {
            WitnessDevice d = it.next().getValue();
            if (d.lastSeen < cutoff) it.remove();
        }
        // cap duro (mais antigos primeiro)
        while (witnessLog.size() > WITNESS_MAX_ENTRIES) {
            String oldest = null;
            long oldestT = Long.MAX_VALUE;
            for (Map.Entry<String, WitnessDevice> e : witnessLog.entrySet()) {
                if (e.getValue().lastSeen < oldestT) {
                    oldestT = e.getValue().lastSeen;
                    oldest = e.getKey();
                }
            }
            if (oldest == null) break;
            witnessLog.remove(oldest);
        }
    }

    private void loadWitnessLog() {
        try {
            String raw = prefs.getString("witness_log", null);
            if (raw == null) return;
            JSONArray arr = new JSONArray(raw);
            for (int i = 0; i < arr.length(); i++) {
                JSONObject o = arr.getJSONObject(i);
                WitnessDevice d = new WitnessDevice();
                d.name = o.has("n") && !o.isNull("n") ? o.getString("n") : null;
                d.bestRssi = o.optInt("r", -127);
                d.firstSeen = o.optLong("f", 0L);
                d.lastSeen = o.optLong("s", 0L);
                d.hits = o.optInt("c", 0);
                witnessLog.put(o.getString("h"), d);
            }
            pruneWitnessLog();
        } catch (Exception ignored) {
        }
    }

    private void persistWitnessLog() {
        try {
            JSONArray arr = new JSONArray();
            for (Map.Entry<String, WitnessDevice> e : witnessLog.entrySet()) {
                WitnessDevice d = e.getValue();
                JSONObject o = new JSONObject();
                o.put("h", e.getKey());
                if (d.name != null) o.put("n", d.name);
                o.put("r", d.bestRssi);
                o.put("f", d.firstSeen);
                o.put("s", d.lastSeen);
                o.put("c", d.hits);
                arr.put(o);
            }
            prefs.edit().putString("witness_log", arr.toString()).apply();
        } catch (Exception ignored) {
        }
    }

    /** Congela o estado actual do log para acompanhar o SOS (lido pelo WebView). */
    private void snapshotWitnessLog() {
        try {
            pruneWitnessLog();
            persistWitnessLog();
            JSONObject snap = new JSONObject();
            snap.put("capturedAt", System.currentTimeMillis());
            JSONArray arr = new JSONArray();
            for (Map.Entry<String, WitnessDevice> e : witnessLog.entrySet()) {
                WitnessDevice d = e.getValue();
                JSONObject o = new JSONObject();
                o.put("h", e.getKey());
                if (d.name != null) o.put("n", d.name);
                o.put("r", d.bestRssi);
                o.put("s", d.lastSeen);
                o.put("c", d.hits);
                arr.put(o);
            }
            snap.put("devices", arr);
            prefs.edit().putString("witness_snapshot", snap.toString()).apply();
        } catch (Exception ignored) {
        }
    }

    private String sha12(String mac) {
        try {
            MessageDigest md = MessageDigest.getInstance("SHA-256");
            byte[] digest = md.digest(mac.getBytes(StandardCharsets.UTF_8));
            StringBuilder sb = new StringBuilder();
            for (int i = 0; i < 6; i++) sb.append(String.format("%02x", digest[i]));
            return sb.toString();
        } catch (Exception e) {
            return mac.replaceAll(":", ""); // fallback improvável
        }
    }

    // ── Disparo ──────────────────────────────────────────────────────────────

    private void triggerPanic(String source) {
        if (!prefs.getBoolean("armed", false)) return;
        vibrateShort();
        // Congela o registo de testemunhas ANTES do SOS sair — esta lista é a
        // “quem estava perto” que ajuda a identificar testemunhas do incidente.
        snapshotWitnessLog();

        Uri uri = Uri.parse("com.statusads.connect://sos?t=" + source);
        Intent sos = new Intent(Intent.ACTION_VIEW, uri);
        sos.setComponent(new ComponentName(this, MainActivity.class));
        sos.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_SINGLE_TOP);

        PowerManager pm = (PowerManager) getSystemService(Context.POWER_SERVICE);
        boolean screenOn = pm != null && pm.isInteractive();

        if (screenOn) {
            try {
                startActivity(sos);
                return;
            } catch (Exception ignored) {
                // lançamento bloqueado — cai para a notificação full-screen
            }
        }
        showSosAlert(sos);
    }

    /**
     * Ecrã apagado: notificação FULL-SCREEN INTENT (mesmo padrão dos alarmes) —
     * acorda o ecrã e aparece por cima do bloqueio. Se a permissão full-screen
     * faltar, o Android mostra-a como heads-up normal.
     */
    private void showSosAlert(Intent sos) {
        try {
            PendingIntent pi = PendingIntent.getActivity(
                    this, 20, sos,
                    PendingIntent.FLAG_IMMUTABLE | PendingIntent.FLAG_UPDATE_CURRENT);

            Notification.Builder b = Build.VERSION.SDK_INT >= 26
                    ? new Notification.Builder(this, CH_ALERT)
                    : new Notification.Builder(this);
            if (Build.VERSION.SDK_INT >= 29) {
                b.setFullScreenIntent(pi, true);
            } else {
                b.setPriority(Notification.PRIORITY_MAX);
            }
            b.setSmallIcon(R.drawable.ic_sos_shortcut)
                    .setContentTitle(getString(R.string.guardian_alert_title))
                    .setContentText(getString(R.string.guardian_alert_text))
                    .setCategory(Notification.CATEGORY_ALARM)
                    .setContentIntent(pi)
                    .setAutoCancel(true);

            NotificationManager nm = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
            if (nm != null) nm.notify(NOTIF_ALERT, b.build());
        } catch (SecurityException e) {
            // POST_NOTIFICATIONS recusada (Android 13+) — a tentativa de
            // startActivity já foi feita acima; nada mais a fazer aqui.
            android.util.Log.w("GuardianService", "alerta sem permissão de notificação");
        } catch (Exception ignored) {
        }
    }

    private void vibrateShort() {
        try {
            Vibrator v = null;
            if (Build.VERSION.SDK_INT >= 31) {
                VibratorManager vm = (VibratorManager) getSystemService(Context.VIBRATOR_MANAGER_SERVICE);
                if (vm != null) v = vm.getDefaultVibrator();
            } else {
                v = (Vibrator) getSystemService(Context.VIBRATOR_SERVICE);
            }
            if (v == null) return;
            if (Build.VERSION.SDK_INT >= 26) {
                v.vibrate(VibrationEffect.createOneShot(220, VibrationEffect.DEFAULT_AMPLITUDE));
            } else {
                v.vibrate(220);
            }
        } catch (Exception ignored) {
        }
    }

    // ── Notificações ─────────────────────────────────────────────────────────

    private void createChannels() {
        if (Build.VERSION.SDK_INT < 26) return;
        NotificationManager nm = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
        if (nm == null) return;

        NotificationChannel status = new NotificationChannel(
                CH_STATUS,
                getString(R.string.guardian_channel_status),
                NotificationManager.IMPORTANCE_LOW);   // silencioso, sem som
        status.setDescription(getString(R.string.guardian_channel_status));
        status.setShowBadge(false);
        nm.createNotificationChannel(status);

        NotificationChannel alert = new NotificationChannel(
                CH_ALERT,
                getString(R.string.guardian_channel_alert),
                NotificationManager.IMPORTANCE_HIGH);  // heads-up / full-screen
        alert.setDescription(getString(R.string.guardian_channel_alert));
        nm.createNotificationChannel(alert);
    }

    private void startForegroundCompat() {
        Notification n = buildStatusNotification();
        if (Build.VERSION.SDK_INT >= 34) {
            startForeground(NOTIF_STATUS, n, ServiceInfo.FOREGROUND_SERVICE_TYPE_SPECIAL_USE);
        } else {
            startForeground(NOTIF_STATUS, n);
        }
    }

    /** Notificação discreta e permanente — "Protecção activa". */
    private Notification buildStatusNotification() {
        Intent open = new Intent(Intent.ACTION_VIEW, Uri.parse("com.statusads.connect://guardiao"));
        open.setComponent(new ComponentName(this, MainActivity.class));
        PendingIntent pi = PendingIntent.getActivity(
                this, 10, open,
                PendingIntent.FLAG_IMMUTABLE | PendingIntent.FLAG_UPDATE_CURRENT);

        Notification.Builder b = Build.VERSION.SDK_INT >= 26
                ? new Notification.Builder(this, CH_STATUS)
                : new Notification.Builder(this);
        if (Build.VERSION.SDK_INT < 26) b.setPriority(Notification.PRIORITY_LOW);
        b.setSmallIcon(R.drawable.ic_sos_shortcut)
                .setContentTitle(getString(R.string.guardian_notif_title))
                .setContentText(getString(R.string.guardian_notif_text))
                .setContentIntent(pi)
                .setOngoing(true)
                .setShowWhen(false)
                .setOnlyAlertOnce(true);

        return b.build();
    }
}
