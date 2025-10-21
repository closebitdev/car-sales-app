import { Entity, PrimaryGeneratedColumn, ManyToOne, CreateDateColumn } from "typeorm";
import { User } from "./User";
import { Car } from "./Car";

@Entity()
export class Favorite {
  @PrimaryGeneratedColumn()
  id!: number;

  @ManyToOne(() => User, (user) => user.id, { onDelete: "CASCADE" })
  user!: User;

  @ManyToOne(() => Car, (car) => car.id, { onDelete: "CASCADE" })
  car!: Car;

  @CreateDateColumn()
  createdAt!: Date;
}
