package com.statusads.connect;

import android.os.Build;
import android.telephony.SmsManager;

import com.getcapacitor.JSObject;
import com.getcapacitor.PermissionState;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;

import org.json.JSONArray;
import org.json.JSONObject;

import java.util.ArrayList;

/**
 * SmsPlugin — Envio de SMS LOCAL (v3.11.0, "SOS Auto-Envio").
 *
 * Dispara os avisos de emergência directamente do telemóvel via SmsManager
 * do Android — SEM gateway/API externa (Twilio, Africa's Talking, etc.).
 * Usa o crédito do SIM do próprio aparelho e funciona MESMO SEM INTERNET,
 * que é exactamente quando a vítima mais precisa de ajuda.
 *
 * Métodos:
 *  · hasPermission()      — SEND_SMS já concedido?
 *  · requestPermission()  — pede a permissão (diálogo do sistema)
 *  · send({phones, message}) — envia para N números (multipart automático
 *    para mensagens >160 caracteres)
 */
@CapacitorPlugin(
    name = "Sms",
    permissions = {
        @Permission(alias = "send", strings = { android.Manifest.permission.SEND_SMS })
    }
)
public class SmsPlugin extends Plugin {

    @PluginMethod
    public void hasPermission(PluginCall call) {
        JSObject r = new JSObject();
        r.put("granted", getPermissionState("send") == PermissionState.GRANTED);
        call.resolve(r);
    }

    @PluginMethod
    public void requestPermission(PluginCall call) {
        if (getPermissionState("send") == PermissionState.GRANTED) {
            JSObject r = new JSObject();
            r.put("granted", true);
            call.resolve(r);
            return;
        }
        requestPermissionForAlias("send", call, "smsPermissionCallback");
    }

    @PermissionCallback
    private void smsPermissionCallback(PluginCall call) {
        JSObject r = new JSObject();
        r.put("granted", getPermissionState("send") == PermissionState.GRANTED);
        call.resolve(r);
    }

    /**
     * Envia a mesma mensagem para todos os números.
     * @param phones  lista de números (E.164 recomendado: +2588xxxxxxx)
     * @param message texto do alerta (multipart automático)
     */
    @PluginMethod
    public void send(PluginCall call) {
        JSONArray phonesArr = call.getArray("phones");
        String message = call.getString("message");

        if (phonesArr == null || phonesArr.length() == 0) {
            call.reject("phones e obrigatorio");
            return;
        }
        if (message == null || message.trim().isEmpty()) {
            call.reject("message e obrigatorio");
            return;
        }
        if (getPermissionState("send") != PermissionState.GRANTED) {
            call.reject("PERMISSION_REQUIRED");
            return;
        }

        SmsManager sm = getSmsManager();
        if (sm == null) {
            call.reject("SmsManager indisponivel (sem SIM ou sem app de SMS)");
            return;
        }

        int sent = 0;
        int failed = 0;
        JSONArray failures = new JSONArray();

        try {
            ArrayList<String> parts = sm.divideMessage(message);
            for (int i = 0; i < phonesArr.length(); i++) {
                String phone = phonesArr.optString(i, "").trim();
                if (phone.isEmpty()) continue;
                try {
                    if (parts.size() > 1) {
                        sm.sendMultipartTextMessage(phone, null, parts, null, null);
                    } else {
                        sm.sendTextMessage(phone, null, message, null, null);
                    }
                    sent++;
                } catch (Exception pe) {
                    failed++;
                    try {
                        JSONObject f = new JSONObject();
                        f.put("phone", phone);
                        f.put("error", pe.getMessage() == null ? "erro desconhecido" : pe.getMessage());
                        failures.put(f);
                    } catch (Exception ignored) {}
                }
            }

            JSObject r = new JSObject();
            r.put("sent", sent);
            r.put("failed", failed);
            r.put("failures", failures);
            call.resolve(r);
        } catch (Exception e) {
            call.reject("Falha ao enviar SMS: " + e.getMessage());
        }
    }

    /** SmsManager da subscrição predefinida (API 31+ via getSystemService; legado antes). */
    private SmsManager getSmsManager() {
        try {
            if (Build.VERSION.SDK_INT >= 31) {
                return getContext().getSystemService(SmsManager.class);
            }
            @SuppressWarnings("deprecation")
            SmsManager legacy = SmsManager.getDefault();
            return legacy;
        } catch (Exception e) {
            return null;
        }
    }
}
