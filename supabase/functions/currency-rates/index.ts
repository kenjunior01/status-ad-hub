import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// In-memory cache (edge function cold starts refresh it)
let cachedRates: Record<string, number> | null = null;
let cacheTimestamp = 0;
const CACHE_TTL = 3600_000; // 1 hour

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const base = url.searchParams.get("base") || "USD";
    const target = url.searchParams.get("target"); // optional single target

    const now = Date.now();

    // Use cache if fresh
    if (cachedRates && (now - cacheTimestamp) < CACHE_TTL && base === "USD") {
      const rates = target ? { [target]: cachedRates[target] || null } : cachedRates;
      return new Response(JSON.stringify({ base: "USD", rates, cached: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch from frankfurter.app (free, no API key, supports 30+ currencies)
    const apiUrl = target
      ? `https://api.frankfurter.app/latest?from=${base}&to=${target}`
      : `https://api.frankfurter.app/latest?from=${base}`;

    const response = await fetch(apiUrl);
    if (!response.ok) {
      throw new Error(`Exchange rate API error: ${response.status}`);
    }

    const data = await response.json();
    const rates = data.rates as Record<string, number>;

    // Add base currency itself
    rates[base] = 1;

    // Cache if base is USD
    if (base === "USD") {
      cachedRates = rates;
      cacheTimestamp = now;
    }

    return new Response(JSON.stringify({ base, rates, date: data.date }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Currency rates error:", error);
    
    // Return fallback rates if API fails
    const fallbackRates: Record<string, number> = {
      USD: 1, BRL: 5.15, EUR: 0.92, GBP: 0.79, MZN: 63.5,
      AOA: 835, ARS: 875, MXN: 17.2, COP: 3950, PEN: 3.72, CLP: 925,
      ZAR: 18.5, NGN: 1550, KES: 155, INR: 83.5, CAD: 1.36, AUD: 1.55,
    };

    return new Response(JSON.stringify({ base: "USD", rates: fallbackRates, fallback: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
