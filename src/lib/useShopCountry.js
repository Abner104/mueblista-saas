import { useEffect, useState } from 'react';
import { supabase } from './supabaseClient';
import { useAuthStore } from '../store/authStore';
import { useRoleStore } from '../store/roleStore';
import { DEFAULT_COUNTRY_CODE } from './countries';

// Resuelve el país del taller para usar con formatCurrency/formatDate.
// No es lo mismo que el userId logueado: un trabajador (maestro/vendedor)
// tiene su propio auth.uid(), así que hay que consultar shop_config con
// el owner_id del taller (roleStore.ownerId), no con el suyo.
export function useShopCountry() {
  const user = useAuthStore((s) => s.user);
  const { ownerId, worker } = useRoleStore();
  const [country, setCountry] = useState(DEFAULT_COUNTRY_CODE);

  useEffect(() => {
    const targetOwnerId = worker ? ownerId : user?.id;
    if (!targetOwnerId) return;

    supabase
      .from('shop_config')
      .select('country')
      .eq('owner_id', targetOwnerId)
      .maybeSingle()
      .then(({ data }) => setCountry(data?.country || DEFAULT_COUNTRY_CODE));
  }, [user?.id, ownerId, worker]);

  return country;
}
