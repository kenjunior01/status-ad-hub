package com.statusads.connect;

import android.app.PendingIntent;
import android.content.ComponentName;
import android.content.Intent;
import android.net.Uri;
import android.os.Build;
import android.service.quicksettings.TileService;

/**
 * SosTileService — Tile "SOS" nos atalhos rápidos do Android (quick settings).
 *
 * O utilizador arrasta o tile "SOS" para o painel de notificações uma única
 * vez; daí em diante, DUPLA SETA PARA BAIXO + TOQUE EM SOS = pânico, mesmo
 * com a app fechada (e no ecrã de bloqueio o tile também aparece — o SOS
 * abre logo após desbloquear).
 *
 * O tile abre com.statusads.connect://sos → GuardianWatcher (via
 * @capacitor/app appUrlOpen) dispara a contagem decrescente do Guardião.
 */
public class SosTileService extends TileService {

    @Override
    public void onClick() {
        super.onClick();

        Intent sos = new Intent(Intent.ACTION_VIEW);
        sos.setData(Uri.parse("com.statusads.connect://sos"));
        sos.setComponent(new ComponentName(this, MainActivity.class));
        sos.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_SINGLE_TOP);

        try {
            if (Build.VERSION.SDK_INT >= 34) {
                PendingIntent pi = PendingIntent.getActivity(
                        this, 0, sos,
                        PendingIntent.FLAG_IMMUTABLE | PendingIntent.FLAG_UPDATE_CURRENT);
                startActivityAndCollapse(pi);
            } else {
                startActivityAndCollapse(sos);
            }
        } catch (Exception e) {
            // sem permissão para iniciar activity (ecrã bloqueado raro) — ignorar
        }
    }
}
