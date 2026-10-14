import { Email } from '../../domain/email';
import { PasswordHash } from '../../domain/password-hash';
import { User } from '../../domain/user';
import { UserOrmEntity } from './user.orm.entity';

/** Traduce entre la entidad ORM y la de dominio; la ORM no sale de aquí. */
export class UserMapper {
  static toDomain(row: UserOrmEntity): User {
    return User.restore({
      id: row.id,
      email: Email.create(row.email),
      passwordHash: PasswordHash.of(row.passwordHash),
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    });
  }

  static toOrm(user: User): UserOrmEntity {
    const row = new UserOrmEntity();
    row.id = user.id;
    row.email = user.email.value;
    row.passwordHash = user.passwordHash.value;
    row.createdAt = user.createdAt;
    row.updatedAt = user.updatedAt;
    return row;
  }
}
