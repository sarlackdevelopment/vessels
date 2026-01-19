import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { AppController } from './app.controller'
import { AppService } from './app.service'
import { HealthController } from './health/health.controller'
import {PrismaModule} from "../prisma/prisma.module";
import { VesselsModule } from './vessels/vessels.module'
import {IngestModule} from "./ingest/ingest.module";
import {CleanupModule} from "./cleanup/cleanup.module";


@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    VesselsModule,
    IngestModule,
    CleanupModule
  ],
  controllers: [AppController, HealthController],
  providers: [AppService],
})
export class AppModule {}
