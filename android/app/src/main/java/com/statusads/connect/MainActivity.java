package com.statusads.connect;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        // Modo Guardião: plugin do botão de pânico físico (Power ×4)
        registerPlugin(PanicPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
