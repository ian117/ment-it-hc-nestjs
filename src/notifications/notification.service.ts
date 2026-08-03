import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Notification, NotificationStatusEnum } from '../entities/notification.entity';
import { NotificationInterface } from './notification.interface';
import { CreateNotificationDto, UpdateNotificationDto } from './dto/notification.dto';
import { NotificationDispatcherService } from './senders/notification-dispatcher.service';

@Injectable()
export class NotificationService implements NotificationInterface {
  constructor(
    @InjectRepository(Notification)
    private notificationRepo: Repository<Notification>,
    private dispatcher: NotificationDispatcherService,
  ) {}

  // async create(userId: string, dto: CreateNotificationDto): Promise<Notification> {
  //   const notification = this.notificationRepo.create({ ...dto, userId });
  //   return this.notificationRepo.save(notification);
  // }

  async create(
    userId: string,
    dto: CreateNotificationDto,
  ): Promise<Notification> {
    const notification = this.notificationRepo.create({ ...dto, userId });
    await this.notificationRepo.save(notification);

    // Carga la relación 'user' si el sender de email la necesita (notification.user?.email)
    const fullNotification = await this.notificationRepo.findOneOrFail({
      where: { id: notification.id },
      relations: { user: true },
    });

    try {
      await this.dispatcher.dispatch(fullNotification);
      fullNotification.status = NotificationStatusEnum.SENT;
      fullNotification.sentAt = new Date();
    } catch (error) {
      fullNotification.status = NotificationStatusEnum.FAILED;
    }

    return this.notificationRepo.save(fullNotification);
  }

  async findAllByUser(userId: string): Promise<Notification[]> {
    return this.notificationRepo.find({ where: { userId } });
  }

  async findOneByUser(userId: string, id: string): Promise<Notification> {
    const notification = await this.notificationRepo.findOne({
      where: { id, userId },
    });
    if (!notification) throw new NotFoundException('Notification not found');
    return notification;
  }

  async update(
    userId: string,
    id: string,
    dto: UpdateNotificationDto,
  ): Promise<Notification> {
    const notification = await this.findOneByUser(userId, id); // valida ownership, tira 404 si no es tuya
    Object.assign(notification, dto);
    return this.notificationRepo.save(notification);
  }

  async remove(userId: string, id: string): Promise<void> {
    const notification = await this.findOneByUser(userId, id);
    await this.notificationRepo.remove(notification);
  }
}