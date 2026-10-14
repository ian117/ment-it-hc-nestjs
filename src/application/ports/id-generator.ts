export interface IdGenerator {
  newId(): string;
}

export const ID_GENERATOR = Symbol('IdGenerator');
