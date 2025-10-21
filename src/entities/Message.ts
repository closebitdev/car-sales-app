import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from "typeorm";
import { User } from "./User";

@Entity()
export class Message {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: "text" })
  content!: string;

  @ManyToOne(() => User, (user) => user.sentMessages, {
    onDelete: "CASCADE",
    eager: true,
  })
  @JoinColumn({ name: "senderId" })
  sender!: User;

  @Column()
  senderId!: number;

  @ManyToOne(() => User, (user) => user.receivedMessages, {
    onDelete: "CASCADE",
    eager: true,
  })
  @JoinColumn({ name: "receiverId" })
  receiver!: User;

  @Column()
  receiverId!: number;

  @Column({ default: false })
  isRead!: boolean;

  @CreateDateColumn()
  createdAt!: Date;
}
