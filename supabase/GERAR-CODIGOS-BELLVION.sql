-- ============================================================
-- GERADOR DE CÓDIGOS DE ACTIVAÇÃO BELLVION
-- ============================================================
-- Executar no Supabase SQL Editor para gerar códigos para as caixas
-- dos dispositivos. Cada código é ÚNICO e dá acesso ao plano Bellvion.
--
-- ⚠️ Só service_role insere (RLS) — no SQL Editor funciona.
-- Ver os códigos gerados: SELECT code, device_type FROM device_activation_codes WHERE used = false;
-- ============================================================

-- 50 códigos BELLVION Glasses
INSERT INTO public.device_activation_codes (code, device_type)
SELECT 'BVG-' || upper(substr(md5(random()::text), 1, 4)) || '-' || upper(substr(md5(random()::text || g::text), 1, 4)),
       'glasses'
FROM generate_series(1, 50) g;

-- 50 códigos BELLVION Watch
INSERT INTO public.device_activation_codes (code, device_type)
SELECT 'BVW-' || upper(substr(md5(random()::text), 1, 4)) || '-' || upper(substr(md5(random()::text || g::text), 1, 4)),
       'watch'
FROM generate_series(1, 50) g;

-- 50 códigos BELLVION Buds
INSERT INTO public.device_activation_codes (code, device_type)
SELECT 'BVB-' || upper(substr(md5(random()::text), 1, 4)) || '-' || upper(substr(md5(random()::text || g::text), 1, 4)),
       'earbuds'
FROM generate_series(1, 50) g;

-- 50 códigos BELLVION Tracker
INSERT INTO public.device_activation_codes (code, device_type)
SELECT 'BVT-' || upper(substr(md5(random()::text), 1, 4)) || '-' || upper(substr(md5(random()::text || g::text), 1, 4)),
       'tracker'
FROM generate_series(1, 50) g;

-- (Opcional) Limpar códigos de teste anteriores:
-- DELETE FROM public.device_activation_codes WHERE used = false AND created_at < now() - interval '90 days';
