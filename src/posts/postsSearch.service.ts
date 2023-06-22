import { Injectable } from '@nestjs/common';
import { ElasticsearchService } from '@nestjs/elasticsearch';
import Post from './entities/post.entity';
import PostSearchBody from './types/postSearchBody.interface';

@Injectable()
export class PostsSearchService {
  index = 'posts';

  constructor(private readonly elasticsearchService: ElasticsearchService) {}

  async indexPost(post: Post) {
    return this.elasticsearchService.index<PostSearchBody>({
      index: this.index,
      document: {
        id: post.id,
        title: post.title,
        content: post.content,
        authorId: post.author.id,
      },
    });
  }

  async count(query: string, fields: string[]) {
    const { count } = await this.elasticsearchService.count({
      index: this.index,
      body: {
        query: {
          multi_match: {
            query,
            fields,
          },
        },
      },
    });
    return count;
  }

  async search(text: string, offset?: number, limit?: number, startId = 0) {
    let separateCount = 0;
    if (startId) {
      separateCount = await this.count(text, ['title', 'content']);
    }
    const { hits } = await this.elasticsearchService.search<PostSearchBody>({
      index: this.index,
      from: offset,
      size: limit,
      query: {
        bool: {
          should: {
            multi_match: {
              query: text,
              fields: ['title', 'content'],
            },
          },
          filter: {
            range: {
              id: {
                gt: startId,
              },
            },
          },
        },
      },
    });
    const count = hits.total;
    const results = hits.hits.map((item) => item._source);
    return {
      count: startId ? separateCount : count,
      results,
    };
  }

  async remove(postId: number) {
    this.elasticsearchService.deleteByQuery({
      index: this.index,
      query: {
        match: {
          id: postId,
        },
      },
    });
  }

  async update(post: Post) {
    const newDocument: PostSearchBody = {
      id: post.id,
      title: post.title,
      content: post.content,
      authorId: post?.author?.id,
    };

    const script = Object.entries(newDocument).reduce(
      (result, [key, value]) => {
        return `${result} ctx._source.${key}='${value}';`;
      },
      '',
    );

    return this.elasticsearchService.updateByQuery({
      index: this.index,
      script: {
        source: script,
      },
      query: {
        match: {
          id: post.id,
        },
      },
    });
  }
}
