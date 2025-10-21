import "reflect-metadata";
import { DataSource } from "typeorm";
import { User } from "./entities/User";
import { Car } from "./entities/Car";
import { Message } from "./entities/Message";

export const AppDataSource = new DataSource({
  type: "postgres",
  host: process.env.DB_HOST || "localhost",
  port: parseInt(process.env.DB_PORT || "5432"),
  username: process.env.DB_USER || "postgres",
  password: process.env.DB_PASSWORD || "postgres",
  database: process.env.DB_NAME || "car_sales",
  synchronize: false, // must be false for migrations
  logging: true,
  entities: [User, Car, Message],
  migrations: ["src/migrations/*.ts"],
  subscribers: [],
});
