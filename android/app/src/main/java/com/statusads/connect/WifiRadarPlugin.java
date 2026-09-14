package com.statusads.connect;

import android.Manifest;
import android.annotation.SuppressLint;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.content.pm.PackageManager;
import android.location.Location;
import android.location.LocationListener;
import android.location.LocationManager;
import android.net.wifi.ScanResult;
import android.net.wifi.WifiInfo;
import android.net.wifi.WifiManager;
import android.os.Build;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.telephony.CellInfo;
import android.telephony.CellInfoCdma;
import android.telephony.CellInfoGsm;
import android.telephony.CellInfoLte;
import android.telephony.CellInfoNr;
import android.telephony.CellInfoTdscdma;
import android.telephony.CellInfoWcdma;
import android.telephony.CellSignalStrengthCdma;
import android.telephony.CellSignalStrengthGsm;
import android.telephony.CellSignalStrengthLte;
import android.telephony.CellSignalStrengthNr;
import android.telephony.CellSignalStrengthWcdma;
import android.telephony.TelephonyManager;

import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import org.json.JSONArray;
import org.json.JSONObject;

import java.util.ArrayList;
import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.List;

/**
 * WifiRadarPlugin — RADAR WI-FI + REDE MÓVEL SEM LIGAÇÃO (v3.16.0).
 *
 * Usa o WifiManager do Android para capturar TODAS as redes Wi-Fi próximas
 * SEM SE LIGAR a elas:
 *
 *   · BSSID real (MAC do router) · SSID · RSSI (sinal → distância)
 *   · Frequência/canal · banda (2.4 / 5 / 6 GHz)
 *   · Segurança anunciada (ABERTA / WEP / WPA / WPA2 / WPA3 / Enterprise)
 *   · Largura de canal · 802.11mc (FTM)
 *
 * E o TelephonyManager para testemunhas da REDE MÓVEL:
 *   · Operadora · MCC/MNC · torres celulares visíveis (CID/LAC/TAC + dBm)
 *
 * REGISTO (registry) persistente em SharedPreferences:
 *   · 1.ª vez visto · última vez visto · nº de vezes · melhor sinal
 *   · GPS aproximado onde foi visto (última localização conhecida)
 *   · TTL 14 dias · máx. 400 redes — o histórico sobrevive a reinícios
 *
 * RASTRO (trail): a cada intervalo, ponto GPS + redes Wi-Fi visíveis +
 * torres celulares. No SOS, a trilha "Quem/Onde/Quando" sai por SMS +
 * email + nuvem e ajuda a reconstituir o percurso da vítima.
 *
 * No web/PWA não há scan Wi-Fi: as funções tornam-se no-op seguras
 * (isNativeAvailable() = false) e a UI explica a limitação.
 */
@CapacitorPlugin(name = "WifiRadar")
public class WifiRadarPlugin extends Plugin {

    private static final String PREFS = "wifi_radar_prefs";
    private static final String KEY_REGISTRY = "registry";
    private static final String KEY_TRAIL = "trail";
    private static final String KEY_TRAIL_RUNNING = "trail_running";
    private static final String KEY_TRAIL_INTERVAL = "trail_interval";
    private static final String KEY_LAST_POINT_AT = "last_point_at";

    private static final long REGISTRY_TTL_MS = 14L * 24 * 60 * 60 * 1000; // 14 dias
    private static final int REGISTRY_MAX = 400;
    private static final int TRAIL_MAX_POINTS = 80;
    private static final long TRAIL_TTL_MS = 24 * 60 * 60 * 1000L; // 24h
    private static final long SCAN_WAIT_MS = 3_500;               // espera pela janela de scan
    private static final long MIN_INTERVAL_MS = 15_000;           // intervalo mínimo do rastro
    private static final int MAX_NETS_PER_POINT = 25;

    private final Handler handler = new Handler(Looper.getMainLooper());
    private WifiManager wifi;
    private boolean scanPending = false;
    private PluginCall pendingScanCall = null;

    // rastro automático
    private volatile boolean trailRunning = false;
    private long trailIntervalMs = 60_000;
    private Location trailLastLocation;

    // ══════════════════════════════════════════════════════════════════════
    // Scan pontual (radar na app)
    // ══════════════════════════════════════════════════════════════════════

    /**
     * scanNow — dispara um scan Wi-Fi fresco (best-effort: o Android limita a
     * 4 arranques/2 min) e devolve TODAS as redes visíveis (cache recente +
     * novas). Actualiza o registo e emite eventos "wifiNetwork" ao vivo.
     */
    @PluginMethod
    public void scanNow(PluginCall call) {
        if (!hasWifiPermissions()) {
            call.reject("Permissões de localização/Wi-Fi em falta (pedido na app)");
            return;
        }
        WifiManager wm = getWifi();
        if (wm == null) {
            call.reject("Wi-Fi indisponível neste aparelho");
            return;
        }
        if (!wm.isWifiEnabled()) {
            call.reject("Wi-Fi desligado — ligue-o para escanear as redes próximas");
            return;
        }
        if (scanPending) {
            call.reject("Já há um scan em curso");
            return;
        }

        scanPending = true;
        pendingScanCall = call;

        try {
            registerReceiver();
            // startScan é best-effort (throttle do SO devolve false) — mesmo
            // assim getScanResults() traz a cache recente do sistema
            @SuppressWarnings("UnusedReturnValue") boolean ok = wm.startScan();
        } catch (SecurityException se) {
            scanPending = false;
            pendingScanCall = null;
            call.reject("Permissões Wi-Fi recusadas");
            return;
        } catch (Exception e) {
            scanPending = false;
            pendingScanCall = null;
            call.reject("Falha ao iniciar scan: " + e.getMessage());
            return;
        }

        requestFreshLocation();

        // rede de segurança: se o broadcast não chegar em tempo, resolve
        // com o que getScanResults() tiver
        handler.postDelayed(() -> {
            if (pendingScanCall == call) {
                finishScanCall(call);
            }
        }, SCAN_WAIT_MS);
    }

    /** Receiver do scan — resolve o call pendente com os resultados. */
    private final BroadcastReceiver scanReceiver = new BroadcastReceiver() {
        @Override
        public void onReceive(Context context, Intent intent) {
            if (WifiManager.SCAN_RESULTS_AVAILABLE_ACTION.equals(intent.getAction())) {
                PluginCall call = pendingScanCall;
                if (call != null) finishScanCall(call);
            }
        }
    };

    private boolean receiverRegistered = false;

    private void registerReceiver() {
        if (receiverRegistered) return;
        try {
            IntentFilter f = new IntentFilter(WifiManager.SCAN_RESULTS_AVAILABLE_ACTION);
            if (Build.VERSION.SDK_INT >= 33) {
                getContext().registerReceiver(scanReceiver, f, Context.RECEIVER_NOT_EXPORTED);
            } else {
                getContext().registerReceiver(scanReceiver, f);
            }
            receiverRegistered = true;
        } catch (Exception ignored) {
        }
    }

    private void finishScanCall(PluginCall call) {
        scanPending = false;
        pendingScanCall = null;
        try {
            List<ScanResult> results = safeScanResults();
            long now = System.currentTimeMillis();
            JSONArray nets = new JSONArray();
            for (ScanResult r : results) {
                JSONObject net = buildNetworkJson(r, now);
                nets.put(net);
                JSObject ev = new JSObject();
                ev.put("network", new JSObject(net.toString()));
                notifyListeners("wifiNetwork", ev);
            }
            updateRegistry(results, now);

            JSObject res = new JSObject();
            res.put("found", results.size());
            res.put("networks", new JSArray(nets.toString()));
            call.resolve(res);
        } catch (Exception e) {
            call.reject("Falha ao ler resultados: " + e.getMessage());
        }
    }

    /** getNetworks — lê a cache recente SEM disparar scan (barato). */
    @PluginMethod
    public void getNetworks(PluginCall call) {
        if (!hasWifiPermissions()) {
            call.reject("Permissões em falta");
            return;
        }
        try {
            long now = System.currentTimeMillis();
            List<ScanResult> results = safeScanResults();
            updateRegistry(results, now);
            JSONArray nets = new JSONArray();
            for (ScanResult r : results) nets.put(buildNetworkJson(r, now));
            JSObject res = new JSObject();
            res.put("found", results.size());
            res.put("networks", new JSArray(nets.toString()));
            call.resolve(res);
        } catch (Exception e) {
            call.reject("Falha: " + e.getMessage());
        }
    }

    // ══════════════════════════════════════════════════════════════════════
    // Registo persistente (registry)
    // ══════════════════════════════════════════════════════════════════════

    @PluginMethod
    public void getRegistry(PluginCall call) {
        try {
            JSONArray reg = loadRegistryJson();
            JSObject res = new JSObject();
            res.put("entries", new JSArray(reg.toString()));
            res.put("count", reg.length());
            call.resolve(res);
        } catch (Exception e) {
            call.reject("Falha ao ler registo: " + e.getMessage());
        }
    }

    @PluginMethod
    public void clearRegistry(PluginCall call) {
        getContext().getSharedPreferences(PREFS, Context.MODE_PRIVATE)
                .edit().remove(KEY_REGISTRY).apply();
        call.resolve();
    }

    /** Carrega o registo persistido (JSON array por BSSID). */
    private JSONArray loadRegistryJson() {
        try {
            String raw = getContext().getSharedPreferences(PREFS, Context.MODE_PRIVATE)
                    .getString(KEY_REGISTRY, null);
            return raw == null ? new JSONArray() : new JSONArray(raw);
        } catch (Exception e) {
            return new JSONArray();
        }
    }

    /** Mapa BSSID → entrada do registo (ordem de inserção preservada). */
    private LinkedHashMap<String, JSONObject> registryMap() {
        LinkedHashMap<String, JSONObject> map = new LinkedHashMap<>();
        JSONArray reg = loadRegistryJson();
        for (int i = 0; i < reg.length(); i++) {
            JSONObject o = reg.optJSONObject(i);
            if (o != null) {
                String b = o.optString("bssid", "");
                if (!b.isEmpty()) map.put(b, o);
            }
        }
        return map;
    }

    /** Funde os resultados do scan no registo (1.ª vez / última vez / sinal). */
    private void updateRegistry(List<ScanResult> results, long now) {
        if (results == null || results.isEmpty()) return;
        try {
            LinkedHashMap<String, JSONObject> map = registryMap();
            Location loc = lastKnownLocation();
            boolean changed = false;

            for (ScanResult r : results) {
                if (r.BSSID == null || r.BSSID.isEmpty()) continue;
                JSONObject e = map.get(r.BSSID);
                if (e == null) {
                    e = new JSONObject();
                    e.put("bssid", r.BSSID);
                    e.put("ssid", safeSsid(r));
                    e.put("sec", securityOf(r));
                    e.put("freq", r.frequency);
                    e.put("firstSeen", now);
                    e.put("seen", 0);
                    if (loc != null) {
                        e.put("lat", loc.getLatitude());
                        e.put("lng", loc.getLongitude());
                    }
                    map.put(r.BSSID, e);
                    changed = true;
                }
                e.put("lastSeen", now);
                e.put("seen", e.optInt("seen", 0) + 1);
                if (r.level > e.optInt("rssi", -127)) e.put("rssi", r.level);
                String sec = securityOf(r);
                if (!sec.equals(e.optString("sec", ""))) e.put("sec", sec);
                String ssid = safeSsid(r);
                if (!ssid.equals(e.optString("ssid", ""))) e.put("ssid", ssid);
            }

            if (!changed && map.size() <= REGISTRY_MAX) {
                persistRegistry(map);
                return;
            }

            // poda: TTL + cap duro (mais antigas primeiro)
            long cutoff = now - REGISTRY_TTL_MS;
            ArrayList<JSONObject> list = new ArrayList<>(map.values());
            ArrayList<JSONObject> keep = new ArrayList<>();
            for (JSONObject o : list) {
                if (o.optLong("lastSeen", 0) >= cutoff) keep.add(o);
            }
            Collections.sort(keep, (a, b) -> Long.compare(b.optLong("lastSeen", 0), a.optLong("lastSeen", 0)));
            while (keep.size() > REGISTRY_MAX) keep.remove(keep.size() - 1);

            JSONArray out = new JSONArray();
            for (JSONObject o : keep) out.put(o);
            getContext().getSharedPreferences(PREFS, Context.MODE_PRIVATE)
                    .edit().putString(KEY_REGISTRY, out.toString()).apply();
        } catch (Exception ignored) {
        }
    }

    private void persistRegistry(LinkedHashMap<String, JSONObject> map) {
        try {
            JSONArray out = new JSONArray();
            for (JSONObject o : map.values()) out.put(o);
            getContext().getSharedPreferences(PREFS, Context.MODE_PRIVATE)
                    .edit().putString(KEY_REGISTRY, out.toString()).apply();
        } catch (Exception ignored) {
        }
    }

    // ══════════════════════════════════════════════════════════════════════
    // Rastro automático (pontos GPS + redes Wi-Fi + torres celulares)
    // ══════════════════════════════════════════════════════════════════════

    @PluginMethod
    public void startTrail(PluginCall call) {
        Integer intervalSec = call.getInt("intervalSec", 60);
        long interval = (intervalSec == null ? 60 : intervalSec) * 1000L;
        trailIntervalMs = Math.max(interval, MIN_INTERVAL_MS);

        if (!hasWifiPermissions()) {
            call.reject("Permissões de localização em falta");
            return;
        }

        trailRunning = true;
        getContext().getSharedPreferences(PREFS, Context.MODE_PRIVATE)
                .edit()
                .putBoolean(KEY_TRAIL_RUNNING, true)
                .putLong(KEY_TRAIL_INTERVAL, trailIntervalMs)
                .apply();

        // 1.º ponto imediatamente
        handler.post(this::trailCycle);
        call.resolve();
    }

    @PluginMethod
    public void stopTrail(PluginCall call) {
        trailRunning = false;
        getContext().getSharedPreferences(PREFS, Context.MODE_PRIVATE)
                .edit().putBoolean(KEY_TRAIL_RUNNING, false).apply();
        call.resolve();
    }

    /** Um ciclo do rastro: GPS → snapshot Wi-Fi + celular → ponto no histórico. */
    private void trailCycle() {
        if (!trailRunning) return;
        captureTrailPoint();
        handler.postDelayed(this::trailCycle, trailIntervalMs);
    }

    @SuppressLint("MissingPermission")
    private void captureTrailPoint() {
        if (!hasWifiPermissions()) return;
        WifiManager wm = getWifi();
        if (wm == null) return;

        long pointAt = System.currentTimeMillis();
        requestFreshLocation();

        // best-effort: pede scan fresco (throttle do SO pode recusar — a
        // cache recente do sistema continua válida)
        try {
            if (wm.isWifiEnabled()) registerReceiver(); // receiver resolve trail? não — só lê cache
            if (wm.isWifiEnabled()) wm.startScan();
        } catch (Exception ignored) {
        }

        handler.postDelayed(() -> {
            if (!trailRunning) return;
            saveTrailPoint(pointAt);
        }, 2_500);
    }

    private void saveTrailPoint(long pointAt) {
        try {
            WifiManager wm = getWifi();
            if (wm == null) return;
            List<ScanResult> results = safeScanResults();
            updateRegistry(results, pointAt);

            JSONObject point = new JSONObject();
            point.put("t", pointAt);

            Location loc = trailLastLocation != null ? trailLastLocation : lastKnownLocation();
            if (loc != null) {
                point.put("lat", loc.getLatitude());
                point.put("lng", loc.getLongitude());
                if (loc.hasAccuracy()) point.put("acc", Math.round(loc.getAccuracy()));
            }

            // redes Wi-Fi ordenadas por sinal (mais fortes primeiro)
            JSONArray nets = new JSONArray();
            java.util.HashSet<String> unique = new java.util.HashSet<>();
            ArrayList<ScanResult> sorted = new ArrayList<>(results);
            Collections.sort(sorted, (a, b) -> Integer.compare(b.level, a.level));
            for (ScanResult r : sorted) {
                if (nets.length() >= MAX_NETS_PER_POINT) break;
                if (r.BSSID != null && !r.BSSID.isEmpty()) unique.add(r.BSSID);
                JSONObject n = new JSONObject();
                n.put("b", r.BSSID);
                n.put("s", safeSsid(r));
                n.put("r", r.level);
                n.put("f", r.frequency);
                n.put("sec", securityOf(r));
                nets.put(n);
            }
            point.put("w", nets);
            point.put("n", nets.length());
            point.put("u", unique.size());

            // torres celulares visíveis (resumo compacto)
            JSONArray cells = buildCellJson();
            point.put("c", cells);
            point.put("cc", cells.length());

            // anexa ao histórico
            JSONArray trail = loadTrailJson();
            JSONArray newTrail = new JSONArray();
            for (int i = 0; i < trail.length(); i++) newTrail.put(trail.get(i));
            newTrail.put(point);
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
                    .putString(KEY_TRAIL, newTrail.toString())
                    .putLong(KEY_LAST_POINT_AT, pointAt)
                    .apply();

            JSObject ev = new JSObject();
            ev.put("point", new JSObject(point.toString()));
            notifyListeners("netTrailPoint", ev);
        } catch (Exception ignored) {
        }
    }

    private JSONArray loadTrailJson() {
        try {
            String raw = getContext().getSharedPreferences(PREFS, Context.MODE_PRIVATE)
                    .getString(KEY_TRAIL, null);
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

    @PluginMethod
    public void trailStatus(PluginCall call) {
        try {
            JSONArray trail = loadTrailJson();
            JSObject r = new JSObject();
            r.put("running", trailRunning);
            r.put("points", trail.length());
            r.put("lastPointAt", getContext().getSharedPreferences(PREFS, Context.MODE_PRIVATE)
                    .getLong(KEY_LAST_POINT_AT, 0L));
            r.put("intervalSec", (int) (trailIntervalMs / 1000));
            call.resolve(r);
        } catch (Exception e) {
            call.reject("Falha: " + e.getMessage());
        }
    }

    @PluginMethod
    public void clearTrail(PluginCall call) {
        getContext().getSharedPreferences(PREFS, Context.MODE_PRIVATE)
                .edit().remove(KEY_TRAIL).putLong(KEY_LAST_POINT_AT, 0L).apply();
        call.resolve();
    }

    // ══════════════════════════════════════════════════════════════════════
    // Ligação actual + rede móvel (operadora/torres)
    // ══════════════════════════════════════════════════════════════════════

    /** getWifiInfo — dados da ligação Wi-Fi actual (se existir). */
    @SuppressLint("MissingPermission")
    @PluginMethod
    public void getWifiInfo(PluginCall call) {
        try {
            WifiManager wm = getWifi();
            JSObject res = new JSObject();
            if (wm == null || !wm.isWifiEnabled()) {
                res.put("connected", false);
                call.resolve(res);
                return;
            }
            @SuppressLint("MissingPermission") WifiInfo info = wm.getConnectionInfo();
            if (info == null || info.getNetworkId() == -1) {
                res.put("connected", false);
                res.put("wifiEnabled", true);
                call.resolve(res);
                return;
            }
            res.put("connected", true);
            res.put("ssid", safeSsidFromQuoted(info.getSSID()));
            res.put("bssid", hasWifiPermissions() ? info.getBSSID() : null);
            res.put("rssi", info.getRssi());
            res.put("frequency", info.getFrequency());
            res.put("linkSpeedMbps", info.getLinkSpeed());
            call.resolve(res);
        } catch (SecurityException se) {
            JSObject res = new JSObject();
            res.put("connected", false);
            res.put("error", "Permissões em falta");
            call.resolve(res);
        } catch (Exception e) {
            call.reject("Falha: " + e.getMessage());
        }
    }

    /** getCellInfo — operadora + torres celulares visíveis (testemunhas GSM/LTE/5G). */
    @SuppressLint("MissingPermission")
    @PluginMethod
    public void getCellInfo(PluginCall call) {
        try {
            JSObject res = new JSObject();
            TelephonyManager tm = (TelephonyManager) getContext().getSystemService(Context.TELEPHONY_SERVICE);
            if (tm == null) {
                res.put("operator", null);
                res.put("towers", new JSArray());
                call.resolve(res);
                return;
            }
            String opName = tm.getNetworkOperatorName();
            String opCode = tm.getNetworkOperator(); // MCC+MNC
            res.put("operator", (opName == null || opName.isEmpty()) ? null : opName);
            if (opCode != null && opCode.length() >= 5) {
                res.put("mcc", opCode.substring(0, 3));
                res.put("mnc", opCode.substring(3));
            }
            res.put("towers", buildCellJson());
            call.resolve(res);
        } catch (SecurityException se) {
            call.reject("Permissão de localização em falta para info celular");
        } catch (Exception e) {
            call.reject("Falha: " + e.getMessage());
        }
    }

    /** Lista compacta das torres celulares visíveis (JSON). */
    @SuppressLint("MissingPermission")
    private JSONArray buildCellJson() {
        JSONArray out = new JSONArray();
        try {
            TelephonyManager tm = (TelephonyManager) getContext().getSystemService(Context.TELEPHONY_SERVICE);
            if (tm == null) return out;
            if (getContext().checkSelfPermission(Manifest.permission.ACCESS_FINE_LOCATION)
                    != PackageManager.PERMISSION_GRANTED) return out;
            List<CellInfo> cells = tm.getAllCellInfo();
            if (cells == null) return out;
            int max = 0;
            for (CellInfo ci : cells) {
                if (max >= 8) break;
                if (!ci.isRegistered()) continue;
                JSONObject o = new JSONObject();
                if (ci instanceof CellInfoLte) {
                    CellInfoLte lte = (CellInfoLte) ci;
                    o.put("type", "LTE");
                    if (lte.getCellIdentity() != null) {
                        o.put("cid", lte.getCellIdentity().getCi());
                        o.put("tac", lte.getCellIdentity().getTac());
                        o.put("pci", lte.getCellIdentity().getPci());
                    }
                    CellSignalStrengthLte s = lte.getCellSignalStrength();
                    if (s != null) o.put("dbm", s.getDbm());
                } else if (ci instanceof CellInfoGsm) {
                    CellInfoGsm gsm = (CellInfoGsm) ci;
                    o.put("type", "GSM");
                    if (gsm.getCellIdentity() != null) {
                        o.put("cid", gsm.getCellIdentity().getCid());
                        o.put("lac", gsm.getCellIdentity().getLac());
                    }
                    CellSignalStrengthGsm s = gsm.getCellSignalStrength();
                    if (s != null) o.put("dbm", s.getDbm());
                } else if (ci instanceof CellInfoWcdma) {
                    CellInfoWcdma w = (CellInfoWcdma) ci;
                    o.put("type", "WCDMA");
                    if (w.getCellIdentity() != null) {
                        o.put("cid", w.getCellIdentity().getCid());
                        o.put("lac", w.getCellIdentity().getLac());
                    }
                    CellSignalStrengthWcdma s = w.getCellSignalStrength();
                    if (s != null) o.put("dbm", s.getDbm());
                } else if (ci instanceof CellInfoNr && Build.VERSION.SDK_INT >= 29) {
                    CellInfoNr nr = (CellInfoNr) ci;
                    o.put("type", "5G");
                    if (nr.getCellIdentity() != null) {
                        o.put("nci", nr.getCellIdentity().getNci());
                        o.put("tac", nr.getCellIdentity().getTac());
                    }
                    CellSignalStrengthNr s = nr.getCellSignalStrength();
                    if (s != null) o.put("dbm", s.getDbm());
                } else if (ci instanceof CellInfoCdma) {
                    CellInfoCdma cdma = (CellInfoCdma) ci;
                    o.put("type", "CDMA");
                    CellSignalStrengthCdma s = cdma.getCellSignalStrength();
                    if (s != null) o.put("dbm", s.getDbm());
                } else if (ci instanceof CellInfoTdscdma) {
                    continue;
                } else {
                    continue;
                }
                o.put("ts", ci.getTimeStamp());
                out.put(o);
                max++;
            }
        } catch (Exception ignored) {
        }
        return out;
    }

    // ══════════════════════════════════════════════════════════════════════
    // Permissões
    // ══════════════════════════════════════════════════════════════════════

    @PluginMethod
    public void hasPermissions(PluginCall call) {
        JSObject r = new JSObject();
        r.put("granted", hasWifiPermissions());
        WifiManager wm = getWifi();
        r.put("wifiEnabled", wm != null && wm.isWifiEnabled());
        r.put("locationOn", isLocationOn());
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
            java.util.ArrayList<String> perms = new java.util.ArrayList<>();
            perms.add(Manifest.permission.ACCESS_FINE_LOCATION);
            if (Build.VERSION.SDK_INT >= 33) perms.add(Manifest.permission.NEARBY_WIFI_DEVICES);
            perms.add(Manifest.permission.ACCESS_COARSE_LOCATION);
            androidx.core.app.ActivityCompat.requestPermissions(activity,
                    perms.toArray(new String[0]), 4116);
            call.resolve();
        } catch (Exception e) {
            call.reject("Falha ao pedir permissões: " + e.getMessage());
        }
    }

    private boolean hasWifiPermissions() {
        Context ctx = getContext();
        boolean fine = ctx.checkSelfPermission(Manifest.permission.ACCESS_FINE_LOCATION)
                == PackageManager.PERMISSION_GRANTED;
        if (Build.VERSION.SDK_INT >= 33) {
            boolean nearby = ctx.checkSelfPermission(Manifest.permission.NEARBY_WIFI_DEVICES)
                    == PackageManager.PERMISSION_GRANTED;
            return fine || nearby;
        }
        return fine;
    }

    private boolean isLocationOn() {
        try {
            LocationManager lm = (LocationManager) getContext().getSystemService(Context.LOCATION_SERVICE);
            return lm != null && (lm.isProviderEnabled(LocationManager.GPS_PROVIDER)
                    || lm.isProviderEnabled(LocationManager.NETWORK_PROVIDER));
        } catch (Exception e) {
            return false;
        }
    }

    private WifiManager getWifi() {
        if (wifi == null) {
            wifi = (WifiManager) getContext().getApplicationContext().getSystemService(Context.WIFI_SERVICE);
        }
        return wifi;
    }

    /** getScanResults() seguro — devolve lista vazia em vez de lançar. */
    private List<ScanResult> safeScanResults() {
        try {
            WifiManager wm = getWifi();
            if (wm == null || !hasWifiPermissions()) return new ArrayList<>();
            List<ScanResult> results = wm.getScanResults();
            return results != null ? results : new ArrayList<>();
        } catch (SecurityException se) {
            return new ArrayList<>();
        } catch (Exception e) {
            return new ArrayList<>();
        }
    }

    // ══════════════════════════════════════════════════════════════════════
    // Localização (GPS para registo/rastro)
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
    // Extracção de dados de um ScanResult Wi-Fi
    // ══════════════════════════════════════════════════════════════════════

    /** JSObject com TODOS os dados úteis de uma rede Wi-Fi visível. */
    static JSONObject buildNetworkJson(ScanResult r, long now) throws Exception {
        JSONObject o = new JSONObject();
        o.put("bssid", r.BSSID != null ? r.BSSID : "");
        o.put("ssid", safeSsid(r));
        o.put("rssi", r.level);
        o.put("freq", r.frequency);
        o.put("ch", channelOf(r.frequency));
        o.put("band", bandOf(r.frequency));
        o.put("sec", securityOf(r));
        o.put("ts", now);

        // capacidades extra
        StringBuilder extra = new StringBuilder();
        if (r.capabilities != null) {
            if (r.capabilities.contains("WPS")) extra.append("WPS ");
            if (r.capabilities.contains("802.11mc") || r.capabilities.contains("FTM")) extra.append("802.11mc ");
        }
        if (Build.VERSION.SDK_INT >= 31 && r.channelWidth > 0) {
            String w = channelWidthLabel(r.channelWidth);
            if (w != null) extra.append(w);
        }
        if (extra.length() > 0) o.put("caps", extra.toString().trim());

        return o;
    }

    /** SSID seguro (null/hidden → etiqueta explícita, sem crash). */
    static String safeSsid(ScanResult r) {
        String s = r.SSID;
        if (s == null || s.trim().isEmpty()) return "<oculta>";
        return s;
    }

    static String safeSsidFromQuoted(String ssid) {
        if (ssid == null) return "<desconhecido>";
        String s = ssid;
        if (s.startsWith("\"") && s.endsWith("\"") && s.length() >= 2) {
            s = s.substring(1, s.length() - 1);
        }
        if (s.trim().isEmpty()) return "<oculta>";
        return s;
    }

    /**
     * Segurança anunciada pela rede (a partir das capabilities do scan):
     * ABERTA / WEP / WPA / WPA2 / WPA2-ENTERPRISE / WPA3 / WPA2-WPA3.
     */
    static String securityOf(ScanResult r) {
        String c = r.capabilities == null ? "" : r.capabilities.toUpperCase();
        boolean eap = c.contains("EAP");
        boolean sae = c.contains("SAE") || c.contains("WPA3");
        boolean rsn = c.contains("RSN") || c.contains("WPA2");
        boolean wpa = c.contains("WPA");
        boolean wep = c.contains("WEP");
        if (sae && rsn) return eap ? "WPA2/WPA3-ENTERPRISE" : "WPA2/WPA3";
        if (sae) return "WPA3";
        if (rsn) return eap ? "WPA2-ENTERPRISE" : "WPA2";
        if (wpa) return eap ? "WPA-ENTERPRISE" : "WPA";
        if (wep) return "WEP";
        return "ABERTA";
    }

    /** Canal a partir da frequência (2.4/5/6 GHz). */
    static int channelOf(int freqMhz) {
        if (freqMhz <= 0) return 0;
        if (freqMhz == 2484) return 14;
        if (freqMhz < 2484) return (freqMhz - 2407) / 5;
        if (freqMhz >= 5935 && freqMhz <= 7135) return (freqMhz - 5950) / 5;
        if (freqMhz >= 4910 && freqMhz <= 4980) return (freqMhz - 4000) / 5;
        return (freqMhz - 5000) / 5;
    }

    static String bandOf(int freqMhz) {
        if (freqMhz >= 5935) return "6 GHz";
        if (freqMhz >= 4910) return "5 GHz";
        return "2.4 GHz";
    }

    static String channelWidthLabel(int w) {
        switch (w) {
            case ScanResult.CHANNEL_WIDTH_20MHZ: return "20MHz";
            case ScanResult.CHANNEL_WIDTH_40MHZ: return "40MHz";
            case ScanResult.CHANNEL_WIDTH_80MHZ: return "80MHz";
            case ScanResult.CHANNEL_WIDTH_80MHZ_PLUS_MHZ: return "80+MHz";
            case ScanResult.CHANNEL_WIDTH_160MHZ: return "160MHz";
            default: return null;
        }
    }
}
