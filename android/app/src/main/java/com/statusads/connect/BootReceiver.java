package com.statusads.connect;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.os.Build;

/**
 * BootReceiver — religa a sentinela do Modo Guardião automaticamente.
 *
 * Cenários cobertos:
 *  · Reinício do telemóvel (BOOT_COMPLETED / QUICKBOOT_POWERON de alguns OEMs)
 *  · Actualização da própria app (MY_PACKAGE_REPLACED)
 *
 * Só arranca o GuardianService se o Guardião estava ARMADO antes (lido de
 * SharedPreferences) — o utilizador nunca perde a protecção por causa de
 * uma reinicialização ou actualização. Zero configuração.
 */
public class BootReceiver extends BroadcastReceiver {

    @Override
    public void onReceive(Context context, Intent intent) {
        String action = intent == null ? null : intent.getAction();
        if (action == null) return;

        boolean restart = Intent.ACTION_BOOT_COMPLETED.equals(action)
                || Intent.ACTION_MY_PACKAGE_REPLACED.equals(action)
                || "android.intent.action.QUICKBOOT_POWERON".equals(action);
        if (!restart) return;

        SharedPreferences prefs = context.getSharedPreferences("guardian_prefs", Context.MODE_PRIVATE);
        if (!prefs.getBoolean("armed", false)) return;

        try {
            Intent svc = new Intent(context, GuardianService.class);
            if (Build.VERSION.SDK_INT >= 26) {
                context.startForegroundService(svc);
            } else {
                context.startService(svc);
            }
        } catch (Exception e) {
            android.util.Log.w("BootReceiver", "reinicio da sentinela falhou: " + e.getMessage());
        }
    }
}
