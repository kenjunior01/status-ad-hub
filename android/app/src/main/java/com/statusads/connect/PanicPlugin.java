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
 * PanicPlugin — ponte WebView ⇄ Guardião nativo (v3.8.0).
 *
 * O detector de Power ×4 foi MOVIDO para GuardianService (sentinela 24/7 que
 * vive mesmo com a app fechada). Este plugin agora:
 *
 *  · setGuardian({armed, shakeEnabled, silent}) — espelha o estado do WebView
 *    em SharedPreferences e liga/desliga o GuardianService
 *  · load() — auto-cura: se o Guardião estava armado mas a sentinela morreu
 *    (sistema/OEM matou o processo), religa-a quando a app abre
 *  · batteryStatus() / requestBatteryExemption() — impede o Android/OEM de
 *    "adormecer" a sentinela (crítico em Xiaomi/Samsung comuns em Moçambique)
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
                androidx.core.app.ActivityCompat.requestPermissions(activity,
                        new String[]{
                                android.Manifest.permission.BLUETOOTH_SCAN,
                                android.Manifest.permission.BLUETOOTH_CONNECT,
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
}
