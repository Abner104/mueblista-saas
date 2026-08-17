-- ============================================================
-- CARPENTO — Trial de 30 días + nuevo super-admin
-- ============================================================
-- Ejecutar en Supabase SQL Editor.

-- El default de la columna solo aplica a filas nuevas hacia adelante.
-- Si schema_v2.sql ya se corrió antes, la tabla existe con el default
-- viejo (14 días) — esto lo actualiza sin tocar los trials ya en curso.
alter table public.subscriptions
  alter column trial_ends_at set default (now() + interval '30 days');

-- Recalcula el vencimiento de los trials que ya estaban en curso desde
-- antes de este cambio (quedaron guardados con la lógica vieja de 14
-- días). Solo toca cuentas todavía en 'trialing' — no afecta planes ya
-- pagados ni cancelados.
update public.subscriptions
set trial_ends_at = created_at + interval '30 days',
    updated_at = now()
where status = 'trialing';

-- ============================================================
-- Agregar super-admin: abnerdariomedina@gmail.com
-- ============================================================
-- IMPORTANTE: el usuario debe existir primero en auth.users — es decir,
-- tiene que haberse registrado al menos una vez en la app (con login o
-- registro normal) antes de correr esto.
insert into public.super_admin_users (user_id, email)
select id, email from auth.users where email = 'abnerdariomedina@gmail.com'
on conflict (user_id) do nothing;

-- Si el insert de arriba no afectó ninguna fila, es porque ese usuario
-- todavía no se registró en la app. Corré esta consulta para confirmar:
-- select id, email from auth.users where email = 'abnerdariomedina@gmail.com';
