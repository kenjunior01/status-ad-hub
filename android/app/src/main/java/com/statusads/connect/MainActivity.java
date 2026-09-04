package com.statusads.connect;

import android.os.Bundle;
import android.view.KeyEvent;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        // Modo Guardião: ponte do pânico (sentinela 24/7, testemunhas, bateria)
        registerPlugin(PanicPlugin.class);
        // Camuflagem do launcher: troca de ícone/nome via activity-alias
        registerPlugin(DisguisePlugin.class);
        // SOS Auto-Envio: SMS local via SIM (sem API externa, funciona offline)
        registerPlugin(SmsPlugin.class);
        // SOS por Email: SMTP directo do Google (App Password) + anexo de áudio
        registerPlugin(EmailPlugin.class);
        super.onCreate(savedInstanceState);
    }

    /**
     * Volume SOS (v3.13.0): encaminha as teclas físicas de volume para o
     * DisguisePlugin — padrão UP UP DOWN DOWN = SOS silencioso, mesmo com a
     * app disfarçada. As teclas não são consumidas: o volume funciona
     * normalmente.
     */
    @Override
    public boolean dispatchKeyEvent(KeyEvent event) {
        int keyCode = event.getKeyCode();
        if ((keyCode == KeyEvent.KEYCODE_VOLUME_UP || keyCode == KeyEvent.KEYCODE_VOLUME_DOWN)
                && event.getAction() == KeyEvent.ACTION_DOWN
                && event.getRepeatCount() == 0) {
            DisguisePlugin.onVolumeKey(keyCode == KeyEvent.KEYCODE_VOLUME_DOWN);
        }
        return super.dispatchKeyEvent(event);
    }
}
