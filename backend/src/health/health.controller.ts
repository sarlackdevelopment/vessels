import { Controller, Get } from '@nestjs/common'
import {PrismaService} from "../../prisma/prisma.service";

@Controller('health')
export class HealthController {
    constructor(private readonly prisma: PrismaService) {}

    @Get()
    async health() {
        const r = await this.prisma.$queryRaw<Array<{ ok: number }>>`SELECT 1 as ok`
        return { ok: r[0]?.ok === 1 }
    }
}
