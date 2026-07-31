export interface UserInterface {
    userExist(email): boolean
    signUp(email, password)
    matchEmailPassword(email, password): boolean  //?
    generatePasswordResetToken(email) //?
}
