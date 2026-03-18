import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';

import { Repository } from 'typeorm';

import { ApplicationEntity } from 'src/engine/core-modules/application/application.entity';
import { PromiseMemoizer } from 'src/engine/twenty-orm/storage/promise-memoizer.storage';

const MEMOIZER_TTL_MS = 5_000; // 5 seconds

@Injectable()
export class ApplicationEntityLookupService {
  private readonly memoizer = new PromiseMemoizer<
    { id: string; universalIdentifier: string }[]
  >(MEMOIZER_TTL_MS);

  constructor(
    @InjectRepository(ApplicationEntity)
    private readonly applicationRepository: Repository<ApplicationEntity>,
  ) {}

  async findByWorkspaceId(
    workspaceId: string,
  ): Promise<{ id: string; universalIdentifier: string }[]> {
    const memoKey = `app-lookup-${workspaceId}` as `${string}-${string}`;

    const result = await this.memoizer.memoizePromiseAndExecute(
      memoKey,
      async () => {
        return this.applicationRepository.find({
          where: { workspaceId },
          select: ['id', 'universalIdentifier'],
          withDeleted: true,
        });
      },
    );

    return result ?? [];
  }
}
