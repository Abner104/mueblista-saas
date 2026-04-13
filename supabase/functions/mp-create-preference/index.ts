/**
 * Edge Function: mp-create-preference
 * Crea una preferencia de pago en MercadoPago y devuelve el init_point.
 *
 * Variables de entorno requeridas en Supabase Dashboard > Edge Functions:
 *   MP_ACCESS_TOKEN  — tu Access Token de MercadoPago (productivo o sandbox)
 *   APP_URL          — URL base de tu app (ej: https://carpento.vercel.app)
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req: Request) => {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { owner_id, owner_email, plan, price } = await req.json();

    if (!owner_id || !owner_email || !plan || !price) {
      return new Response(
        JSON.stringify({ error: 'Faltan parámetros requeridos' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const MP_ACCESS_TOKEN = Deno.env.get('MP_ACCESS_TOKEN');
    const APP_URL = Deno.env.get('APP_URL') || 'https://carpento.vercel.app';

    if (!MP_ACCESS_TOKEN) {
      return new Response(
        JSON.stringify({ error: 'MP_ACCESS_TOKEN no configurado' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // Construir la preferencia de MercadoPago
    const preference = {
      items: [
        {
          id: `carpento-${plan}-mensual`,
          title: `Carpento Plan Pro — Suscripción mensual`,
          description: 'Productos ilimitados, Optimizador CNC, Equipo con roles, PDF profesional',
          quantity: 1,
          currency_id: 'ARS',
          unit_price: price,
        },
      ],
      payer: {
        email: owner_email,
      },
      back_urls: {
        success: `${APP_URL}/app/billing?status=success`,
        failure: `${APP_URL}/app/billing?status=failure`,
        pending: `${APP_URL}/app/billing?status=pending`,
      },
      auto_return: 'approved',
      notification_url: `${Deno.env.get('SUPABASE_URL')}/functions/v1/mp-webhook`,
      external_reference: owner_id,
      metadata: {
        owner_id,
        owner_email,
        plan,
      },
      statement_descriptor: 'CARPENTO',
      expires: false,
    };

    // Llamar a la API de MercadoPago
    const mpResponse = await fetch('https://api.mercadopago.com/checkout/preferences', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${MP_ACCESS_TOKEN}`,
      },
      body: JSON.stringify(preference),
    });

    if (!mpResponse.ok) {
      const mpError = await mpResponse.json();
      console.error('Error MercadoPago:', mpError);
      return new Response(
        JSON.stringify({ error: 'Error al crear preferencia en MercadoPago', detail: mpError }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const mpData = await mpResponse.json();

    return new Response(
      JSON.stringify({
        init_point: mpData.init_point,
        sandbox_init_point: mpData.sandbox_init_point,
        preference_id: mpData.id,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );

  } catch (err) {
    console.error('Error en mp-create-preference:', err);
    return new Response(
      JSON.stringify({ error: err.message || 'Error interno' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});
