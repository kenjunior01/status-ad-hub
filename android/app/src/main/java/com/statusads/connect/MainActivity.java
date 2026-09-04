package com.statusads.connect;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        // Modo Guardião: ponte do pânico (sentinela 24/7, testemunhas, bateria)
        registerPlugin(PanicPlugin.class);
        // Camuflagem do launcher: troca de ícone/nome via activity-alias
        registerPlugin(DisguisePlugin.class);
        super.onCreate(savedInstanceState);
    }
}
