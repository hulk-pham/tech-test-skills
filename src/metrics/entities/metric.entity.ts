import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity('metrics')
@Index(['userId', 'type', 'recordedAt', 'id'])
export class Metric {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: string;

  @Column({ name: 'user_id', type: 'varchar', length: 255 })
  userId: string;

  @Column({ type: 'varchar', length: 32 })
  type: string;

  @Column({ type: 'decimal', precision: 30, scale: 10 })
  value: string;

  @Column({ type: 'varchar', length: 32 })
  unit: string;

  @Column({ name: 'recorded_at', type: 'timestamptz' })
  recordedAt: Date;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
