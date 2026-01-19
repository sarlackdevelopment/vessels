import { Injectable, Logger, OnModuleInit } from '@nestjs/common'
import {PrismaService} from "../../prisma/prisma.service";

@Injectable()
export class VesselsCleanupService implements OnModuleInit {
    private readonly logger = new Logger(VesselsCleanupService.name)

    constructor(private readonly prisma: PrismaService) {}

    onModuleInit() {
        setInterval(() => this.cleanup(), 60_000).unref()
    }

    private async cleanup() {
        const olderThanMinutes = 30

        const result = await this.prisma.$executeRaw`
      DELETE FROM vessels
      WHERE updated_at < NOW() - INTERVAL '${olderThanMinutes} minutes';
    `
        this.logger.debug(`cleanup done, result=${String(result)}`)
    }
}
