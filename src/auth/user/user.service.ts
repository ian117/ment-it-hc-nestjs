import { Injectable } from '@nestjs/common';
import { UserInterface } from './user.interface';

@Injectable()
export class UserService implements UserInterface {

    constructor(){}
    
    userExist(email: string) {
        // if user email exist, return true
        // otherwise return false
        return true
    }

    signUp(email, password){
        // If  user exist already -> 409 | 403?
        
        // Register on the repository
        // return user created
    }    
    
    matchEmailPassword(email, password) {
        // Email and password do match? 
        return true
    }
    
    generatePasswordResetToken() {
        throw new Error('Method not implemented.');
    }
    
}
