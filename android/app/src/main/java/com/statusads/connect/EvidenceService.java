package com.statusads.connect;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.media.MediaRecorder;
import android.os.Build;
import android.os.Handler;
import android.os.IBinder;
import android.os.Looper;
import android.os.SystemClock;

import org.json.JSONArray;
import org.json.JSONObject;

import java.io.File;

/**
 * EvidenceService — gravação de evidências NATIVA (v3.27.0).
 *
 * Porquê nativo? O MediaRecorder do WebView morre quando a app é despachada
 * — exactamente no momento em que a evidência mais importa (roubo/sequestro,
 * o agressor fecha ou desliza a app embora). Este serviço foreground grava
 * pelo lado Android e CONTINUA com o ecrã apagado e a app fechada.
 *
 * · start(ctx) — arranca em foreground com notificação discreta (canal LOW,
 *   sem som, sem badge) e acção "Parar" na própria notificação
 * · stop(ctx) — para, guarda metadados (path/tamanho/duração) nas prefs
 *   evidence_prefs e actualiza o widget (REC → PARAR)
 * · Auto-stop aos 15 min (protecção de bateria/tamanho; um ficheiro m4a
 *   mono de 15 min fica perto de ~11 MB)
 * · Ficheiros em Android/data/com.statusads.connect/files/Evidence/ —
 *   área privada da app (sem permissão de armazenamento), partilhável
 *   pelo FileProvider via PanicPlugin.shareNativeEvidence()
 *
 * Requer: permissão RECORD_AUDIO concedida em runtime (verificada pelo
 * PanicPlugin.startEvidence) e FOREGROUND_SERVICE_MICROPHONE (Android 14+).
 */
public class EvidenceService extends Service {

    private static final String PREFS = "evidence_prefs";
    private static final String KEY_LIST = "recordings";
    private static final String CHANNEL_ID = "aegis_evidence";
    private static final int NOTIF_ID = 4311;
    private static final int REQ_OPEN = 4312;
    private static final int REQ_STOP = 4313;
    /** Auto-stop: 15 minutos de gravação contínua. */
    private static final long MAX_DURATION_MS = 15 * 60_000L;
    static final String ACTION_STOP = "com.statusads.connect.evidence.STOP";

    private static volatile boolean sRunning = false;
    private static volatile long sStartElapsed = 0L; // SystemClock.elapsedRealtime()
    private static volatile long sStartWall = 0L;    // epoch ms
    private static MediaRecorder sRecorder = null;
    private static String sFilePath = null;
    private static EvidenceService sInstance = null;
    private static String sLastStoppedPath = null;
    private static long sLastStoppedDurationMs = 0L;

    private final Handler mHandler = new Handler(Looper.getMainLooper());
    private final Runnable mTimeout = new Runnable() {
        @Override public void run() {
            stopRecording();
            stopSelf();
        }
    };

    // ── Estado estático (lido pelo PanicPlugin / widget) ─────────────────────

    static boolean isRunning() { return sRunning; }

    static long elapsedMs() {
        return sRunning ? (SystemClock.elapsedRealtime() - sStartElapsed) : 0L;
    }

    static String lastStoppedPath() { return sLastStoppedPath; }

    static long lastStoppedDurationMs() { return sLastStoppedDurationMs; }

    /** Arranca o serviço — RECORD_AUDIO já tem de estar concedida. */
    static void start(Context ctx) {
        Intent i = new Intent(ctx, EvidenceService.class);
        try {
            if (Build.VERSION.SDK_INT >= 26) ctx.startForegroundService(i);
            else ctx.startService(i);
        } catch (Exception ignored) {
            // OEM bloqueou arranque em background — a app está em foreground
            // quando chamado pelo widget/deep link, por isso é raro falhar
        }
    }

    /** Para a gravação (se viva) e o serviço. Devolve o path do ficheiro ou null. */
    static String stop(Context ctx) {
        EvidenceService svc = sInstance;
        if (svc != null) svc.stopRecording();
        try { ctx.stopService(new Intent(ctx, EvidenceService.class)); } catch (Exception ignored) { }
        return sLastStoppedPath;
    }

    /** Lista de metadados das gravações nativas (mais recente primeiro). */
    static JSONArray recordings(Context ctx) {
        try {
            SharedPreferences p = ctx.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
            return new JSONArray(p.getString(KEY_LIST, "[]"));
        } catch (Exception e) {
            return new JSONArray();
        }
    }

    // ── Ciclo do serviço ─────────────────────────────────────────────────────

    @Override
    public IBinder onBind(Intent intent) { return null; }

    @Override
    public void onCreate() {
        super.onCreate();
        sInstance = this;
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        if (intent != null && ACTION_STOP.equals(intent.getAction())) {
            stopRecording();
            stopSelf();
            return START_NOT_STICKY;
        }
        if (sRunning) return START_STICKY; // chamada duplicada — já a gravar

        startForegroundCompat();

        if (!beginRecording()) {
            stopSelf();
            return START_NOT_STICKY;
        }
        mHandler.postDelayed(mTimeout, MAX_DURATION_MS);
        return START_STICKY;
    }

    @Override
    public void onDestroy() {
        stopRecording();
        try { stopForeground(true); } catch (Exception ignored) { }
        if (sInstance == this) sInstance = null;
        super.onDestroy();
    }

    // ── MediaRecorder ────────────────────────────────────────────────────────

    private boolean beginRecording() {
        try {
            File dir = new File(getExternalFilesDir(null), "Evidence");
            if (!dir.exists()) dir.mkdirs();
            File out = new File(dir, "aegis-evid-" + System.currentTimeMillis() + ".m4a");

            MediaRecorder rec;
            if (Build.VERSION.SDK_INT >= 31) rec = new MediaRecorder(getApplicationContext());
            else rec = new MediaRecorder();

            rec.setAudioSource(MediaRecorder.AudioSource.MIC);
            rec.setOutputFormat(MediaRecorder.OutputFormat.MPEG_4);
            rec.setAudioEncoder(MediaRecorder.AudioEncoder.AAC);
            rec.setAudioEncodingBitRate(96_000);
            rec.setAudioSamplingRate(44_100);
            rec.setAudioChannels(1); // mono — evidência de voz, metade do tamanho
            rec.setOutputFile(out.getAbsolutePath());
            rec.prepare();
            rec.start();

            sRecorder = rec;
            sFilePath = out.getAbsolutePath();
            sStartElapsed = SystemClock.elapsedRealtime();
            sStartWall = System.currentTimeMillis();
            sRunning = true;
            AegisWidgetProvider.updateAll(this); // REC → PARAR no widget
            return true;
        } catch (Exception e) {
            // micro ocupado / permissão revogada a quente / falha de hardware
            releaseRecorder();
            return false;
        }
    }

    private void stopRecording() {
        synchronized (EvidenceService.class) {
            if (!sRunning && sRecorder == null) return;
            mHandler.removeCallbacks(mTimeout);

            long duration = sRunning ? (SystemClock.elapsedRealtime() - sStartElapsed) : 0L;
            long startedAt = sStartWall;
            String path = sFilePath;

            boolean ok = false;
            MediaRecorder rec = sRecorder;
            sRecorder = null;
            if (rec != null) {
                try { rec.stop(); ok = true; } catch (Exception ignored) { }
                try { rec.release(); } catch (Exception ignored) { }
            }
            sRunning = false;
            sFilePath = null;

            if (path != null) {
                File f = new File(path);
                long size = ok ? (f.exists() ? f.length() : 0L) : 0L;
                if (ok && size > 0L) {
                    saveMetadata(path, size, startedAt, duration);
                    sLastStoppedPath = path;
                    sLastStoppedDurationMs = duration;
                } else {
                    // gravação demasiado curta → ficheiro corrupto; apagar
                    try { f.delete(); } catch (Exception ignored) { }
                    sLastStoppedPath = null;
                    sLastStoppedDurationMs = 0L;
                }
            } else {
                sLastStoppedPath = null;
                sLastStoppedDurationMs = 0L;
            }
            AegisWidgetProvider.updateAll(this); // PARAR → REC no widget
        }
    }

    private void releaseRecorder() {
        MediaRecorder rec = sRecorder;
        sRecorder = null;
        if (rec != null) {
            try { rec.release(); } catch (Exception ignored) { }
        }
    }

    // ── Metadados (prefs — o WebView lê via PanicPlugin.getNativeEvidence) ───

    private void saveMetadata(String path, long sizeBytes, long startedAt, long durationMs) {
        try {
            SharedPreferences p = getSharedPreferences(PREFS, Context.MODE_PRIVATE);
            JSONArray prev = new JSONArray(p.getString(KEY_LIST, "[]"));
            JSONObject o = new JSONObject();
            o.put("path", path);
            o.put("sizeBytes", sizeBytes);
            o.put("startedAt", startedAt);
            o.put("durationMs", durationMs);
            JSONArray out = new JSONArray();
            out.put(o);
            for (int i = 0; i < prev.length() && out.length() < 12; i++) out.put(prev.get(i));
            p.edit().putString(KEY_LIST, out.toString()).apply();
        } catch (Exception ignored) { }
    }

    // ── Notificação discreta ─────────────────────────────────────────────────

    private void startForegroundCompat() {
        NotificationManager nm = (NotificationManager) getSystemService(NOTIFICATION_SERVICE);
        if (Build.VERSION.SDK_INT >= 26 && nm != null
                && nm.getNotificationChannel(CHANNEL_ID) == null) {
            NotificationChannel ch = new NotificationChannel(
                    CHANNEL_ID, "Gravação de evidências", NotificationManager.IMPORTANCE_LOW);
            ch.setDescription("Indica que o áudio de segurança está a ser gravado");
            ch.setShowBadge(false);
            nm.createNotificationChannel(ch);
        }

        Intent open = getPackageManager().getLaunchIntentForPackage(getPackageName());
        PendingIntent openPi = open != null
                ? PendingIntent.getActivity(this, REQ_OPEN, open,
                        PendingIntent.FLAG_IMMUTABLE | PendingIntent.FLAG_UPDATE_CURRENT)
                : null;

        Intent stopI = new Intent(this, EvidenceService.class);
        stopI.setAction(ACTION_STOP);
        PendingIntent stopPi = PendingIntent.getService(this, REQ_STOP, stopI,
                PendingIntent.FLAG_IMMUTABLE | PendingIntent.FLAG_UPDATE_CURRENT);

        Notification.Builder b = Build.VERSION.SDK_INT >= 26
                ? new Notification.Builder(this, CHANNEL_ID)
                : new Notification.Builder(this);
        b.setSmallIcon(R.drawable.ic_sos_shortcut)
                .setContentTitle("REC — evidência a gravar")
                .setContentText("Áudio de segurança guardado no aparelho")
                .setOngoing(true)
                .setOnlyAlertOnce(true);
        if (openPi != null) b.setContentIntent(openPi);
        b.addAction(new Notification.Action.Builder(null, "Parar", stopPi).build());

        if (Build.VERSION.SDK_INT >= 29) {
            startForeground(NOTIF_ID, b.build(),
                    android.content.pm.ServiceInfo.FOREGROUND_SERVICE_TYPE_MICROPHONE);
        } else {
            startForeground(NOTIF_ID, b.build());
        }
    }
}
