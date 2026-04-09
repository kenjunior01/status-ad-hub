import { createClient } from "https://esm.sh/@supabase/supabase-js@2.87.1";
import { corsHeaders } from "https://esm.sh/@supabase/supabase-js@2.95.0/cors";

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing auth' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const { quotation_id, conversation_id } = await req.json();

    if (!quotation_id || !conversation_id) {
      return new Response(JSON.stringify({ error: 'Missing quotation_id or conversation_id' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Get quotation
    const { data: quotation, error: qErr } = await supabase
      .from('chat_quotations')
      .select('*')
      .eq('id', quotation_id)
      .single();

    if (qErr || !quotation) {
      return new Response(JSON.stringify({ error: 'Quotation not found' }), { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Generate invoice number
    const invoiceNumber = `INV-${Date.now().toString(36).toUpperCase()}`;
    const subtotal = quotation.amount;
    const taxRate = 0; // No tax by default
    const taxAmount = subtotal * taxRate;
    const total = subtotal + taxAmount;

    // Create invoice record
    const { data: invoice, error: invErr } = await supabase
      .from('chat_invoices')
      .insert({
        conversation_id,
        quotation_id,
        created_by: user.id,
        invoice_number: invoiceNumber,
        items: [{ description: quotation.title, quantity: 1, unit_price: quotation.amount, total: quotation.amount }],
        subtotal,
        tax_amount: taxAmount,
        total,
        currency: quotation.currency,
        status: 'pending',
      })
      .select()
      .single();

    if (invErr) {
      return new Response(JSON.stringify({ error: invErr.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Send invoice message in chat
    await supabase.from('messages').insert({
      conversation_id,
      sender_id: user.id,
      content: `🧾 Factura: #${invoiceNumber} — ${quotation.currency} ${total.toFixed(2)}`,
      status: 'sent',
    });

    return new Response(JSON.stringify({ 
      success: true, 
      invoice: {
        id: invoice.id,
        invoice_number: invoiceNumber,
        total,
        currency: quotation.currency,
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
