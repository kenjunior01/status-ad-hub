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
 * · Toque no botão REC (v3.27.0) → com.statusads.connect://evidence → liga/
 *   desliga a gravação NATIVA de evidências (EvidenceService) — o áudio
 *   continua mesmo que fechem a app. O botão muda REC⇄PARAR conforme o
 *   estado vivo do serviço (updateAll chamado no início/fim da gravação).
 * · Toque no resto do widget → abre a app (funciona mesmo disfarçada,
 *   porque o launch intent resolve o alias activo).
 * · DINÂMICO (v3.25.0): o estado reflecte o Modo Guardião em tempo real —
 *   lê "armed" das guardian_prefs (escritas pelo PanicPlugin.setGuardian,
 *   que chama updateAll() a cada alteração). Sem actualizações periódicas:
 *   só muda quando o estado muda → zero bateria.
 * · BATERIA (v3.29.0): o estado mostra o nível da bateria ("· 78%") e, se
 *   baixa (≤20%), avisa em âmbar — a sentinela e o SOS dependem de bateria.
 *   Mantida a quente pelo AegisBatteryReceiver (ACTION_BATTERY_CHANGED),
 *   sem polling nem updatePeriodMs → continua a gastar zero bateria.
 * · ISENÇÃO DE BATERIA (v3.36.0): armado + sem isenção de optimização →
 *   sub laranja "Isente a app da bateria" — sem ela, o Android/OEM mata a
 *   sentinela quando o ecrã apaga (Xiaomi/Samsung comuns em Moçambique).
 *   Prioridade da linha: REC a gravar > bateria baixa > isenção em falta.
 */
public class AegisWidgetProvider extends AppWidgetProvider {

    private static final String SOS_URL = "com.statusads.connect://sos";
    private static final String EVIDENCE_URL = "com.statusads.connect://evidence";
    // package-visible: o AegisBatteryReceiver guarda a assinatura de bateria
    // nas mesmas prefs para não repintar o widget sem razão visível
    static final String GUARDIAN_PREFS = "guardian_prefs";
    /** Baixo limite de bateria para o aviso âmbar (igual ao alerta web, 20%). */
    static final int BATTERY_LOW_PCT = 20;
    private static final int REQ_SOS = 4021;
    private static final int REQ_OPEN = 4022;
    private static final int REQ_REC = 4023;

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

        // Bateria da sentinela (v3.29.0): nível a quente do BatteryManager.
        // Só com o Guardião armado (é a bateria da SENTINELA que importa);
        // baixa → estado âmbar + sub com o aviso (a sentinela e o SOS falham
        // se o telemóvel morrer — o widget avisa antes disso acontecer).
        int pct = readBatteryPct(context);
        boolean batteryLow = false;
        if (armed && pct >= 0) {
            batteryLow = pct <= BATTERY_LOW_PCT;
            views.setTextViewText(R.id.widget_status, "GUARDIÃO ACTIVO · " + pct + "%");
            views.setTextColor(R.id.widget_status, batteryLow ? 0xFFF59E0B : 0xFFD4AF37);
            if (batteryLow) {
                views.setTextViewText(R.id.widget_status_sub, "Bateria baixa — carregue o telemóvel");
                views.setTextColor(R.id.widget_status_sub, 0xFFFBBF24);
            }
        }

        // ISENÇÃO DE BATERIA (v3.36.0): armado + sem isenção das optimizações
        // → a sentinela corre o risco de ser morta pelo sistema/OEM quando o
        // ecrã apaga. Aviso laranja (bateria baixa tem prioridade — a sub é
        // uma linha só; tocar no widget abre a app, onde a Central do
        // Guardião pede a isenção com um toque).
        if (armed && !batteryLow && !isBatteryExempt(context)) {
            views.setTextViewText(R.id.widget_status_sub,
                    "Isente a app da bateria — a sentinela morre adormecida");
            views.setTextColor(R.id.widget_status_sub, 0xFFFB923C);
        }

        // Gravação de evidências (v3.27.0): botão REC⇄PARAR dinâmico
        boolean rec = EvidenceService.isRunning();
        if (rec) {
            // enquanto grava, o sub dá prioridade ao REC (visível de relance);
            // cor restaurada ao cinza — o aviso de bateria fica no estado
            views.setTextViewText(R.id.widget_status_sub, "REC — a gravar evidência");
            views.setTextColor(R.id.widget_status_sub, 0xFF9CA3AF);
        }
        views.setTextViewText(R.id.widget_rec_btn, rec ? "PARAR" : "REC");
        views.setTextColor(R.id.widget_rec_btn, rec ? 0xFFFCA5A5 : 0xFFD4AF37);
        views.setInt(R.id.widget_rec_btn, "setBackgroundResource",
                rec ? R.drawable.widget_rec_stop_bg : R.drawable.widget_rec_bg);

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

        // 2. Botão REC → deep link de evidências (toggle nativo start/stop)
        Intent recI = new Intent(Intent.ACTION_VIEW);
        recI.setData(Uri.parse(EVIDENCE_URL));
        recI.setComponent(new ComponentName(context, MainActivity.class));
        recI.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_SINGLE_TOP);
        PendingIntent recPi = PendingIntent.getActivity(
                context, REQ_REC, recI,
                PendingIntent.FLAG_IMMUTABLE | PendingIntent.FLAG_UPDATE_CURRENT);
        views.setOnClickPendingIntent(R.id.widget_rec_btn, recPi);

        // 3. Corpo do widget → abrir a app (respeita a camuflagem activa)
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

    /**
     * Nível de bateria actual (0–100) lido a quente do BatteryManager.
     * Devolve −1 se indisponível (o widget mantém o texto sem o nível).
     */
    private static int readBatteryPct(Context context) {
        try {
            android.os.BatteryManager bm =
                    (android.os.BatteryManager) context.getSystemService(Context.BATTERY_SERVICE);
            if (bm != null) {
                int v = bm.getIntProperty(android.os.BatteryManager.BATTERY_PROPERTY_CAPACITY);
                if (v > 0 && v <= 100) return v;
            }
        } catch (Exception ignored) {
            // OEM sem a propriedade — widget mostra o estado sem nível
        }
        return -1;
    }

    /**
     * True quando a app está isenta das optimizações de bateria (o mesmo
     * critério do PanicPlugin.batteryStatus — o utilizador concedeu via
     * REQUEST_IGNORE_BATTERY_OPTIMIZATIONS na Central do Guardião).
     */
    private static boolean isBatteryExempt(Context context) {
        try {
            android.os.PowerManager pm =
                    (android.os.PowerManager) context.getSystemService(Context.POWER_SERVICE);
            return pm != null && pm.isIgnoringBatteryOptimizations(context.getPackageName());
        } catch (Exception ignored) {
            return false;
        }
    }
}
