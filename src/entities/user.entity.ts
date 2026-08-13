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

  @Column({ unique: true })
  email!: string;

  // select: false -> el hash nunca viaja en un find() casual.
  // Quien lo necesita (validateUser) lo pide con un select explicito.
  @Column({ select: false })
  password!: string;

  @Column({
    name: 'reset_password_token',
    nullable: true,
    type: 'varchar',
    select: false,
  })
  resetPasswordToken!: string | null;

  @Column({
    name: 'reset_password_expires',
    type: 'timestamp',
    nullable: true,
    select: false,
  })
  resetPasswordExpires!: Date | null;

  @OneToMany(() => Notification, (notification) => notification.user)
  notifications?: Notification[];

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
