package com.statusads.connect;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.net.Uri;
import android.widget.RemoteViews;

/**
 * AegisWidgetProvider — Widget "Aegis SOS" para o ecrã inicial (v3.24.0).
 *
 * · Toque no botão SOS → com.statusads.connect://sos → a mesma cadeia de
 *   pânico do Modo Guardião (contagem decrescente → contactos + SMS + GPS),
 *   exactamente como o tile dos atalhos rápidos e o atalho do ícone.
 * · Toque no resto do widget → abre a app (funciona mesmo disfarçada,
 *   porque o launch intent resolve o alias activo).
 *
 * Widget estático (updatePeriodMillis=0): não mostra dados voláteis,
 * só acciona — zero consumo de bateria. Nenhum dado sai do widget.
 */
public class AegisWidgetProvider extends AppWidgetProvider {

    private static final String SOS_URL = "com.statusads.connect://sos";
    private static final int REQ_SOS = 4021;
    private static final int REQ_OPEN = 4022;

    @Override
    public void onUpdate(Context context, AppWidgetManager appWidgetManager, int[] appWidgetIds) {
        for (int appWidgetId : appWidgetIds) {
            RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.aegis_widget);

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

            appWidgetManager.updateAppWidget(appWidgetId, views);
        }
    }
}
