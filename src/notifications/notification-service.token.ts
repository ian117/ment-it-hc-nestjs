/**
 * TypeScript borra las interfaces al compilar, asi que una interfaz no puede
 * usarse como token de inyeccion. Sin este Symbol, el controller no tiene mas
 * remedio que pedir la clase concreta -- y ahi la interfaz no invierte nada.
 */
export const NOTIFICATION_SERVICE = Symbol('NOTIFICATION_SERVICE');
