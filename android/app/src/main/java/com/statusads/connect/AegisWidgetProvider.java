package com.statusads.connect;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.net.Uri;
import android.widget.RemoteViews;

/**
 * AegisWidgetProvider — Widget "Aegis SOS" para o ecrã inicial (v3.24.0,
 * dinâmico desde a v3.25.0).
 *
 * · Toque no botão SOS → com.statusads.connect://sos → a mesma cadeia de
 *   pânico do Modo Guardião (contagem decrescente → contactos + SMS + GPS),
 *   exactamente como o tile dos atalhos rápidos e o atalho do ícone.
 * · Toque no resto do widget → abre a app (funciona mesmo disfarçada,
 *   porque o launch intent resolve o alias activo).
 * · DINÂMICO (v3.25.0): o estado reflecte o Modo Guardião em tempo real —
 *   lê "armed" das guardian_prefs (escritas pelo PanicPlugin.setGuardian,
 *   que chama updateAll() a cada alteração). Sem actualizações periódicas:
 *   só muda quando o estado muda → zero bateria.
 */
public class AegisWidgetProvider extends AppWidgetProvider {

    private static final String SOS_URL = "com.statusads.connect://sos";
    private static final String GUARDIAN_PREFS = "guardian_prefs";
    private static final int REQ_SOS = 4021;
    private static final int REQ_OPEN = 4022;

    @Override
    public void onUpdate(Context context, AppWidgetManager appWidgetManager, int[] appWidgetIds) {
        RemoteViews views = buildViews(context);
        for (int appWidgetId : appWidgetIds) {
            appWidgetManager.updateAppWidget(appWidgetId, views);
        }
    }

    /**
     * Actualiza TODAS as instâncias do widget — chamado pelo PanicPlugin
     * sempre que o estado do Guardião muda (armar/desarmar/opções).
     * Método estático: o plugin não precisa de instância do provider.
     */
    public static void updateAll(Context context) {
        try {
            AppWidgetManager mgr = AppWidgetManager.getInstance(context);
            if (mgr == null) return;
            ComponentName me = new ComponentName(context, AegisWidgetProvider.class);
            int[] ids = mgr.getAppWidgetIds(me);
            if (ids == null || ids.length == 0) return;
            RemoteViews views = buildViews(context);
            mgr.updateAppWidget(ids, views);
        } catch (Exception e) {
            // widget ainda não adicionado ao ecrã — ignorar
        }
    }

    /**
     * Constrói as RemoteViews com o estado actual do Guardião:
     *  · ARMADO   → "GUARDIÃO ACTIVO" dourado, sub "Protecção activa — SOS pronto"
     *  · DESARMADO → "GUARDIÃO INACTIVO" cinza, sub "Activa o Modo Guardião"
     */
    private static RemoteViews buildViews(Context context) {
        RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.aegis_widget);

        SharedPreferences prefs = context.getSharedPreferences(GUARDIAN_PREFS, Context.MODE_PRIVATE);
        boolean armed = prefs.getBoolean("armed", false);

        if (armed) {
            views.setTextViewText(R.id.widget_status, "GUARDIÃO ACTIVO");
            views.setTextColor(R.id.widget_status, 0xFFD4AF37);
            views.setTextViewText(R.id.widget_status_sub, "Protecção activa — SOS pronto");
        } else {
            views.setTextViewText(R.id.widget_status, "GUARDIÃO INACTIVO");
            views.setTextColor(R.id.widget_status, 0xFF9CA3AF);
            views.setTextViewText(R.id.widget_status_sub, "Activa o Modo Guardião");
        }

        // 1. Botão SOS → deep link do Guardião (MainActivity singleTask →
        //    onNewIntent → appUrlOpen → contagem decrescente)
        Intent sos = new Intent(Intent.ACTION_VIEW);
        sos.setData(Uri.parse(SOS_URL));
        sos.setComponent(new ComponentName(context, MainActivity.class));
        sos.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_SINGLE_TOP);
        PendingIntent sosPi = PendingIntent.getActivity(
                context, REQ_SOS, sos,
                PendingIntent.FLAG_IMMUTABLE | PendingIntent.FLAG_UPDATE_CURRENT);
        views.setOnClickPendingIntent(R.id.widget_sos_btn, sosPi);

        // 2. Corpo do widget → abrir a app (respeita a camuflagem activa)
        Intent open = context.getPackageManager().getLaunchIntentForPackage(
                context.getPackageName());
        if (open == null) {
            // fallback improvável: tenta o deep link
            open = new Intent(Intent.ACTION_VIEW);
            open.setData(Uri.parse(SOS_URL));
            open.setComponent(new ComponentName(context, MainActivity.class));
        }
        open.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_SINGLE_TOP);
        PendingIntent openPi = PendingIntent.getActivity(
                context, REQ_OPEN, open,
                PendingIntent.FLAG_IMMUTABLE | PendingIntent.FLAG_UPDATE_CURRENT);
        views.setOnClickPendingIntent(R.id.widget_root, openPi);

        return views;
    }
}
