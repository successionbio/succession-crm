import { type MigrationInterface, type QueryRunner } from 'typeorm';

export class DropWorkspaceDatabaseUrlColumn1774688563000
  implements MigrationInterface
{
  name = 'DropWorkspaceDatabaseUrlColumn1774688563000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "core"."workspace" DROP COLUMN IF EXISTS "databaseUrl"`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "core"."workspace" ADD "databaseUrl" character varying NOT NULL DEFAULT ''`,
    );
  }
}
