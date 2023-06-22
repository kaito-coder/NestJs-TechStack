import {
  HttpException,
  HttpStatus,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CreatePostDto } from './dto/create-post.dto';
import { UpdatePostDto } from './dto/update-post.dto';
import { In, Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import Post from './entities/post.entity';
import User from 'src/users/entities/user.entity';
import { PostsSearchService } from './postsSearch.service';

@Injectable()
export class PostsService {
  constructor(
    @InjectRepository(Post)
    private postsRepository: Repository<Post>,
    private readonly postsSearchService: PostsSearchService,
  ) {}
  async create(createPostDto: CreatePostDto, user: User) {
    const newPost = await this.postsRepository.create({
      ...createPostDto,
      author: user,
    });
    await this.postsRepository.save(newPost);
    this.postsSearchService.indexPost(newPost);
    return newPost;
  }
  async searchForPosts(
    text: string,
    offset?: number,
    limit?: number,
    startId?: number,
  ) {
    const { results, count } = await this.postsSearchService.search(
      text,
      offset,
      limit,
      startId,
    );

    const ids = results.map((result) => result.id);
    if (!ids.length) {
      return {
        items: [],
        count,
      };
    }
    const items = await this.postsRepository.find({
      where: { id: In(ids) },
    });
    console.log(items);

    return {
      items,
      count,
    };
  }
  findAll() {
    return this.postsRepository.find({ relations: ['author', 'categories'] });
  }

  async findOne(id: number) {
    const post = await this.postsRepository.findOne({
      where: { id: id },
      relations: ['author'],
    });
    if (!post) {
      return new NotFoundException('post not found');
    }
    return post;
  }

  async update(id: number, updatePostDto: UpdatePostDto) {
    await this.postsRepository.update(id, updatePostDto);
    const updatedPost = await this.postsRepository.findOne({
      where: { id: id },
      relations: ['author'],
    });

    if (updatedPost) {
      await this.postsSearchService.update(updatedPost);
      return updatedPost;
    }

    throw new HttpException('Post not found', HttpStatus.NOT_FOUND);
  }

  async remove(id: number) {
    const deleteResponse = await this.postsRepository.delete(id);
    if (!deleteResponse.affected) {
      throw new HttpException('Post not found', HttpStatus.NOT_FOUND);
    }
    await this.postsSearchService.remove(id);
  }
}
