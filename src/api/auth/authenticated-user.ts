/**
 * Forma de `req.user` una vez que JwtStrategy.validate() resolvió el token.
 * Es el contrato entre la estrategia de Passport, el decorador @CurrentUser()
 * y todo controller que reciba al usuario autenticado. Sin estado: solo el id.
 */
export interface AuthenticatedUser {
  id: string;
}
