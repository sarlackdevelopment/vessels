import { Injectable } from '@nestjs/common'
import {PrismaService} from "../../prisma/prisma.service";

type Bbox = { minLon: number; minLat: number; maxLon: number; maxLat: number }

@Injectable()
export class VesselsService {
    constructor(private readonly prisma: PrismaService) {}

    async getInViewport(b: Bbox) {
        const { minLon, minLat, maxLon, maxLat } = b

        const rows = await this.prisma.$queryRaw<
            Array<{
                mmsi: bigint
                cog: number | null
                sog: number | null
                true_heading: number | null
                updated_at: Date
                lon: number
                lat: number
            }>
        >`
      SELECT
        mmsi,
        cog,
        sog,
        true_heading,
        updated_at,
        ST_X(geom)::float8 AS lon,
        ST_Y(geom)::float8 AS lat
      FROM vessels
      WHERE ST_Intersects(
        geom,
        ST_MakeEnvelope(${minLon}, ${minLat}, ${maxLon}, ${maxLat}, 4326)
      )
      AND updated_at >= NOW() - INTERVAL '2 minutes'
      LIMIT 5000;
    `
        return {
            type: 'FeatureCollection',
            features: rows.map((r) => ({
                type: 'Feature',
                geometry: { type: 'Point', coordinates: [r.lon, r.lat] },
                properties: {
                    mmsi: r.mmsi.toString(),
                    cog: r.cog,
                    sog: r.sog,
                    trueHeading: r.true_heading,
                    updatedAt: r.updated_at.toISOString(),
                },
            })),
        }
    }
}
