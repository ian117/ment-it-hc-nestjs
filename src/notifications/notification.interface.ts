import { Notification } from '../entities/notification.entity';
import { CreateNotificationDto, UpdateNotificationDto } from './dto/notification.dto';

export interface NotificationInterface {
  create(userId: string, dto: CreateNotificationDto): Promise<Notification>;
  findAllByUser(userId: string): Promise<Notification[]>;
  findOneByUser(userId: string, id: string): Promise<Notification>;
  update(userId: string, id: string, dto: UpdateNotificationDto): Promise<Notification>;
  remove(userId: string, id: string): Promise<void>;
}