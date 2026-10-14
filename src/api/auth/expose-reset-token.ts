/**
 * Bandera de inyección: si es `true`, la respuesta de `password-reset/request`
 * incluye `resetToken` (todo entorno que no sea producción; ADR-014). La fija
 * la raíz de composición.
 */
export const EXPOSE_RESET_TOKEN = Symbol('ExposeResetToken');
