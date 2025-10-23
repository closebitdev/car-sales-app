import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  Index,
} from "typeorm";
import { Car } from "./Car";

@Entity()
export class CarImage {
  @PrimaryGeneratedColumn()
  id!: number;

  @ManyToOne(() => Car, (car) => car.images, { onDelete: "CASCADE" })
  @Index()
  car!: Car;

  // public URL clients can load (served from /uploads)
  @Column()
  url!: string;

  @Column({ nullable: true })
  caption?: string;

  @Column({ default: false })
  isPrimary!: boolean;

  @Column({ type: "int", default: 0 })
  sortOrder!: number;

  @CreateDateColumn()
  createdAt!: Date;
}
