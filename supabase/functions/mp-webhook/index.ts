/**
 * Edge Function: mp-webhook
 * Recibe notificaciones IPN de MercadoPago y actualiza el plan en la DB.
 *
 * Variables de entorno requeridas:
 *   MP_ACCESS_TOKEN        — Access Token de MercadoPago
 *   SUPABASE_URL           — URL de tu proyecto Supabase (automática en Edge Functions)
 *   SUPABASE_SERVICE_ROLE_KEY — Service role key (automática en Edge Functions)
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const topic = url.searchParams.get('topic') || url.searchParams.get('type');
    const id    = url.searchParams.get('id') || url.searchParams.get('data.id');

    // MercadoPago envía notificaciones para diferentes topics
    // Solo nos interesan los pagos aprobados
    if (!topic || !id) {
      return new Response('ok', { status: 200 });
    }

    const MP_ACCESS_TOKEN = Deno.env.get('MP_ACCESS_TOKEN');
    if (!MP_ACCESS_TOKEN) {
      console.error('MP_ACCESS_TOKEN no configurado');
      return new Response('Config error', { status: 500 });
    }

    let paymentData: any = null;

    // Obtener datos del pago desde la API de MP
    if (topic === 'payment' || topic === 'merchant_order') {
      const endpoint = topic === 'payment'
        ? `https://api.mercadopago.com/v1/payments/${id}`
        : `https://api.mercadopago.com/merchant_orders/${id}`;

      const mpRes = await fetch(endpoint, {
        headers: { 'Authorization': `Bearer ${MP_ACCESS_TOKEN}` },
      });

      if (!mpRes.ok) {
        console.error('Error consultando MP:', await mpRes.text());
        return new Response('MP error', { status: 502 });
      }

      paymentData = await mpRes.json();
    } else {
      // Topic no relevante — responder ok
      return new Response('ok', { status: 200 });
    }

    // Si el pago no está aprobado, no hacemos nada
    const status = paymentData?.status || paymentData?.order_status;
    if (status !== 'approved' && status !== 'paid') {
      console.log(`Pago con status "${status}" — ignorado`);
      return new Response('ok', { status: 200 });
    }

    // Obtener el owner_id desde external_reference o metadata
    const ownerId =
      paymentData?.external_reference ||
      paymentData?.metadata?.owner_id ||
      paymentData?.payments?.[0]?.external_reference;

    if (!ownerId) {
      console.error('No se pudo determinar owner_id del pago', paymentData);
      return new Response('No owner_id', { status: 400 });
    }

    // Calcular fecha de vencimiento (1 mes desde ahora)
    const now = new Date();
    const nextMonth = new Date(now);
    nextMonth.setMonth(nextMonth.getMonth() + 1);

    // Actualizar suscripción en Supabase con service_role (sin RLS)
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    const { error } = await supabase
      .from('subscriptions')
      .upsert(
        {
          owner_id:              ownerId,
          plan:                  'pro',
          status:                'active',
          trial_ends_at:         null,
          current_period_start:  now.toISOString(),
          current_period_end:    nextMonth.toISOString(),
          mp_payment_id:         String(paymentData.id || id),
          updated_at:            now.toISOString(),
        },
        { onConflict: 'owner_id' },
      );

    if (error) {
      console.error('Error actualizando suscripción:', error);
      return new Response('DB error', { status: 500 });
    }

    console.log(`Suscripción Pro activada para owner ${ownerId}`);
    return new Response('ok', { status: 200 });

  } catch (err) {
    console.error('Error en mp-webhook:', err);
    return new Response('Internal error', { status: 500 });
  }
});
