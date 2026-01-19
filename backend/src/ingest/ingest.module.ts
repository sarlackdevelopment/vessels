import { Module } from '@nestjs/common'
import { AisIngestService } from './ais-ingest.service'

@Module({
    providers: [AisIngestService],
})
export class IngestModule {}
