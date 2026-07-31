import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';

import { Notification } from './notification.entity';

@Entity()
export class User {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column()
  email!: string;

  @Column()
  password!: string;

  @Column({ name: 'reset_password_token', nullable: true, type: 'varchar' })
  resetPasswordToken!: string | null;

  @Column({ name: 'reset_password_expires', type: 'timestamp', nullable: true })
  resetPasswordExpires!: Date | null;

  @OneToMany(() => Notification, (notification) => notification.user)
  notifications?: Notification[];

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}