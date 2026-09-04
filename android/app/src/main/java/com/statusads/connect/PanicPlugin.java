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
}
