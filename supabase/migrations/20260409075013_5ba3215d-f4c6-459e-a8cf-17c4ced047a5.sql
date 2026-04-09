
-- Platform settings for payment gateway API configuration (admin-only)
CREATE TABLE public.platform_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  setting_key text NOT NULL UNIQUE,
  setting_value jsonb NOT NULL DEFAULT '{}'::jsonb,
  category text NOT NULL DEFAULT 'payment',
  is_active boolean NOT NULL DEFAULT false,
  description text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.platform_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins full access platform_settings"
  ON public.platform_settings FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Insert default payment gateway entries
INSERT INTO public.platform_settings (setting_key, setting_value, category, is_active, description) VALUES
  ('gateway_paysuite', '{"api_key": ""}'::jsonb, 'payment', false, 'PaySuite M-Pesa (Moçambique)'),
  ('gateway_paypal', '{"client_id": "", "client_secret": ""}'::jsonb, 'payment', false, 'PayPal Internacional'),
  ('gateway_stripe', '{"secret_key": "", "publishable_key": ""}'::jsonb, 'payment', false, 'Stripe Cartão/Escrow'),
  ('gateway_multicaixa', '{"api_key": "", "merchant_id": ""}'::jsonb, 'payment', false, 'Multicaixa Express (Angola)'),
  ('gateway_mercadopago', '{"access_token": "", "public_key": ""}'::jsonb, 'payment', false, 'Mercado Pago / PIX (Brasil)');

-- Chat quotations table
CREATE TABLE public.chat_quotations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  created_by uuid NOT NULL,
  title text NOT NULL,
  description text,
  amount numeric NOT NULL,
  currency text NOT NULL DEFAULT 'USD',
  status text NOT NULL DEFAULT 'pending',
  expires_at timestamptz,
  accepted_at timestamptz,
  rejected_at timestamptz,
  message_id uuid REFERENCES public.messages(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.chat_quotations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Participants can view quotations"
  ON public.chat_quotations FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM conversations c
    WHERE c.id = chat_quotations.conversation_id
    AND (c.participant_1 = auth.uid() OR c.participant_2 = auth.uid())
  ));

CREATE POLICY "Participants can create quotations"
  ON public.chat_quotations FOR INSERT
  WITH CHECK (
    created_by = auth.uid() AND
    EXISTS (
      SELECT 1 FROM conversations c
      WHERE c.id = chat_quotations.conversation_id
      AND (c.participant_1 = auth.uid() OR c.participant_2 = auth.uid())
    )
  );

CREATE POLICY "Participants can update quotations"
  ON public.chat_quotations FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM conversations c
    WHERE c.id = chat_quotations.conversation_id
    AND (c.participant_1 = auth.uid() OR c.participant_2 = auth.uid())
  ));

-- Chat invoices table
CREATE TABLE public.chat_invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  quotation_id uuid REFERENCES public.chat_quotations(id),
  created_by uuid NOT NULL,
  invoice_number text NOT NULL,
  items jsonb NOT NULL DEFAULT '[]'::jsonb,
  subtotal numeric NOT NULL DEFAULT 0,
  tax_amount numeric NOT NULL DEFAULT 0,
  total numeric NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'USD',
  status text NOT NULL DEFAULT 'pending',
  paid_at timestamptz,
  pdf_url text,
  message_id uuid REFERENCES public.messages(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.chat_invoices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Participants can view invoices"
  ON public.chat_invoices FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM conversations c
    WHERE c.id = chat_invoices.conversation_id
    AND (c.participant_1 = auth.uid() OR c.participant_2 = auth.uid())
  ));

CREATE POLICY "Participants can create invoices"
  ON public.chat_invoices FOR INSERT
  WITH CHECK (
    created_by = auth.uid() AND
    EXISTS (
      SELECT 1 FROM conversations c
      WHERE c.id = chat_invoices.conversation_id
      AND (c.participant_1 = auth.uid() OR c.participant_2 = auth.uid())
    )
  );

CREATE POLICY "Participants can update invoices"
  ON public.chat_invoices FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM conversations c
    WHERE c.id = chat_invoices.conversation_id
    AND (c.participant_1 = auth.uid() OR c.participant_2 = auth.uid())
  ));

CREATE POLICY "Admins full access quotations"
  ON public.chat_quotations FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins full access invoices"
  ON public.chat_invoices FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));
