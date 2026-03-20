import { Injectable } from '@nestjs/common';
import { Readable } from 'stream';
import { type ReadableStream as NodeWebReadableStream } from 'stream/web';

import { createResumableStreamContext } from 'resumable-stream/ioredis';

import { RedisClientService } from 'src/engine/core-modules/redis-client/redis-client.service';

@Injectable()
export class AgentChatResumableStreamService {
  private streamContext: ReturnType<typeof createResumableStreamContext>;

  constructor(private readonly redisClientService: RedisClientService) {
    const redisClient = this.redisClientService.getClient();

    this.streamContext = createResumableStreamContext({
      waitUntil: (callback) => {
        void Promise.resolve(callback);
      },
      publisher: redisClient.duplicate(),
      subscriber: redisClient.duplicate(),
    });
  }

  async createResumableStream(
    streamId: string,
    streamFactory: () => ReadableStream<string>,
  ) {
    await this.streamContext.createNewResumableStream(
      streamId,
      streamFactory,
    );
  }

  async resumeExistingStreamAsNodeReadable(
    streamId: string,
  ): Promise<Readable | null> {
    const webStream =
      await this.streamContext.resumeExistingStream(streamId);

    if (!webStream) {
      return null;
    }

    return Readable.fromWeb(
      webStream as NodeWebReadableStream,
    );
  }
}
