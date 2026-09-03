package com.statusads.connect;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.os.SystemClock;
import android.view.KeyEvent;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/**
 * PanicPlugin — Botão de pânico físico: Power ×4 com o ecrã apagado.
 *
 * Cenário: telemóvel no bolso durante um roubo/sequestro. A vítima aperta
 * o botão power 4 vezes (padrão discreto, sem tirar o telemóvel do bolso)
 * e o plugin emite o evento "panic" para o WebView → Modo Guardião dispara
 * a contagem decrescente de SOS.
 *
 * Técnica: receiver dinâmico de ACTION_SCREEN_ON/ACTION_SCREEN_OFF.
 * Cada pressão do botão power gera exactamente um destes eventos, portanto
 * 4 eventos dentro de uma janela de 6s = 4 pressões. Padrões normais
 * (bloquear agora, acordar mais tarde) ficam de fora da janela.
 *
 * Nota: o receiver vive enquanto o processo da app estiver vivo (com o
 * Guardião armado e a app usada recentemente é o caso normal). Um serviço
 * foreground dedicado é o passo seguinte para cobertura 24/7.
 */
@CapacitorPlugin(name = "Panic")
public class PanicPlugin extends Plugin {

    private static final int REQUIRED_EVENTS = 4;
    private static final long WINDOW_MS = 6000;
    private static final int MAX_EVENTS = 16;

    private BroadcastReceiver receiver;
    private final long[] events = new long[MAX_EVENTS];
    private int eventCount = 0;

    @Override
    public void load() {
        receiver = new BroadcastReceiver() {
            @Override
            public void onReceive(Context context, Intent intent) {
                String action = intent.getAction();
                if (Intent.ACTION_SCREEN_ON.equals(action) || Intent.ACTION_SCREEN_OFF.equals(action)) {
                    registerPowerEvent();
                }
            }
        };
        IntentFilter filter = new IntentFilter();
        filter.addAction(Intent.ACTION_SCREEN_ON);
        filter.addAction(Intent.ACTION_SCREEN_OFF);
        try {
            // SCREEN_ON/OFF são system broadcasts protegidos — registo simples é seguro
            getContext().registerReceiver(receiver, filter);
        } catch (Exception e) {
            android.util.Log.w("PanicPlugin", "Não foi possível registar receiver de power: " + e.getMessage());
        }
    }

    @Override
    protected void handleOnDestroy() {
        if (receiver != null) {
            try {
                getContext().unregisterReceiver(receiver);
            } catch (Exception ignored) {
            }
            receiver = null;
        }
    }

    private synchronized void registerPowerEvent() {
        long now = SystemClock.elapsedRealtime();

        if (eventCount >= MAX_EVENTS) {
            // deslizar janela
            System.arraycopy(events, 1, events, 0, MAX_EVENTS - 1);
            eventCount = MAX_EVENTS - 1;
        }
        events[eventCount++] = now;

        // remover eventos fora da janela
        int start = 0;
        while (start < eventCount && now - events[start] > WINDOW_MS) start++;
        if (start > 0) {
            System.arraycopy(events, start, events, 0, eventCount - start);
            eventCount -= start;
        }

        if (eventCount >= REQUIRED_EVENTS) {
            eventCount = 0;
            JSObject data = new JSObject();
            data.put("source", "power");
            notifyListeners("panic", data);
        }
    }
}
