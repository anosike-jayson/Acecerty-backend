import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';

/**
 * Shared TypeORM options builder used both by the Nest module (async factory)
 * and the standalone DataSource used by the CLI / seed script.
 */
export function buildTypeOrmOptions(cfg: {
  host: string;
  port: number;
  username: string;
  password: string;
  name: string;
  synchronize: boolean;
  logging: boolean;
}): TypeOrmModuleOptions {
  // Normalize to forward slashes so the entity glob matches on Windows too.
  const root = __dirname.replace(/\\/g, '/');
  return {
    type: 'postgres',
    host: cfg.host,
    port: cfg.port,
    username: cfg.username,
    password: cfg.password,
    database: cfg.name,
    // Entities are auto-loaded via forFeature() + autoLoadEntities in the module.
    entities: [root + '/../**/*.entity{.ts,.js}'],
    migrations: [root + '/migrations/*{.ts,.js}'],
    synchronize: cfg.synchronize,
    logging: cfg.logging,
  };
}

export function typeOrmOptionsFromConfig(config: ConfigService): TypeOrmModuleOptions {
  return {
    ...buildTypeOrmOptions({
      host: config.get<string>('db.host')!,
      port: config.get<number>('db.port')!,
      username: config.get<string>('db.username')!,
      password: config.get<string>('db.password')!,
      name: config.get<string>('db.name')!,
      synchronize: config.get<boolean>('db.synchronize')!,
      logging: config.get<boolean>('db.logging')!,
    }),
    autoLoadEntities: true,
  };
}
