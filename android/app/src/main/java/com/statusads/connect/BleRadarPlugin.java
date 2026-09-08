package com.statusads.connect;

import android.Manifest;
import android.bluetooth.BluetoothAdapter;
import android.bluetooth.BluetoothManager;
import android.bluetooth.le.ScanCallback;
import android.bluetooth.le.ScanResult;
import android.bluetooth.le.ScanSettings;
import android.content.Context;
import android.content.pm.PackageManager;
import android.location.Location;
import android.location.LocationListener;
import android.location.LocationManager;
import android.os.Build;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.util.SparseArray;

import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import org.json.JSONArray;
import org.json.JSONObject;

import java.util.HashMap;
import java.util.Iterator;
import java.util.LinkedHashMap;
import java.util.Map;

/**
 * BleRadarPlugin — RADAR BLUETOOTH SEM EMPARELHAR (v3.15.0).
 *
 * Usa o BluetoothLeScanner do Android para "puxar" informação de TODOS os
 * dispositivos BLE próximos SEM EMPARELHAR e sem dialogs do sistema:
 *
 *   · MAC real do dispositivo
 *   · Nome anunciado
 *   · RSSI (sinal real — estimativa de distância)
 *   · ID de fabricante (Apple, Samsung, Google, Xiaomi, Huawei, Toyota...)
 *   · Payload do fabricante (hex — fingerprints de AirTag/SmartTag/wearables)
 *   · Service UUIDs anunciados
 *   · TX Power (quando anunciado)
 *
 * Dois modos:
 *  · scanNow({durationMs}) — scan pontual a pedido (radar na app); emite o
 *    evento "bleDevice" por cada dispositivo e resolve com o resumo.
 *  · startTrail({intervalSec}) — RASTRO AUTOMÁTICO: a cada intervalo captura
 *    um ponto GPS + os dispositivos visíveis naquele momento e guarda no
 *    histórico local (prefs, máx. 80 pontos, TTL 24h). Se acontecer algo, a
 *    trilha "Quem/Onde/Quando" sai com o SOS (SMS + email + nuvem) e ajuda a
 *    localizar/reconstituir o percurso da vítima.
 *
 * Privacidade: os dados vivem no aparelho; só saem com o SOS ou quando o
 * utilizador pede explicitamente para sincronizar.
 */
@CapacitorPlugin(name = "BleRadar")
public class BleRadarPlugin extends Plugin {

    private static final String PREFS = "ble_radar_prefs";
    private static final int TRAIL_MAX_POINTS = 80;
    private static final long TRAIL_TTL_MS = 24 * 60 * 60 * 1000L; // 24h
    private static final long SCAN_WINDOW_MS = 4_000;             // janela de scan por ponto
    private static final long MIN_INTERVAL_MS = 15_000;           // intervalo mínimo do rastro
    private static final int MAX_DEVICES_PER_POINT = 40;

    private final Handler handler = new Handler(Looper.getMainLooper());
    private BluetoothAdapter adapter;
    private boolean scanRunning = false;

    // dispositivos da janela de scan em curso (keyed por MAC)
    private final LinkedHashMap<String, JSObject> windowDevices = new LinkedHashMap<>();

    // rastro automático
    private boolean trailRunning = false;
    private long trailIntervalMs = 60_000;
    private Location trailLastLocation;

    // ── Fabricantes (Bluetooth SIG Company IDs mais comuns) ────────────────
    private static final Map<Integer, String> MFR_NAMES = new HashMap<>();
    static {
        MFR_NAMES.put(1, "Nokia");
        MFR_NAMES.put(6, "Microsoft");
        MFR_NAMES.put(76, "Apple");
        MFR_NAMES.put(87, "Harman/JBL");
        MFR_NAMES.put(117, "Samsung");
        MFR_NAMES.put(135, "Garmin");
        MFR_NAMES.put(158, "Bose");
        MFR_NAMES.put(174, "LG");
        MFR_NAMES.put(224, "Google");
        MFR_NAMES.put(301, "Sony");
        MFR_NAMES.put(369, "Lenovo");
        MFR_NAMES.put(637, "Huawei");
        MFR_NAMES.put(911, "Xiaomi");
        MFR_NAMES.put(203, "Garmin (AT)");
        MFR_NAMES.put(741, "Realme");
        MFR_NAMES.put(1194, "Honor");
    }

    // ══════════════════════════════════════════════════════════════════════
    // Scan pontual (radar na app)
    // ══════════════════════════════════════════════════════════════════════

    @PluginMethod
    public void scanNow(PluginCall call) {
        Integer duration = call.getInt("durationMs", 4000);
        long dur = (duration == null || duration < 1000) ? 4000 : Math.min(duration, 15_000);

        if (!hasBlePermissions()) {
            call.reject("Permissões Bluetooth em falta (pedido em Definições › Permissões)");
            return;
        }
        BluetoothAdapter a = getAdapter();
        if (a == null || !a.isEnabled() || a.getBluetoothLeScanner() == null) {
            call.reject("Bluetooth desligado — ligue-o para escanear");
            return;
        }
        if (scanRunning) {
            call.reject("Já há um scan em curso");
            return;
        }

        windowDevices.clear();
        scanRunning = true;
        final long startAt = System.currentTimeMillis();

        try {
            ScanSettings settings = new ScanSettings.Builder()
                    .setScanMode(ScanSettings.SCAN_MODE_LOW_LATENCY)
                    .build();
            a.getBluetoothLeScanner().startScan(null, settings, scanCallback);
        } catch (SecurityException se) {
            scanRunning = false;
            call.reject("Permissões Bluetooth recusadas");
            return;
        } catch (Exception e) {
            scanRunning = false;
            call.reject("Falha ao iniciar scan: " + e.getMessage());
            return;
        }

        handler.postDelayed(() -> {
            finishScanWindow(false);
            JSObject r = new JSObject();
            r.put("found", windowDevices.size());
            r.put("durationMs", System.currentTimeMillis() - startAt);
            r.put("devices", new JSArray(windowDevices.values()));
            call.resolve(r);
        }, dur);
    }

    /** Cancela o scan a pedido em curso (não afecta o rastro). */
    @PluginMethod
    public void stopScan(PluginCall call) {
        if (scanRunning) finishScanWindow(false);
        call.resolve();
    }

    private final ScanCallback scanCallback = new ScanCallback() {
        @Override
        public void onScanResult(int callbackType, ScanResult result) {
            try {
                if (result == null || result.getDevice() == null) return;
                String mac = result.getDevice().getAddress();
                if (mac == null || mac.isEmpty()) return;

                JSObject dev = buildDeviceJson(result, mac);
                windowDevices.put(mac, dev); // último RSSI ganha (mapa por MAC)
                // evento vivo para a UI (radar em tempo real)
                JSObject ev = new JSObject();
                ev.put("device", dev);
                notifyListeners("bleDevice", ev);
            } catch (SecurityException se) {
                // CONNECT em falta — nome indisponível, segue com o resto
            } catch (Exception ignored) {
            }
        }

        @Override
        public void onScanFailed(int errorCode) {
            scanRunning = false;
        }
    };

    private void finishScanWindow(boolean isTrail) {
        try {
            BluetoothAdapter a = getAdapter();
            if (a != null && a.getBluetoothLeScanner() != null) {
                a.getBluetoothLeScanner().stopScan(scanCallback);
            }
        } catch (Exception ignored) {
        }
        scanRunning = false;
    }

    // ══════════════════════════════════════════════════════════════════════
    // Rastro automático (pontos GPS + dispositivos periódicos)
    // ══════════════════════════════════════════════════════════════════════

    @PluginMethod
    public void startTrail(PluginCall call) {
        Integer intervalSec = call.getInt("intervalSec", 60);
        long interval = (intervalSec == null ? 60 : intervalSec) * 1000L;
        trailIntervalMs = Math.max(interval, MIN_INTERVAL_MS);

        if (!hasBlePermissions()) {
            call.reject("Permissões Bluetooth em falta");
            return;
        }

        trailRunning = true;
        getContext().getSharedPreferences(PREFS, Context.MODE_PRIVATE)
                .edit()
                .putBoolean("trail_running", true)
                .putLong("trail_interval", trailIntervalMs)
                .apply();

        // 1.º ponto imediatamente
        handler.post(this::trailCycle);
        call.resolve();
    }

    @PluginMethod
    public void stopTrail(PluginCall call) {
        trailRunning = false;
        if (scanRunning) finishScanWindow(false);
        getContext().getSharedPreferences(PREFS, Context.MODE_PRIVATE)
                .edit().putBoolean("trail_running", false).apply();
        call.resolve();
    }

    /** Um ciclo do rastro: GPS → janela de scan → ponto no histórico. */
    private void trailCycle() {
        if (!trailRunning) return;
        captureTrailPoint();
        handler.postDelayed(this::trailCycle, trailIntervalMs);
    }

    private void captureTrailPoint() {
        if (scanRunning) return; // janela anterior ainda activa — salta

        BluetoothAdapter a = getAdapter();
        boolean btOk = a != null && a.isEnabled() && a.getBluetoothLeScanner() != null && hasBlePermissions();
        if (!btOk) return;

        windowDevices.clear();
        scanRunning = true;
        final long pointAt = System.currentTimeMillis();

        try {
            ScanSettings settings = new ScanSettings.Builder()
                    .setScanMode(ScanSettings.SCAN_MODE_BALANCED)
                    .build();
            a.getBluetoothLeScanner().startScan(null, settings, scanCallback);
        } catch (Exception e) {
            scanRunning = false;
            return;
        }

        // pede localização fresca enquanto a janela corre
        requestFreshLocation();

        handler.postDelayed(() -> {
            finishScanWindow(true);
            saveTrailPoint(pointAt);
        }, SCAN_WINDOW_MS);
    }

    /** Escreve o ponto no histórico (com GPS da melhor localização conhecida). */
    private void saveTrailPoint(long pointAt) {
        try {
            JSONObject point = new JSONObject();
            point.put("t", pointAt);

            Location loc = trailLastLocation;
            if (loc == null) loc = lastKnownLocation();
            if (loc != null) {
                point.put("lat", loc.getLatitude());
                point.put("lng", loc.getLongitude());
                if (loc.hasAccuracy()) point.put("acc", Math.round(loc.getAccuracy()));
            }

            JSONArray devs = new JSONArray();
            java.util.HashSet<String> unique = new java.util.HashSet<>();
            // ordena por RSSI (mais fortes primeiro) — LinkedHashSet preserva melhor sinal? → ordena aqui
            java.util.List<JSObject> list = new java.util.ArrayList<>(windowDevices.values());
            java.util.Collections.sort(list, (x, y) -> Integer.compare(
                    y.has("r") ? y.optInt("r", -127) : -127,
                    x.has("r") ? x.optInt("r", -127) : -127));
            for (JSObject d : list) {
                if (devs.length() >= MAX_DEVICES_PER_POINT) break;
                String mac = d.optString("mac", "");
                if (mac.length() > 0) unique.add(mac);
                devs.put(d);
            }
            point.put("n", devs.length());
            point.put("u", unique.size());
            point.put("d", devs);

            // anexa ao histórico
            org.json.JSONArray trail = loadTrailJson();
            JSONArray newTrail = new JSONArray();
            for (int i = 0; i < trail.length(); i++) newTrail.put(trail.get(i));
            newTrail.put(point);
            // poda: TTL e cap duro
            long cutoff = System.currentTimeMillis() - TRAIL_TTL_MS;
            while (newTrail.length() > 0) {
                JSONObject first = newTrail.optJSONObject(0);
                if (first != null && first.optLong("t", 0) < cutoff) {
                    newTrail.remove(0);
                } else {
                    break;
                }
            }
            while (newTrail.length() > TRAIL_MAX_POINTS) newTrail.remove(0);

            getContext().getSharedPreferences(PREFS, Context.MODE_PRIVATE)
                    .edit()
                    .putString("trail", newTrail.toString())
                    .putLong("last_point_at", pointAt)
                    .putInt("devices_last", devs.length())
                    .apply();

            // evento vivo
            JSObject ev = new JSObject();
            ev.put("point", new JSObject(point.toString()));
            notifyListeners("trailPoint", ev);
        } catch (Exception ignored) {
        }
    }

    private JSONArray loadTrailJson() {
        try {
            String raw = getContext().getSharedPreferences(PREFS, Context.MODE_PRIVATE).getString("trail", null);
            return raw == null ? new JSONArray() : new JSONArray(raw);
        } catch (Exception e) {
            return new JSONArray();
        }
    }

    @PluginMethod
    public void getTrail(PluginCall call) {
        try {
            JSObject r = new JSObject();
            r.put("points", new JSArray(loadTrailJson().toString()));
            r.put("running", trailRunning);
            r.put("intervalSec", (int) (trailIntervalMs / 1000));
            call.resolve(r);
        } catch (Exception e) {
            call.reject("Falha ao ler rastro: " + e.getMessage());
        }
    }

    /** Estado rápido do rastro (sem carregar os pontos — para a UI). */
    @PluginMethod
    public void trailStatus(PluginCall call) {
        try {
            JSONArray trail = loadTrailJson();
            JSObject r = new JSObject();
            r.put("running", trailRunning);
            r.put("points", trail.length());
            r.put("lastPointAt", getContext().getSharedPreferences(PREFS, Context.MODE_PRIVATE).getLong("last_point_at", 0L));
            r.put("intervalSec", (int) (trailIntervalMs / 1000));
            call.resolve(r);
        } catch (Exception e) {
            call.reject("Falha: " + e.getMessage());
        }
    }

    @PluginMethod
    public void clearTrail(PluginCall call) {
        getContext().getSharedPreferences(PREFS, Context.MODE_PRIVATE)
                .edit().remove("trail").putLong("last_point_at", 0L).apply();
        call.resolve();
    }

    // ══════════════════════════════════════════════════════════════════════
    // Permissões
    // ══════════════════════════════════════════════════════════════════════

    @PluginMethod
    public void hasPermissions(PluginCall call) {
        JSObject r = new JSObject();
        r.put("granted", hasBlePermissions());
        r.put("btEnabled", isBtEnabled());
        call.resolve(r);
    }

    @PluginMethod
    public void requestPermissions(PluginCall call) {
        try {
            android.app.Activity activity = getActivity();
            if (activity == null) {
                call.reject("Activity indisponível");
                return;
            }
            if (Build.VERSION.SDK_INT >= 31) {
                androidx.core.app.ActivityCompat.requestPermissions(activity,
                        new String[]{
                                Manifest.permission.BLUETOOTH_SCAN,
                                Manifest.permission.BLUETOOTH_CONNECT,
                                Manifest.permission.ACCESS_FINE_LOCATION,
                        }, 4115);
            } else {
                androidx.core.app.ActivityCompat.requestPermissions(activity,
                        new String[]{Manifest.permission.ACCESS_FINE_LOCATION}, 4115);
            }
            call.resolve();
        } catch (Exception e) {
            call.reject("Falha ao pedir permissões: " + e.getMessage());
        }
    }

    private boolean hasBlePermissions() {
        Context ctx = getContext();
        if (Build.VERSION.SDK_INT >= 31) {
            return ctx.checkSelfPermission(Manifest.permission.BLUETOOTH_SCAN) == PackageManager.PERMISSION_GRANTED
                    && ctx.checkSelfPermission(Manifest.permission.BLUETOOTH_CONNECT) == PackageManager.PERMISSION_GRANTED;
        }
        return ctx.checkSelfPermission(Manifest.permission.ACCESS_FINE_LOCATION) == PackageManager.PERMISSION_GRANTED;
    }

    private boolean isBtEnabled() {
        BluetoothAdapter a = getAdapter();
        return a != null && a.isEnabled();
    }

    private BluetoothAdapter getAdapter() {
        if (adapter == null) {
            BluetoothManager bm = (BluetoothManager) getContext().getSystemService(Context.BLUETOOTH_SERVICE);
            if (bm != null) adapter = bm.getAdapter();
        }
        return adapter;
    }

    // ══════════════════════════════════════════════════════════════════════
    // Localização (pontos GPS do rastro)
    // ══════════════════════════════════════════════════════════════════════

    private final LocationListener locationListener = new LocationListener() {
        @Override
        public void onLocationChanged(Location location) {
            if (location != null) trailLastLocation = location;
        }
        @Override public void onProviderDisabled(String provider) { }
        @Override public void onProviderEnabled(String provider) { }
        @Override public void onStatusChanged(String provider, int status, Bundle extras) { }
    };

    /** Pede um update fresco (qualquer provider) durante a janela de scan. */
    private void requestFreshLocation() {
        try {
            LocationManager lm = (LocationManager) getContext().getSystemService(Context.LOCATION_SERVICE);
            if (lm == null) return;
            if (getContext().checkSelfPermission(Manifest.permission.ACCESS_FINE_LOCATION)
                    != PackageManager.PERMISSION_GRANTED) return;

            if (Build.VERSION.SDK_INT >= 30) {
                String best = bestProvider(lm);
                if (best == null) return;
                lm.getCurrentLocation(best, null, getContext().getMainExecutor(), locationListener::onLocationChanged);
            } else {
                String best = bestProvider(lm);
                if (best == null) return;
                lm.requestSingleUpdate(best, locationListener, Looper.getMainLooper());
            }
        } catch (Exception ignored) {
        }
    }

    private String bestProvider(LocationManager lm) {
        String best = null;
        boolean fine = getContext().checkSelfPermission(Manifest.permission.ACCESS_FINE_LOCATION)
                == PackageManager.PERMISSION_GRANTED;
        if (lm.isProviderEnabled(LocationManager.GPS_PROVIDER)) best = LocationManager.GPS_PROVIDER;
        else if (fine && lm.isProviderEnabled(LocationManager.NETWORK_PROVIDER)) best = LocationManager.NETWORK_PROVIDER;
        else if (lm.isProviderEnabled(LocationManager.PASSIVE_PROVIDER)) best = LocationManager.PASSIVE_PROVIDER;
        return best;
    }

    private Location lastKnownLocation() {
        try {
            LocationManager lm = (LocationManager) getContext().getSystemService(Context.LOCATION_SERVICE);
            if (lm == null) return null;
            if (getContext().checkSelfPermission(Manifest.permission.ACCESS_FINE_LOCATION)
                    != PackageManager.PERMISSION_GRANTED) return null;
            Location best = null;
            for (String p : new String[]{LocationManager.GPS_PROVIDER, LocationManager.NETWORK_PROVIDER, LocationManager.PASSIVE_PROVIDER}) {
                try {
                    Location l = lm.getLastKnownLocation(p);
                    if (l != null && (best == null || l.getTime() > best.getTime())) best = l;
                } catch (Exception ignored) {
                }
            }
            return best;
        } catch (Exception e) {
            return null;
        }
    }

    // ══════════════════════════════════════════════════════════════════════
    // Extracção de dados do ScanResult
    // ══════════════════════════════════════════════════════════════════════

    /** JSObject com TODOS os dados úteis de um resultado de scan. */
    static JSObject buildDeviceJson(ScanResult result, String mac) throws SecurityException {
        JSObject o = new JSObject();
        o.put("mac", mac);
        o.put("r", result.getRssi());
        o.put("ts", System.currentTimeMillis());

        String name = null;
        try {
            name = result.getDevice().getName();
        } catch (SecurityException se) {
            // CONNECT em falta — segue com o nome anunciado
        }
        if (name == null && result.getScanRecord() != null) {
            name = result.getScanRecord().getDeviceName();
        }
        if (name != null && name.trim().isEmpty()) name = null;
        if (name != null) o.put("n", name);

        int mfrId = -1;
        String mfrDataHex = null;
        if (result.getScanRecord() != null) {
            SparseArray<byte[]> mfr = result.getScanRecord().getManufacturerSpecificData();
            if (mfr != null && mfr.size() > 0) {
                mfrId = mfr.keyAt(0);
                byte[] payload = mfr.valueAt(0);
                if (payload != null && payload.length > 0) {
                    StringBuilder sb = new StringBuilder();
                    int max = Math.min(payload.length, 12);
                    for (int i = 0; i < max; i++) sb.append(String.format("%02X", payload[i]));
                    mfrDataHex = sb.toString();
                }
            }
        }
        if (mfrId >= 0) {
            o.put("m", mfrId);
            o.put("mf", mfrName(mfrId));
            if (mfrDataHex != null) o.put("md", mfrDataHex);
        }

        // Service UUIDs anunciados (máx. 4, curtos)
        try {
            if (result.getScanRecord() != null) {
                java.util.List<android.os.ParcelUuid> uuids = result.getScanRecord().getServiceUuids();
                if (uuids != null && !uuids.isEmpty()) {
                    StringBuilder sb = new StringBuilder();
                    int max = Math.min(uuids.size(), 4);
                    for (int i = 0; i < max; i++) {
                        if (i > 0) sb.append(",");
                        String u = uuids.get(i).toString();
                        sb.append(u.length() > 8 ? u.substring(0, 8) : u);
                    }
                    o.put("s", sb.toString());
                }
            }
        } catch (Exception ignored) {
        }

        // TX Power (API 26+)
        if (Build.VERSION.SDK_INT >= 26) {
            int tx = result.getTxPower();
            if (tx != 127 && tx != 0) o.put("tx", tx);
        }

        o.put("k", classifyDevice(name, mfrId));
        return o;
    }

    static String mfrName(int id) {
        String n = MFR_NAMES.get(id);
        return n != null ? n : String.format("ID 0x%04X", id);
    }

    /**
     * Classificação por palavras-chave do nome + fabricante — ajuda as
     * testemunhas/policia a perceber QUE tipo de dispositivo estava perto
     * (o telemóvel de alguém, o carro, uma AirTag, etc.).
     */
    static String classifyDevice(String name, int mfrId) {
        String u = (name == null) ? "" : name.toUpperCase();

        if (u.contains("AIRPOD") || u.contains("AIRPODS") || u.contains("BUDS") || u.contains("BEATS")
                || u.contains("TWS") || u.contains("EARBUD") || u.contains("HEADSET") || u.contains("FREEBUDS")
                || u.contains("BUDS2") || u.contains("BUDS3") || u.contains("EARBUDS")) return "Auscultadores";
        if (u.contains("WATCH") || u.contains("BAND ") || u.contains("BAND-") || u.contains("MI BAND")
                || u.contains("FIT ") || u.contains("GARMIN") || u.contains("AMAZFIT")) return "Relógio/Banda";
        if (u.contains("AIRTAG") || u.contains("SMARTTAG") || u.contains("TILE") || u.endsWith("TAG"))
            return "Localizador";
        if (u.contains("CAR") || u.contains("TOYOTA") || u.contains("BMW") || u.contains("MERCEDES")
                || u.contains("BENZ") || u.contains("HONDA") || u.contains("NISSAN") || u.contains("KIA")
                || u.contains("HYUNDAI") || u.contains("VOLKSWAGEN") || u.contains("FORD") || u.contains("AUDI")
                || u.contains("MAZDA") || u.contains("HILUX") || u.contains("RANGER") || u.contains("COROLLA")
                || u.contains("LAND CRUISER") || u.contains("ISUZU") || u.contains("MITSUBISHI"))
            return "Carro";
        if (u.contains("SPEAKER") || u.contains("JBL") || u.contains("FLIP") || u.contains("CHARGE")
                || u.contains("BOOM") || u.contains("BANG") || u.contains("OLUFSEN") || u.contains("GO ")
                || u.contains("SRS-")) return "Coluna";
        if (u.contains("IPHONE") || u.contains("GALAXY S") || u.contains("GALAXY A") || u.contains("GALAXY M")
                || u.contains("REDMI") || u.contains("POCO") || u.contains("PIXEL") || u.contains("MOTO ")
                || u.contains("MOTO-") || u.contains("TECNO") || u.contains("INFINIX") || u.contains("ITEL")
                || u.contains("SPARK") || u.contains("CAMON") || u.contains("HUAWEI") || u.contains("NOVA ")
                || u.contains("MATE ") || u.contains("HONOR") || u.contains("NOKIA ") || u.contains("OPPO")
                || u.contains("VIVO ") || u.contains("REALME")) return "Telemóvel";
        if (u.contains("IPAD") || u.contains("TAB ") || u.contains("TAB-") || u.contains("TABLET"))
            return "Tablet";
        if (u.contains("TV") || u.contains("BOX") || u.contains("STICK") || u.contains("CHROMECAST"))
            return "TV/Box";
        if (u.contains("MACBOOK") || u.contains("LAPTOP") || u.contains("THINKPAD") || u.contains("IDEAPAD"))
            return "Portátil";

        // por fabricante quando o nome não ajuda
        if (mfrId == 76) return "Dispositivo Apple";
        if (mfrId == 117) return "Dispositivo Samsung";
        if (mfrId == 224) return "Dispositivo Google";
        if (mfrId == 637) return "Dispositivo Huawei";
        if (mfrId == 911) return "Dispositivo Xiaomi";
        return "Desconhecido";
    }
}
