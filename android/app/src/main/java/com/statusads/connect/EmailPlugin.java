package com.statusads.connect;

import android.util.Base64;

import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.io.BufferedReader;
import java.io.BufferedWriter;
import java.io.IOException;
import java.io.InputStreamReader;
import java.io.OutputStreamWriter;
import java.net.InetSocketAddress;
import java.net.Socket;
import java.text.SimpleDateFormat;
import java.util.ArrayList;
import java.util.Date;
import java.util.List;
import java.util.Locale;
import java.util.TimeZone;

import javax.net.ssl.SSLSocket;
import javax.net.ssl.SSLSocketFactory;

/**
 * EmailPlugin — Envio de email via SMTP directo (v3.12.0, "SOS por Email").
 *
 * Cliente SMTP mínimo escrito à mão (só sockets SSL — ZERO bibliotecas
 * externas tipo JavaMail). Fala com smtp.gmail.com:465 usando a
 * "Palavra-passe de aplicação" do Google (grátis, global, sem API paga).
 *
 * Vantagem sobre o SMS: o email pode levar ANEXOS — o áudio gravado no
 * SOS vai directamente para a caixa de entrada dos contactos, mais o
 * corpo detalhado com as testemunhas BT/WiFi (hashes) e localização.
 *
 * Métodos:
 *  · send({host?, port?, user, pass, to[], subject, body, attachments?[]})
 *      — envia o email (multipart/mixed quando há anexos), numa thread
 *        própria para não bloquear a UI.
 *
 * NOTA Gmail: a "pass" é uma App Password (16 caracteres) gerada em
 * myaccount.google.com/apppasswords — exige 2FA activado na conta.
 */
@CapacitorPlugin(name = "Email")
public class EmailPlugin extends Plugin {

    private static final String DEFAULT_HOST = "smtp.gmail.com";
    private static final int DEFAULT_PORT = 465;
    private static final int TIMEOUT_MS = 20_000;
    private static final String BOUNDARY = "=_statusads_sos_boundary";

    @PluginMethod
    public void send(PluginCall call) {
        final String host = call.getString("host", DEFAULT_HOST);
        final int port = call.getInt("port", DEFAULT_PORT);
        final String user = call.getString("user");
        final String pass = call.getString("pass");
        final JSArray toArray = call.getArray("to");
        final String subject = call.getString("subject");
        final String body = call.getString("body");
        final JSArray attachments = call.getArray("attachments");

        if (user == null || !user.contains("@")) { call.reject("user (conta Gmail) e obrigatorio"); return; }
        if (pass == null || pass.trim().isEmpty()) { call.reject("pass (App Password) e obrigatoria"); return; }
        if (toArray == null || toArray.length() == 0) { call.reject("to (destinatarios) e obrigatorio"); return; }
        if (subject == null || subject.isEmpty()) { call.reject("subject e obrigatorio"); return; }
        if (body == null) { call.reject("body e obrigatorio"); return; }

        // Extracção dos destinatários fora da thread (JSArray não é thread-safe)
        final List<String> recipients = new ArrayList<>();
        for (int i = 0; i < toArray.length(); i++) {
            String r = toArray.optString(i, "").trim();
            if (r.contains("@") && !recipients.contains(r)) recipients.add(r);
        }
        if (recipients.isEmpty()) { call.reject("Nenhum destinatario valido"); return; }

        final List<String[]> files = new ArrayList<>(); // {filename, mime, base64}
        if (attachments != null) {
            for (int i = 0; i < attachments.length(); i++) {
                org.json.JSONObject o = attachments.optJSONObject(i);
                if (o == null) continue;
                String b64 = o.optString("base64", "");
                if (b64.isEmpty()) continue;
                files.add(new String[]{
                        o.optString("filename", "anexo-" + (i + 1)),
                        o.optString("mime", "application/octet-stream"),
                        b64,
                });
            }
        }

        final String cleanPass = pass.replace(" ", "");

        // Rede em thread própria — PluginCall é resolvida de lá (thread-safe)
        new Thread(() -> {
            int sent = 0;
            List<String> errors = new ArrayList<>();
            try {
                sent = smtpSend(host, port, user, cleanPass, recipients, subject, body, files, errors);
                JSArray errorsArr = new JSArray();
                for (String e : errors) errorsArr.put(e);
                JSObject r = new JSObject();
                r.put("sent", sent);
                r.put("failed", recipients.size() - sent);
                r.put("errors", errorsArr);
                if (sent == 0) {
                    call.reject("SMTP falhou: " + (errors.isEmpty() ? "sem detalhe" : errors.get(0)));
                } else {
                    call.resolve(r);
                }
            } catch (Exception e) {
                errors.add(e.getMessage() == null ? "erro desconhecido" : e.getMessage());
                JSArray errorsArr2 = new JSArray();
                for (String err : errors) errorsArr2.put(err);
                JSObject r = new JSObject();
                r.put("sent", 0);
                r.put("failed", recipients.size());
                r.put("errors", errorsArr2);
                call.reject("SMTP: " + e.getMessage());
            }
        }).start();
    }

    // ── Cliente SMTP mínimo ────────────────────────────────────────────────

    private int smtpSend(String host, int port, String user, String pass,
                         List<String> recipients, String subject, String body,
                         List<String[]> attachments, List<String> errors) throws IOException {
        SSLSocketFactory factory = (SSLSocketFactory) SSLSocketFactory.getDefault();
        SSLSocket socket = (SSLSocket) factory.createSocket();
        socket.setSoTimeout(TIMEOUT_MS);
        socket.connect(new InetSocketAddress(host, port), TIMEOUT_MS);

        int sent = 0;
        List<String> accepted = new ArrayList<>();
        try (BufferedReader in = new BufferedReader(new InputStreamReader(socket.getInputStream(), "ISO-8859-1"));
             BufferedWriter out = new BufferedWriter(new OutputStreamWriter(socket.getOutputStream(), "ISO-8859-1"))) {

            expect(in, new int[]{220}, "saudacao");
            cmd(out, in, "EHLO statusads", new int[]{250}, "EHLO");

            cmd(out, in, "AUTH LOGIN", new int[]{334}, "AUTH");
            cmd(out, in, Base64.encodeToString(user.getBytes("UTF-8"), Base64.NO_WRAP), new int[]{334}, "AUTH user");
            cmd(out, in, Base64.encodeToString(pass.getBytes("UTF-8"), Base64.NO_WRAP), new int[]{235}, "AUTH pass");

            cmd(out, in, "MAIL FROM:<" + user + ">", new int[]{250}, "MAIL FROM");

            for (String rcpt : recipients) {
                try {
                    // 250 aceite; 251 (não local, será reencaminhado) também é aceite
                    cmd(out, in, "RCPT TO:<" + rcpt + ">", new int[]{250, 251}, "RCPT TO");
                    accepted.add(rcpt);
                } catch (IOException e) {
                    errors.add(rcpt + ": destinatario rejeitado");
                }
            }
            if (accepted.isEmpty()) {
                throw new IOException("Nenhum destinatario aceite pelo servidor");
            }

            cmd(out, in, "DATA", new int[]{354}, "DATA");
            writeMessage(out, user, accepted, subject, body, attachments);
            out.write(".\r\n");
            out.flush();
            expect(in, new int[]{250}, "fim de DATA");

            sent = accepted.size();
            cmd(out, in, "QUIT", new int[]{221}, "QUIT");
        } finally {
            try { socket.close(); } catch (IOException ignored) {}
        }
        return sent;
    }

    /** Envia um comando e valida a resposta (um dos códigos esperados). */
    private void cmd(BufferedWriter out, BufferedReader in, String command,
                     int[] expectCodes, String what) throws IOException {
        if (command != null) {
            out.write(command + "\r\n");
            out.flush();
        }
        expect(in, expectCodes, what);
    }

    /** Lê a resposta (multi-linha "250-..." → "250 ") e valida o código. */
    private void expect(BufferedReader in, int[] expected, String what) throws IOException {
        String line;
        int code = -1;
        while ((line = in.readLine()) != null) {
            if (line.length() >= 3 && isDigits(line.substring(0, 3))) {
                code = Integer.parseInt(line.substring(0, 3));
                boolean last = line.length() == 3 || line.charAt(3) == ' ';
                if (last) break;
            } else {
                break;
            }
        }
        boolean ok = false;
        for (int e : expected) if (code == e) ok = true;
        if (!ok) {
            StringBuilder exp = new StringBuilder();
            for (int i = 0; i < expected.length; i++) exp.append(i > 0 ? "/" : "").append(expected[i]);
            throw new IOException((what == null ? "SMTP" : what) + " -> " + code + " (esperado " + exp + ")");
        }
    }

    private boolean isDigits(String s) {
        for (char c : s.toCharArray()) if (c < '0' || c > '9') return false;
        return true;
    }

    // ── Construção da mensagem MIME ────────────────────────────────────────

    private void writeMessage(BufferedWriter out, String from, List<String> recipients,
                              String subject, String body, List<String[]> attachments) throws IOException {
        SimpleDateFormat fmt = new SimpleDateFormat("EEE, dd MMM yyyy HH:mm:ss Z", Locale.US);
        fmt.setTimeZone(TimeZone.getTimeZone("UTC"));

        out.write("From: StatusAds Connect <" + from + ">\r\n");
        StringBuilder to = new StringBuilder();
        for (int i = 0; i < recipients.size(); i++) {
            if (i > 0) to.append(", ");
            to.append(recipients.get(i));
        }
        out.write("To: " + to + "\r\n");
        out.write("Subject: =?UTF-8?B?" + Base64.encodeToString(subject.getBytes("UTF-8"), Base64.NO_WRAP) + "?=\r\n");
        out.write("Date: " + fmt.format(new Date()) + "\r\n");
        out.write("MIME-Version: 1.0\r\n");

        if (attachments.isEmpty()) {
            out.write("Content-Type: text/plain; charset=UTF-8\r\n");
            out.write("Content-Transfer-Encoding: 8bit\r\n");
            out.write("\r\n");
            writeDotStuffed(out, body);
        } else {
            out.write("Content-Type: multipart/mixed; boundary=\"" + BOUNDARY + "\"\r\n");
            out.write("\r\n");
            out.write("--" + BOUNDARY + "\r\n");
            out.write("Content-Type: text/plain; charset=UTF-8\r\n");
            out.write("Content-Transfer-Encoding: 8bit\r\n");
            out.write("\r\n");
            writeDotStuffed(out, body);
            for (String[] att : attachments) {
                out.write("\r\n--" + BOUNDARY + "\r\n");
                out.write("Content-Type: " + att[1] + "; name=\"" + sanitize(att[0]) + "\"\r\n");
                out.write("Content-Transfer-Encoding: base64\r\n");
                out.write("Content-Disposition: attachment; filename=\"" + sanitize(att[0]) + "\"\r\n");
                out.write("\r\n");
                writeBase64Wrapped(out, att[2]);
                out.write("\r\n");
            }
            out.write("\r\n--" + BOUNDARY + "--\r\n");
        }
    }

    /** Escreve o corpo aplicando dot-stuffing (linhas iniciadas por "." ganham outro "."). */
    private void writeDotStuffed(BufferedWriter out, String body) throws IOException {
        String normalised = body.replace("\r\n", "\n");
        String[] lines = normalised.split("\n", -1);
        for (String line : lines) {
            if (line.startsWith(".")) out.write(".");
            out.write(line + "\r\n");
        }
    }

    /** Escreve base64 em linhas de 76 caracteres (padrão MIME). */
    private void writeBase64Wrapped(BufferedWriter out, String b64) throws IOException {
        for (int i = 0; i < b64.length(); i += 76) {
            out.write(b64.substring(i, Math.min(b64.length(), i + 76)));
            out.write("\r\n");
        }
    }

    private String sanitize(String filename) {
        return filename.replaceAll("[^A-Za-z0-9._-]", "_");
    }
}
