import { config } from 'dotenv';
config();

import { DataSource } from "typeorm";

// Definimos la ruta de las entidades (buscando en cualquier subcarpeta)
const entitiesPath = process.env.NODE_ENV === 'production'
    ? 'dist/**/*.entity{.ts,.js}'
    : 'src/**/*.entity{.ts,.js}';

// Usamos strings directos para evitar problemas de compatibilidad de rutas con los asteriscos
const migrationsPath = process.env.NODE_ENV === 'production'
    ? 'dist/migrations/*{.ts,.js}'
    : 'src/migrations/*{.ts,.js}';

export default new DataSource({
    // basic setup
    type: 'postgres',
    synchronize: false,
    
    migrations: [migrationsPath],
    entities: [entitiesPath],

    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT ?? '5432', 10) || 5432 ,
    database: process.env.DB_NAME, 
    username: process.env.DB_USER,
    password: process.env.DB_PASSWORD,

    // optional
    migrationsRun: false,
    migrationsTableName: "migrations",
    migrationsTransactionMode: "all",
})