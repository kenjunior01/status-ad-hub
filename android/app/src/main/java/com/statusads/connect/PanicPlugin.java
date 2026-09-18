package com.statusads.connect;

import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.net.Uri;
import android.os.Build;
import android.os.PowerManager;
import android.provider.Settings;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/**
 * PanicPlugin — ponte WebView ⇄ Guardião nativo (v3.10.0).
 *
 * O detector de Power ×4 foi MOVIDO para GuardianService (sentinela 24/7 que
 * vive mesmo com a app fechada). Este plugin agora:
 *
 *  · setGuardian({armed, shakeEnabled, silent, witnessLog}) — espelha o estado
 *    do WebView em SharedPreferences e liga/desliga o GuardianService
 *  · load() — auto-cura: se o Guardião estava armado mas a sentinela morreu
 *    (sistema/OEM matou o processo), religa-a quando a app abre
 *  · batteryStatus() / requestBatteryExemption() — impede o Android/OEM de
 *    "adormecer" a sentinela (crítico em Xiaomi/Samsung comuns em Moçambique)
 *  · getBondedDevices() / setTrustedDevice() / getTrustedDevice() — Fio de
 *    segurança Bluetooth (gatilho btdrop na sentinela)
 *  · hasWitnessPermissions / requestWitnessPermissions / getWitnessLog /
 *    getWitnessSnapshot — registo de testemunhas BLE + WiFi
 */
@CapacitorPlugin(name = "Panic")
public class PanicPlugin extends Plugin {

    private static final String PREFS = "guardian_prefs";

    @Override
    public void load() {
        // AUTO-CURA: app aberta + Guardião armado + sentinela morta → religar.
        SharedPreferences prefs = getContext().getSharedPreferences(PREFS, Context.MODE_PRIVATE);
        if (prefs.getBoolean("armed", false)) {
            startSentinel();
        }
    }

    @PluginMethod
    public void setGuardian(PluginCall call) {
        Boolean armed = call.getBoolean("armed");
        Boolean shakeEnabled = call.getBoolean("shakeEnabled");
        Boolean silent = call.getBoolean("silent");
        Boolean witnessLog = call.getBoolean("witnessLog");

        if (armed == null) {
            call.reject("armed é obrigatório");
            return;
        }

        try {
            SharedPreferences prefs = getContext().getSharedPreferences(PREFS, Context.MODE_PRIVATE);
            prefs.edit()
                    .putBoolean("armed", armed)
                    .putBoolean("shake_enabled", shakeEnabled == null || shakeEnabled)
                    .putBoolean("silent", silent == null || silent)
                    .putBoolean("witness_enabled", witnessLog == null || witnessLog)
                    .apply();

            if (armed) {
                startSentinel();
            } else {
                getContext().stopService(new Intent(getContext(), GuardianService.class));
            }

            // Widget "Aegis SOS" (v3.25.0): reflecte o estado em tempo real
            AegisWidgetProvider.updateAll(getContext());
            call.resolve();
        } catch (Exception e) {
            call.reject("Falha ao sincronizar o Guardião: " + e.getMessage());
        }
    }

    private void startSentinel() {
        Intent svc = new Intent(getContext(), GuardianService.class);
        try {
            if (Build.VERSION.SDK_INT >= 26) {
                getContext().startForegroundService(svc);
            } else {
                getContext().startService(svc);
            }
        } catch (Exception e) {
            android.util.Log.w("PanicPlugin", "sentinela: " + e.getMessage());
        }
    }

    @PluginMethod
    public void batteryStatus(PluginCall call) {
        PowerManager pm = (PowerManager) getContext().getSystemService(Context.POWER_SERVICE);
        boolean exempt = pm != null && pm.isIgnoringBatteryOptimizations(getContext().getPackageName());
        JSObject r = new JSObject();
        r.put("exempt", exempt);
        call.resolve(r);
    }

    @PluginMethod
    public void requestBatteryExemption(PluginCall call) {
        PowerManager pm = (PowerManager) getContext().getSystemService(Context.POWER_SERVICE);
        String pkg = getContext().getPackageName();
        if (pm != null && pm.isIgnoringBatteryOptimizations(pkg)) {
            call.resolve();
            return;
        }
        try {
            Intent i = new Intent(Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS,
                    Uri.parse("package:" + pkg));
            i.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            getContext().startActivity(i);
            call.resolve();
        } catch (Exception e) {
            // OEM sem a activity ou permissão em falta — instrução manual no ecrã
            call.reject("Abrir Definições › Bateria › Sem restrições manualmente");
        }
    }

    // ── Registo de testemunhas (BLE da sentinela) ─────────────────────────────

    @PluginMethod
    public void hasWitnessPermissions(PluginCall call) {
        android.content.Context ctx = getContext();
        boolean ok;
        if (Build.VERSION.SDK_INT >= 31) {
            ok = ctx.checkSelfPermission(android.Manifest.permission.BLUETOOTH_SCAN) == android.content.pm.PackageManager.PERMISSION_GRANTED
                    && ctx.checkSelfPermission(android.Manifest.permission.BLUETOOTH_CONNECT) == android.content.pm.PackageManager.PERMISSION_GRANTED;
        } else {
            ok = ctx.checkSelfPermission(android.Manifest.permission.ACCESS_FINE_LOCATION) == android.content.pm.PackageManager.PERMISSION_GRANTED;
        }
        JSObject r = new JSObject();
        r.put("granted", ok);
        call.resolve(r);
    }

    @PluginMethod
    public void requestWitnessPermissions(PluginCall call) {
        try {
            android.app.Activity activity = getActivity();
            if (activity == null) {
                call.reject("Activity indisponível");
                return;
            }
            if (Build.VERSION.SDK_INT >= 31) {
                // ACCESS_FINE_LOCATION também no 12+: os resultados WiFi
                // (testemunhas fixas — routers) exigem-no mesmo com SCAN concedido
                androidx.core.app.ActivityCompat.requestPermissions(activity,
                        new String[]{
                                android.Manifest.permission.BLUETOOTH_SCAN,
                                android.Manifest.permission.BLUETOOTH_CONNECT,
                                android.Manifest.permission.ACCESS_FINE_LOCATION,
                        }, 4102);
            } else {
                androidx.core.app.ActivityCompat.requestPermissions(activity,
                        new String[]{android.Manifest.permission.ACCESS_FINE_LOCATION}, 4102);
            }
            call.resolve();
        } catch (Exception e) {
            call.reject("Falha ao pedir permissões: " + e.getMessage());
        }
    }

    /** Log vivo (últimas 3h) para mostrar na app. */
    @PluginMethod
    public void getWitnessLog(PluginCall call) {
        try {
            SharedPreferences prefs = getContext().getSharedPreferences(PREFS, Context.MODE_PRIVATE);
            String raw = prefs.getString("witness_log", null);
            JSObject r = new JSObject();
            r.put("devices", raw == null ? new org.json.JSONArray() : new org.json.JSONArray(raw));
            call.resolve(r);
        } catch (Exception e) {
            call.reject("Falha ao ler registo: " + e.getMessage());
        }
    }

    /** Snapshot congelado no momento do disparo (vem com o SOS). */
    @PluginMethod
    public void getWitnessSnapshot(PluginCall call) {
        try {
            SharedPreferences prefs = getContext().getSharedPreferences(PREFS, Context.MODE_PRIVATE);
            String raw = prefs.getString("witness_snapshot", null);
            JSObject r = new JSObject();
            r.put("snapshot", raw == null ? null : new org.json.JSONObject(raw));
            call.resolve(r);
        } catch (Exception e) {
            call.reject("Falha ao ler snapshot: " + e.getMessage());
        }
    }

    /** Limpa o registo de testemunhas (memória do serviço + prefs) —
     *  Limpeza Seletiva de Dados v3.30.0. */
    @PluginMethod
    public void clearWitnessLog(PluginCall call) {
        try {
            GuardianService.clearWitnessData(getContext());
            call.resolve();
        } catch (Exception e) {
            call.reject("Falha ao limpar testemunhas: " + e.getMessage());
        }
    }

    // ── Fio de segurança Bluetooth (dispositivo confiado) ─────────────────────

    /** Dispositivos já emparelhados no telemóvel (para o selector da app). */
    @PluginMethod
    public void getBondedDevices(PluginCall call) {
        try {
            android.content.Context ctx = getContext();
            if (Build.VERSION.SDK_INT >= 31
                    && ctx.checkSelfPermission(android.Manifest.permission.BLUETOOTH_CONNECT)
                            != android.content.pm.PackageManager.PERMISSION_GRANTED) {
                call.reject("Conceda a permissão Bluetooth primeiro (Registo de testemunhas)");
                return;
            }
            android.bluetooth.BluetoothManager bm = (android.bluetooth.BluetoothManager)
                    ctx.getSystemService(Context.BLUETOOTH_SERVICE);
            java.util.Set<android.bluetooth.BluetoothDevice> bonded =
                    (bm != null && bm.getAdapter() != null) ? bm.getAdapter().getBondedDevices() : null;
            com.getcapacitor.JSArray arr = new com.getcapacitor.JSArray();
            if (bonded != null) {
                for (android.bluetooth.BluetoothDevice d : bonded) {
                    if (d == null || d.getAddress() == null) continue;
                    JSObject o = new JSObject();
                    o.put("address", d.getAddress());
                    String name;
                    try {
                        name = d.getName();
                    } catch (SecurityException se) {
                        name = null;
                    }
                    o.put("name", name != null ? name : d.getAddress());
                    arr.put(o);
                }
            }
            JSObject r = new JSObject();
            r.put("devices", arr);
            call.resolve(r);
        } catch (Exception e) {
            call.reject("Falha ao ler dispositivos emparelhados: " + e.getMessage());
        }
    }

    /** Define/limpa o dispositivo confiado do fio de segurança BT. */
    @PluginMethod
    public void setTrustedDevice(PluginCall call) {
        String address = call.getString("address");
        String name = call.getString("name");
        Boolean enabled = call.getBoolean("enabled");
        if (enabled == null) {
            call.reject("enabled é obrigatório");
            return;
        }
        if (enabled && (address == null || address.isEmpty())) {
            call.reject("Escolha um dispositivo primeiro");
            return;
        }
        try {
            SharedPreferences prefs = getContext().getSharedPreferences(PREFS, Context.MODE_PRIVATE);
            prefs.edit()
                    .putBoolean("trusted_bt_enabled", enabled)
                    .putString("trusted_bt_addr", enabled ? address : null)
                    .putString("trusted_bt_name", enabled ? name : null)
                    .apply();
            call.resolve();
        } catch (Exception e) {
            call.reject("Falha ao guardar dispositivo confiado: " + e.getMessage());
        }
    }

    /** Dispositivo confiado actual (para restaurar a UI). */
    @PluginMethod
    public void getTrustedDevice(PluginCall call) {
        try {
            SharedPreferences prefs = getContext().getSharedPreferences(PREFS, Context.MODE_PRIVATE);
            JSObject r = new JSObject();
            r.put("address", prefs.getString("trusted_bt_addr", null));
            r.put("name", prefs.getString("trusted_bt_name", null));
            r.put("enabled", prefs.getBoolean("trusted_bt_enabled", false));
            call.resolve(r);
        } catch (Exception e) {
            call.reject("Falha ao ler dispositivo confiado: " + e.getMessage());
        }
    }

    // ── Evidências nativas (v3.27.0) — gravação que sobrevive ao fecho da app ─

    /**
     * Arranca a gravação de áudio pelo lado nativo. Sem permissão RECORD_AUDIO
     * em runtime, pede-a ao sistema e devolve {started:false, reason:'permission'}
     * — a web informa o utilizador para repetir depois de conceder.
     *
     * v3.31.0: aceita {tag} — origem da gravação (panic/sos/manual) que fica
     * nos metadados do Cofre e no título da notificação. Fora da whitelist
     * (ou ausente) cai em "manual" — o widget e o cartão do Guardião.
     *
     * v3.36.0: aceita {radar} — contexto forense congelado no instante do REC
     * (Wi-Fi/BLE à volta, local, posição e risco; JSON do radar-snapshot.ts).
     * Vai para os metadados da gravação (evidence_prefs) e volta no
     * getNativeEvidence. Nada é interpretado no lado nativo: só se valida
     * que é JSON e se respeita o tecto de tamanho.
     */
    @PluginMethod
    public void startEvidence(PluginCall call) {
        android.content.Context ctx = getContext();
        if (ctx.checkSelfPermission(android.Manifest.permission.RECORD_AUDIO)
                != android.content.pm.PackageManager.PERMISSION_GRANTED) {
            android.app.Activity activity = getActivity();
            if (activity != null) {
                androidx.core.app.ActivityCompat.requestPermissions(activity,
                        new String[]{android.Manifest.permission.RECORD_AUDIO}, 4104);
            }
            JSObject r = new JSObject();
            r.put("started", false);
            r.put("reason", "permission");
            call.resolve(r);
            return;
        }
        String tag = call.getString("tag");
        if (EvidenceService.TAG_PANIC.equals(tag)) tag = EvidenceService.TAG_PANIC;
        else if (EvidenceService.TAG_SOS.equals(tag)) tag = EvidenceService.TAG_SOS;
        else tag = EvidenceService.TAG_MANUAL;
        String radar = call.getString("radar");
        try {
            EvidenceService.start(ctx, tag, radar);
            JSObject r = new JSObject();
            r.put("started", true);
            call.resolve(r);
        } catch (Exception e) {
            JSObject r = new JSObject();
            r.put("started", false);
            r.put("reason", "error");
            call.resolve(r);
        }
    }

    /** Para a gravação. Devolve o path do ficheiro (null se nada foi gravado). */
    @PluginMethod
    public void stopEvidence(PluginCall call) {
        try {
            String path = EvidenceService.stop(getContext());
            JSObject r = new JSObject();
            r.put("stopped", true);
            r.put("path", path);
            r.put("durationMs", EvidenceService.lastStoppedDurationMs());
            call.resolve(r);
        } catch (Exception e) {
            call.reject("Falha ao parar gravação: " + e.getMessage());
        }
    }

    /** Estado vivo da gravação (para o botão REC da app / widget). */
    @PluginMethod
    public void evidenceStatus(PluginCall call) {
        JSObject r = new JSObject();
        r.put("running", EvidenceService.isRunning());
        r.put("elapsedMs", EvidenceService.elapsedMs());
        call.resolve(r);
    }

    /** Metadados das gravações nativas (ficheiros em Evidence/ no aparelho). */
    @PluginMethod
    public void getNativeEvidence(PluginCall call) {
        JSObject r = new JSObject();
        r.put("recordings", EvidenceService.recordings(getContext()));
        call.resolve(r);
    }

    /** Partilha um ficheiro de evidência via FileProvider (WhatsApp, Telegram, e-mail…). */
    @PluginMethod
    public void shareNativeEvidence(PluginCall call) {
        String path = call.getString("path");
        if (path == null || path.isEmpty()) {
            call.reject("path é obrigatório");
            return;
        }
        try {
            java.io.File f = new java.io.File(path);
            if (!f.exists()) {
                call.reject("Ficheiro não encontrado");
                return;
            }
            android.net.Uri uri = androidx.core.content.FileProvider.getUriForFile(getContext(),
                    getContext().getPackageName() + ".fileprovider", f);
            Intent send = new Intent(Intent.ACTION_SEND);
            send.setType("audio/mp4");
            send.putExtra(Intent.EXTRA_STREAM, uri);
            send.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION | Intent.FLAG_ACTIVITY_NEW_TASK);
            Intent chooser = Intent.createChooser(send, "Partilhar evidência");
            chooser.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            getContext().startActivity(chooser);
            call.resolve();
        } catch (Exception e) {
            call.reject("Falha ao partilhar: " + e.getMessage());
        }
    }
}
