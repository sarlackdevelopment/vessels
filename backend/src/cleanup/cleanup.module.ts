import { Module } from '@nestjs/common'
import { VesselsCleanupService } from './vessels-cleanup.service'

@Module({
    providers: [VesselsCleanupService],
})
export class CleanupModule {}
