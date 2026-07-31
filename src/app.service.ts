import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getInfoAppgetHello(): string {
    return 'Server version 1';
  }
}
