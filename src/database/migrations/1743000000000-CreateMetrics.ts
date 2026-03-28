import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm';

export class CreateMetrics1743000000000 implements MigrationInterface {
  name = 'CreateMetrics1743000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'metrics',
        columns: [
          {
            name: 'id',
            type: 'bigint',
            isPrimary: true,
            isGenerated: true,
            generationStrategy: 'increment',
          },
          {
            name: 'user_id',
            type: 'varchar',
            length: '255',
          },
          {
            name: 'type',
            type: 'varchar',
            length: '32',
          },
          {
            name: 'value',
            type: 'decimal',
            precision: 30,
            scale: 10,
          },
          {
            name: 'unit',
            type: 'varchar',
            length: '32',
          },
          {
            name: 'recorded_at',
            type: 'timestamptz',
          },
          {
            name: 'created_at',
            type: 'timestamptz',
            default: 'now()',
          },
        ],
      }),
    );

    await queryRunner.createIndex(
      'metrics',
      new TableIndex({
        name: 'IDX_metrics_user_type_recorded_id',
        columnNames: ['user_id', 'type', 'recorded_at', 'id'],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropIndex('metrics', 'IDX_metrics_user_type_recorded_id');
    await queryRunner.dropTable('metrics');
  }
}
