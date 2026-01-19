-- CreateTable
CREATE TABLE "vessels" (
    "mmsi" BIGINT NOT NULL,
    "geom" geometry NOT NULL,
    "cog" DOUBLE PRECISION,
    "sog" DOUBLE PRECISION,
    "true_heading" INTEGER,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "vessels_pkey" PRIMARY KEY ("mmsi")
);

-- CreateIndex
CREATE INDEX "idx_vessels_updated_at" ON "vessels"("updated_at");
