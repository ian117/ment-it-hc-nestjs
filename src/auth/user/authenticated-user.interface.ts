/**
 * Forma de `req.user` una vez que JwtStrategy.validate() resolvio el token.
 * Es el contrato entre la estrategia de Passport, el decorador @CurrentUser()
 * y todo controller que reciba al usuario autenticado.
 */
export interface AuthenticatedUser {
  id: string;
  email: string;
}
