// Edge Function — crea un usuario Auth para un trabajador
// Requiere: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    // Verificar que quien llama es un usuario autenticado
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return new Response(JSON.stringify({ error: 'No autorizado' }), { status: 401, headers: corsHeaders });

    const { email, password, worker_id, worker_name, owner_id } = await req.json();

    if (!email || !password || !worker_id || !owner_id) {
      return new Response(JSON.stringify({ error: 'Faltan campos requeridos' }), { status: 400, headers: corsHeaders });
    }

    if (password.length < 6) {
      return new Response(JSON.stringify({ error: 'La contraseña debe tener al menos 6 caracteres' }), { status: 400, headers: corsHeaders });
    }

    // Cliente con service role para crear usuarios
    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    // Verificar que el owner_id del request coincide con el worker
    const { data: workerRow, error: workerErr } = await admin
      .from('workers')
      .select('owner_id')
      .eq('id', worker_id)
      .maybeSingle();

    if (workerErr || !workerRow || workerRow.owner_id !== owner_id) {
      return new Response(JSON.stringify({ error: 'No tenés permiso para este trabajador' }), { status: 403, headers: corsHeaders });
    }

    // Crear usuario en Auth
    const { data: newUser, error: createErr } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // no requiere confirmar email
      user_metadata: { worker_id, worker_name, owner_id, role: 'worker' },
    });

    if (createErr) {
      return new Response(JSON.stringify({ error: createErr.message }), { status: 400, headers: corsHeaders });
    }

    // Vincular user_id al worker
    await admin
      .from('workers')
      .update({ invited_user_id: newUser.user.id, email })
      .eq('id', worker_id);

    return new Response(
      JSON.stringify({ success: true, user_id: newUser.user.id }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: corsHeaders });
  }
});
