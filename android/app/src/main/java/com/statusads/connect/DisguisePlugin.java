package com.statusads.connect;

import android.content.ComponentName;
import android.content.Context;
import android.content.pm.PackageManager;
import android.os.SystemClock;

import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.util.ArrayList;
import java.util.Iterator;

/**
 * DisguisePlugin — camuflagem TOTAL do launcher (v3.9.0).
 *
 * O que faltava na camuflagem: o ícone e o nome no ecrã principal. Isto é
 * impossível numa PWA e não funciona por troca de strings — a forma nativa
 * correcta é activity-alias: cada disfarce é um alias do MainActivity com
 * ícone+nome próprios, e só UM está activo de cada vez.
 *
 * apply({id}) → activa o alias escolhido e desactiva todos os outros
 * (PackageManager.setComponentEnabledSetting + DONT_KILL_APP). O launcher
 * actualiza o ícone em segundos (alguns launchers menos usados podem demorar
 * ou exigir um refresh — documentado na UI).
 *
 * A MainActivity em si NUNCA é desactivada: deep links (://sos), atalhos e
 * tile QS continuam a funcionar mesmo disfarçado.
 */
@CapacitorPlugin(name = "Disguise")
public class DisguisePlugin extends Plugin {

    /** Instância activa — usada pelo gatilho estático de teclas de volume. */
    private static DisguisePlugin instance;

    /** Buffer do padrão Volume SOS (true = DOWN, false = UP). */
    private static final ArrayList<Boolean> volumeBuffer = new ArrayList<>();
    private static long lastVolumeAt = 0L;
    private static final long VOLUME_WINDOW_MS = 3000L;

    @Override
    public void load() {
        instance = this;
    }

    /**
     * Volume SOS (v3.13.0): a MainActivity encaminha as teclas físicas de
     * volume; o padrão "UP UP DOWN DOWN" dentro de 3s dispara o evento JS
     * "volumeSos" (SOS silencioso com a app disfarçada). As teclas NÃO são
     * consumidas — o volume continua a mudar normalmente, sem pistas
     * visíveis de que é um gatilho de emergência.
     *
     * @param isDown true = KEYCODE_VOLUME_DOWN, false = KEYCODE_VOLUME_UP
     */
    public static void onVolumeKey(boolean isDown) {
        long now = SystemClock.elapsedRealtime();
        if (now - lastVolumeAt > VOLUME_WINDOW_MS) volumeBuffer.clear();
        lastVolumeAt = now;
        volumeBuffer.add(isDown);
        while (volumeBuffer.size() > 4) volumeBuffer.remove(0);
        if (volumeBuffer.size() == 4) {
            boolean[] expected = { false, false, true, true }; // UP, UP, DOWN, DOWN
            boolean pattern = true;
            for (int i = 0; i < 4; i++) {
                if (volumeBuffer.get(i) != expected[i]) { pattern = false; break; }
            }
            if (pattern) {
                volumeBuffer.clear();
                DisguisePlugin inst = instance;
                if (inst != null) inst.notifyListeners("volumeSos", new JSObject());
            }
        }
    }

    /** id → classe do alias. O id "real" é o ícone verdadeiro da app. */
    private static final String[][] ALIASES = {
            {"real",       ".LauncherReal"},
            {"calculator", ".LauncherCalculadora"},
            {"weather",    ".LauncherMeteorologia"},
            {"notes",      ".LauncherNotas"},
            {"clock",      ".LauncherRelogio"},
            {"contacts",   ".LauncherContactos"},
            {"music",      ".LauncherMusica"},
    };

    private ComponentName aliasFor(String id) {
        for (String[] a : ALIASES) {
            if (a[0].equals(id)) {
                return new ComponentName(getContext(), getContext().getPackageName() + a[1]);
            }
        }
        return null;
    }

    /** Alias activo (com estado explícito ENABLED). Devolve null = estado default (.LauncherReal). */
    private String currentAlias() {
        PackageManager pm = getContext().getPackageManager();
        for (String[] a : ALIASES) {
            ComponentName cn = new ComponentName(getContext(), getContext().getPackageName() + a[1]);
            int state = pm.getComponentEnabledSetting(cn);
            if (state == PackageManager.COMPONENT_ENABLED_STATE_ENABLED) return a[0];
        }
        return null;
    }

    @PluginMethod
    public void current(PluginCall call) {
        JSObject r = new JSObject();
        String cur = currentAlias();
        r.put("id", cur == null ? "real" : cur);
        call.resolve(r);
    }

    @PluginMethod
    public void list(PluginCall call) {
        JSArray arr = new JSArray();
        for (String[] a : ALIASES) {
            JSObject o = new JSObject();
            o.put("id", a[0]);
            arr.put(o);
        }
        JSObject r = new JSObject();
        r.put("disguises", arr);
        call.resolve(r);
    }

    @PluginMethod
    public void apply(PluginCall call) {
        String id = call.getString("id");
        if (id == null || aliasFor(id) == null) {
            call.reject("Disfarce desconhecido: " + id);
            return;
        }
        try {
            PackageManager pm = getContext().getPackageManager();
            // desactivar todos, activar o escolhido
            for (String[] a : ALIASES) {
                ComponentName cn = new ComponentName(getContext(), getContext().getPackageName() + a[1]);
                int state = a[0].equals(id)
                        ? PackageManager.COMPONENT_ENABLED_STATE_ENABLED
                        : PackageManager.COMPONENT_ENABLED_STATE_DISABLED;
                pm.setComponentEnabledSetting(cn, state, PackageManager.DONT_KILL_APP);
            }
            JSObject r = new JSObject();
            r.put("applied", id);
            call.resolve(r);
        } catch (Exception e) {
            call.reject("Falha ao aplicar disfarce: " + e.getMessage());
        }
    }
}
