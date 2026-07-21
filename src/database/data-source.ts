import 'reflect-metadata';
import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';
import { buildTypeOrmOptions } from './typeorm.config';
import { DataSourceOptions } from 'typeorm';

dotenv.config();

const options = buildTypeOrmOptions({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  username: process.env.DB_USERNAME || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  name: process.env.DB_NAME || 'acecerty',
  synchronize: process.env.DB_SYNCHRONIZE === 'true',
  logging: process.env.DB_LOGGING === 'true',
}) as DataSourceOptions;

export const AppDataSource = new DataSource(options);
