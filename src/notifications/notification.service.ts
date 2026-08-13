import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import {
  Notification,
  NotificationStatusEnum,
} from '../entities/notification.entity';
import { NotificationInterface } from './notification.interface';
import {
  CreateNotificationDto,
  UpdateNotificationDto,
} from './dto/notification.dto';
import { NotificationDispatcherService } from './senders/notification-dispatcher.service';

@Injectable()
export class NotificationService implements NotificationInterface {
  private readonly logger = new Logger(NotificationService.name);

  constructor(
    @InjectRepository(Notification)
    private notificationRepo: Repository<Notification>,
    private dispatcher: NotificationDispatcherService,
    private dataSource: DataSource, // inyecta el DataSource completo
  ) {}

  async create(
    userId: string,
    dto: CreateNotificationDto,
  ): Promise<Notification> {
    // Fuera de la transaccion y antes de escribir nada: si el canal no acepta
    // este payload, es un 400 y la DB ni se entera.
    await this.dispatcher.validateDraft(dto);

    return this.dataSource.transaction(async (manager) => {
      const notification = manager.create(Notification, { ...dto, userId });
      await manager.save(notification);

      const fullNotification = await manager.findOneOrFail(Notification, {
        where: { id: notification.id },
        relations: { user: true },
      });

      try {
        await this.dispatcher.dispatch(fullNotification);
        fullNotification.status = NotificationStatusEnum.SENT;
        fullNotification.sentAt = new Date();
        fullNotification.errorMessage = null;
      } catch (error) {
        // El alta no se revierte: la notificacion existe y quedo en FAILED,
        // con el motivo guardado. Tragarse el error sin registrarlo dejaba
        // cero diagnostico.
        const reason = error instanceof Error ? error.message : String(error);
        this.logger.warn(
          `Envio fallido id=${fullNotification.id} channel=${fullNotification.channel}: ${reason}`,
        );
        fullNotification.status = NotificationStatusEnum.FAILED;
        fullNotification.errorMessage = reason;
      }

      return manager.save(fullNotification);
    });
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

    // Editar tampoco puede dejar la notificacion fuera de las reglas del canal
    // (ej: estirar el content de un SMS mas alla de 160).
    await this.dispatcher.validateDraft(notification);

    return this.notificationRepo.save(notification);
  }

  async remove(userId: string, id: string): Promise<void> {
    const notification = await this.findOneByUser(userId, id);
    await this.notificationRepo.remove(notification);
  }
}
