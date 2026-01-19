import { Injectable, Logger, OnModuleInit } from '@nestjs/common'
import WebSocket from 'ws'
import {PrismaService} from "../../prisma/prisma.service";

type PositionReport = {
    UserID: number
    Latitude: number
    Longitude: number
    Cog?: number
    Sog?: number
    TrueHeading?: number
}

@Injectable()
export class AisIngestService implements OnModuleInit {
    private readonly logger = new Logger(AisIngestService.name)

    constructor(private readonly prisma: PrismaService) {}

    onModuleInit() {
        this.connect()
    }

    private connect() {
        const apiKey = process.env.AISSTREAM_API_KEY
        if (!apiKey) {
            this.logger.error('AISSTREAM_API_KEY is missing in .env')
            return
        }

        const ws = new WebSocket('wss://stream.aisstream.io/v0/stream')

        ws.on('open', () => {
            // Для начала берём “живой” регион (пример: Северное море/Ла-Манш).
            // Формат у AISStream: BoundingBoxes: [ [ [lat, lon], [lat, lon] ] ]
            const subscribeMsg = {
                APIKey: apiKey,
                BoundingBoxes: [
                    [[48.0, -6.0], [61.0, 9.0]],
                ],
                FilterMessageTypes: ['PositionReport'],
            }

            ws.send(JSON.stringify(subscribeMsg))
            this.logger.log('Connected to AISStream and subscribed')
        })

        ws.on('message', async (raw) => {
            try {
                const msg = JSON.parse(raw.toString())
                const pr: PositionReport | undefined = msg?.Message?.PositionReport
                if (!pr) return

                const mmsi = BigInt(pr.UserID)
                const lat = Number(pr.Latitude)
                const lon = Number(pr.Longitude)

                if (!Number.isFinite(lat) || !Number.isFinite(lon)) return

                const cog = pr.Cog ?? null
                const sog = pr.Sog ?? null
                const trueHeading = pr.TrueHeading ?? null

                await this.prisma.$executeRaw`
          INSERT INTO vessels (mmsi, geom, cog, sog, true_heading, updated_at)
          VALUES (
            ${mmsi},
            ST_SetSRID(ST_MakePoint(${lon}, ${lat}), 4326),
            ${cog},
            ${sog},
            ${trueHeading},
            NOW()
          )
          ON CONFLICT (mmsi) DO UPDATE SET
            geom         = EXCLUDED.geom,
            cog          = EXCLUDED.cog,
            sog          = EXCLUDED.sog,
            true_heading = EXCLUDED.true_heading,
            updated_at   = EXCLUDED.updated_at;
        `
            } catch {
            }
        })

        ws.on('close', (code, reason) => {
            this.logger.warn(`AISStream closed. code=${code} reason=${reason.toString()}`)
            setTimeout(() => this.connect(), 2000)
        })

        ws.on('error', (err) => {
            this.logger.error(`AISStream error: ${String(err)}`)
            try { ws.close() } catch {}
        })
    }
}
