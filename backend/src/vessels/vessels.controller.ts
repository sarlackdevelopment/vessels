import { Controller, Get, Query } from '@nestjs/common'
import { VesselsService } from './vessels.service'

@Controller('vessels')
export class VesselsController {
    constructor(private readonly vessels: VesselsService) {}

    @Get()
    async list(@Query('bbox') bboxStr: string) {
        const [minLon, minLat, maxLon, maxLat] = (bboxStr ?? '').split(',').map(Number)
        return this.vessels.getInViewport({ minLon, minLat, maxLon, maxLat })
    }
}
