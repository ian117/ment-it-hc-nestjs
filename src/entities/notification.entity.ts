import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index
} from 'typeorm';

import { User } from './user.entity';

export enum NotificationChannelEnum {
  EMAIL = 'email',
  SMS = 'sms',
  PUSH = 'push',
}

export enum NotificationStatusEnum {
  PENDING = 'pending',
  SENT = 'sent',
  FAILED = 'failed',
}



@Entity()
export class Notification {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index()
  @Column()
  userId!: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'userId' })
  user?: User;

  @Column()
  title!: string;

  @Column()
  content!: string;

  @Column({ type: 'enum', enum: NotificationChannelEnum })
  channel!: NotificationChannelEnum;

  @Column({ type: 'enum', enum: NotificationStatusEnum, default: NotificationStatusEnum.PENDING })
  status!: NotificationStatusEnum;

  @Column({ type: 'timestamp',nullable: true })
  sentAt!: Date | null;

  @Column({ type: 'json', nullable: true })
  metadata!: Record<string, any> | null;

  @CreateDateColumn()
  createdAt!: Date;
  
  @UpdateDateColumn()
  updatedAt!: Date;

}
