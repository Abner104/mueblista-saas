import { supabase } from './supabaseClient';

// Passkeys usan WebAuthn con autenticador de plataforma (Face ID, huella,
// Windows Hello). Se detecta soporte real, no solo la existencia de la API,
// porque un navegador puede implementar WebAuthn sin tener biometría local
// disponible (ej. desktop sin lector de huella).
export async function isPasskeySupported() {
  if (typeof window === 'undefined') return false;
  if (!window.PublicKeyCredential) return false;
  try {
    return await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
  } catch {
    return false;
  }
}

// Traduce los códigos de error de Supabase Auth para passkeys a mensajes
// entendibles. https://supabase.com/docs/guides/auth/passkeys
const ERROR_MESSAGES = {
  passkey_disabled: 'El login con huella no está habilitado para este taller.',
  too_many_passkeys: 'Llegaste al máximo de huellas registradas en esta cuenta.',
  webauthn_credential_exists: 'Este dispositivo ya tiene una huella registrada.',
  webauthn_challenge_expired: 'La solicitud expiró, intentá de nuevo.',
  email_not_confirmed: 'Confirmá tu correo antes de usar la huella.',
  phone_not_confirmed: 'Confirmá tu teléfono antes de usar la huella.',
};

export function passkeyErrorMessage(error) {
  if (!error) return '';
  return ERROR_MESSAGES[error.code] || error.message || 'No se pudo completar la operación con la huella.';
}

export async function registerPasskey() {
  return supabase.auth.registerPasskey();
}

export async function signInWithPasskey() {
  return supabase.auth.signInWithPasskey();
}

export async function listPasskeys() {
  return supabase.auth.passkey.list();
}

export async function deletePasskey(passkeyId) {
  return supabase.auth.passkey.delete({ passkeyId });
}
