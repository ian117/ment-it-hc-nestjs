/** Tokens de inyección de los casos de uso de notificaciones. */
export const CREATE_NOTIFICATION = Symbol('CreateNotification');
export const LIST_MY_NOTIFICATIONS = Symbol('ListMyNotifications');
export const GET_MY_NOTIFICATION = Symbol('GetMyNotification');
export const REVISE_NOTIFICATION = Symbol('ReviseNotification');
export const DELETE_NOTIFICATION = Symbol('DeleteNotification');

/** Tokens de inyección de los casos de uso de auth. */
export const REGISTER_USER = Symbol('RegisterUser');
export const LOGIN = Symbol('Login');
export const GET_CURRENT_USER = Symbol('GetCurrentUser');
export const REQUEST_PASSWORD_RESET = Symbol('RequestPasswordReset');
export const CONFIRM_PASSWORD_RESET = Symbol('ConfirmPasswordReset');
