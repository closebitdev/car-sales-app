import { DataSource } from "typeorm";
import dotenv from "dotenv";
import path from "path";

dotenv.config();

export const AppDataSource = new DataSource({
    type: "postgres",
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT) || 5432,
    username: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    synchronize: true, // only for development
    dropSchema: false, // do NOT drop schema
    logging: false,
    entities: [path.join(__dirname, "/entities/*.ts")],
    migrations: [path.join(__dirname, "/migrations/*.ts")],
});
