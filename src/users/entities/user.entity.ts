import { Exclude } from 'class-transformer';
import {
  Column,
  Entity,
  JoinColumn,
  OneToMany,
  OneToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import Address from './address.entity';
import Post from 'src/posts/entities/post.entity';

@Entity()
class User {
  @PrimaryGeneratedColumn()
  public id?: number;

  @Column({ unique: true })
  public email: string;

  @Column()
  public name: string;

  @Column()
  @Exclude()
  public password: string;

  @OneToOne(() => Address, (address) => address.user, {
    eager: true,
    cascade: true,
  }) // specify inverse side as a second parameter
  @JoinColumn()
  address: Address;
  @OneToMany(() => Post, (post: Post) => post.author)
  public posts: Post[];
}

export default User;
