import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';

import { Command } from 'nest-commander';
import { DataSource, Repository } from 'typeorm';

import { ActiveOrSuspendedWorkspacesMigrationCommandRunner } from 'src/database/commands/command-runners/active-or-suspended-workspaces-migration.command-runner';
import { RunOnWorkspaceArgs } from 'src/database/commands/command-runners/workspaces-migration.command-runner';
import { WorkspaceEntity } from 'src/engine/core-modules/workspace/workspace.entity';
import { DataSourceService } from 'src/engine/metadata-modules/data-source/data-source.service';
import { GlobalWorkspaceOrmManager } from 'src/engine/twenty-orm/global-workspace-datasource/global-workspace-orm.manager';

@Command({
  name: 'upgrade:1-20:backfill-workspace-database-schema',
  description:
    'Backfill workspace.databaseSchema from dataSource.schema as part of datasource table deprecation',
})
export class BackfillWorkspaceDatabaseSchemaCommand extends ActiveOrSuspendedWorkspacesMigrationCommandRunner {
  private hasRunOnce = false;

  constructor(
    @InjectRepository(WorkspaceEntity)
    protected readonly workspaceRepository: Repository<WorkspaceEntity>,
    protected readonly twentyORMGlobalManager: GlobalWorkspaceOrmManager,
    protected readonly dataSourceService: DataSourceService,
    @InjectDataSource()
    private readonly coreDataSource: DataSource,
  ) {
    super(workspaceRepository, twentyORMGlobalManager, dataSourceService);
  }

  override async runOnWorkspace({
    options,
  }: RunOnWorkspaceArgs): Promise<void> {
    if (this.hasRunOnce) {
      return;
    }

    if (options.dryRun) {
      this.logger.log(
        'Dry run: would backfill workspace.databaseSchema from dataSource.schema',
      );

      return;
    }

    await this.coreDataSource.query(`
      UPDATE core."workspace" w
      SET "databaseSchema" = ds."schema"
      FROM core."dataSource" ds
      WHERE ds."workspaceId" = w."id"
        AND ds."schema" IS NOT NULL
        AND (w."databaseSchema" IS NULL OR w."databaseSchema" = '')
    `);

    this.hasRunOnce = true;

    this.logger.log(
      'Successfully backfilled workspace.databaseSchema from dataSource.schema',
    );
  }
}
