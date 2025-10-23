import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany } from "typeorm";
import { CarImage } from "./CarImage";



@Entity()
export class Car {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  make!: string;

  @Column()
  model!: string;

  @Column()
  year!: number;

  @Column()
  mileage!: number;

  @Column()
  price!: number;

  @Column()
  fuelType!: string;

  @Column()
  transmission!: string;

  @Column()
  bodyType!: string;

  @Column({ nullable: true })
  imageUrl?: string;

  @Column({ default: true })
  available!: boolean;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  @OneToMany(() => CarImage, (img) => img.car, { cascade: true })
  images!: CarImage[];

}
