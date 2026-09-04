package com.statusads.connect;

import android.content.ComponentName;
import android.content.Context;
import android.content.pm.PackageManager;

import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

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
