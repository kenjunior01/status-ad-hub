package com.statusads.connect;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.os.BatteryManager;

/**
 * AegisBatteryReceiver — mantém o nível de bateria do widget "Aegis SOS"
 * actualizado sem polling (v3.29.0).
 *
 * ACTION_BATTERY_CHANGED é um sticky broadcast PROTEGIDO do sistema (só o
 * sistema o pode enviar) e está isento da proibição de broadcasts
 * implícitos em segundo plano — chega a cada mudança real de bateria
 * (% ou estado de carregamento). Cada entrega repinta o widget via
 * AegisWidgetProvider.updateAll(), que lê o nível a quente do
 * BatteryManager — sem updatePeriodMs, sem alarmes, zero bateria extra.
 *
 * Optimização anti-churn: flutuações de voltagem/temperatura geram
 * entregas sem mudança visível (mesmo %, mesmo estado baixo). Uma
 * assinatura "pct+L" nas guardian_prefs evita repaint nessas entregas.
 */
public class AegisBatteryReceiver extends BroadcastReceiver {

    @Override
    public void onReceive(Context context, Intent intent) {
        if (intent == null) return;
        if (!Intent.ACTION_BATTERY_CHANGED.equals(intent.getAction())) return;
        try {
            int level = intent.getIntExtra(BatteryManager.EXTRA_LEVEL, -1);
            int scale = intent.getIntExtra(BatteryManager.EXTRA_SCALE, -1);
            int pct = (level >= 0 && scale > 0) ? Math.round(level * 100f / scale) : -1;
            boolean low = pct >= 0 && pct <= AegisWidgetProvider.BATTERY_LOW_PCT;
            String sig = (pct >= 0 ? String.valueOf(pct) : "?") + (low ? "L" : "");
            SharedPreferences prefs =
                    context.getSharedPreferences(AegisWidgetProvider.GUARDIAN_PREFS, Context.MODE_PRIVATE);
            if (sig.equals(prefs.getString("widget_battery_sig", null))) {
                return; // nada visível mudou — não repintar
            }
            prefs.edit().putString("widget_battery_sig", sig).apply();
        } catch (Exception ignored) {
            // prefs indisponíveis — segue para o repaint (é o caminho seguro)
        }
        AegisWidgetProvider.updateAll(context.getApplicationContext());
    }
}
