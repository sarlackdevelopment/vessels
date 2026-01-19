import React, { useCallback, useEffect, useRef, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import Mapbox, {
    MapView,
    Camera,
    ShapeSource,
    CircleLayer,
    SymbolLayer,
    Images,
    MarkerView,
} from "@rnmapbox/maps";
import type { FeatureCollection, Point } from "geojson";

type VesselsFC = FeatureCollection<
    Point,
    {
        mmsi: string;
        cog: number | null;
        sog: number | null;
        trueHeading: number | null;
        updatedAt: string;
    }
>;

const BACKEND = "http://10.0.2.2:3000";
const MIN_ZOOM = 12;

const EMPTY: VesselsFC = { type: "FeatureCollection", features: [] };

Mapbox.setAccessToken(
    "pk.eyJ1IjoieGVub21vcmYxOTg4IiwiYSI6ImNta2p1Y2picDBtaTkzZHM2YmhtbnE4Z2IifQ.Sj2D6-aYj5eFGMYvHwCqpQ"
);

export default function App() {
    const cameraRef = useRef<React.ElementRef<typeof Camera> | null>(null);

    const [shape, setShape] = useState<VesselsFC>(EMPTY);
    const [hud, setHud] = useState({ zoom: 0, count: 0 });

    const [selected, setSelected] = useState<{
        coord: [number, number];
        props: {
            mmsi: string;
            sog: number | null;
            cog: number | null;
            trueHeading: number | null;
            updatedAt: string;
        };
    } | null>(null);

    const zoomRef = useRef(12);
    const bboxRef = useRef<[number, number, number, number] | null>(null);
    const inFlightRef = useRef(false);

    const setZoom = useCallback((nextZoom: number) => {
        const z = Math.max(0, Math.min(22, nextZoom));
        zoomRef.current = z;

        cameraRef.current?.setCamera({
            zoomLevel: z,
            animationDuration: 200,
        });
    }, []);

    const zoomBy = useCallback(
        (delta: number) => {
            setZoom(zoomRef.current + delta);
        },
        [setZoom]
    );

    const onCameraChanged = useCallback(
        (state: any) => {
            const z = state?.properties?.zoom;
            const bounds = state?.properties?.bounds;

            if (typeof z === "number") {
                zoomRef.current = z;
                setHud((h) => ({ ...h, zoom: z }));

                if (z < MIN_ZOOM) {
                    setShape(EMPTY);
                    setSelected(null);
                    setHud((h) => ({ ...h, count: 0 }));
                }
            }

            if (bounds?.sw && bounds?.ne) {
                const sw = bounds.sw as [number, number];
                const ne = bounds.ne as [number, number];
                bboxRef.current = [sw[0], sw[1], ne[0], ne[1]];
            }
        },
        []
    );

    useEffect(() => {
        let disposed = false;

        const tick = async () => {
            if (disposed) return;
            if (inFlightRef.current) return;

            const zoom = zoomRef.current;
            const bbox = bboxRef.current;
            if (!bbox || zoom < MIN_ZOOM) return;

            inFlightRef.current = true;
            try {
                const [minLon, minLat, maxLon, maxLat] = bbox;
                const url = `${BACKEND}/vessels?bbox=${minLon},${minLat},${maxLon},${maxLat}`;

                const res = await fetch(url);
                const data = await res.json();

                if (data?.type === "FeatureCollection" && Array.isArray(data.features)) {
                    setShape(data);
                    setHud((h) => ({ ...h, count: data.features.length }));
                }
            } catch {
            } finally {
                inFlightRef.current = false;
            }
        };

        tick();
        const id = setInterval(tick, 5000);
        return () => {
            disposed = true;
            clearInterval(id);
        };
    }, []);

    return (
        <View style={styles.root}>
            <MapView
                style={styles.map}
                onCameraChanged={onCameraChanged}
                onPress={() => setSelected(null)}
                logoEnabled={false}
                zoomEnabled
                scrollEnabled
                pitchEnabled
                rotateEnabled
            >
                <Camera
                    ref={cameraRef}
                    centerCoordinate={[4.48, 51.92]}
                    zoomLevel={12}
                    animationDuration={0}
                />

                <Images images={{ vesselArrow: require("./assets/vessel_arrow.png") }} />

                <ShapeSource
                    id="vessels"
                    shape={shape}
                    onPress={(e) => {
                        const f = e.features?.[0];
                        if (!f) return;

                        const coord = (f.geometry as any)?.coordinates as
                            | [number, number]
                            | undefined;
                        const p = (f.properties ?? {}) as any;
                        if (!coord) return;

                        setSelected({
                            coord,
                            props: {
                                mmsi: String(p.mmsi ?? ""),
                                sog: p.sog ?? null,
                                cog: p.cog ?? null,
                                trueHeading: p.trueHeading ?? null,
                                updatedAt: String(p.updatedAt ?? ""),
                            },
                        });
                    }}
                >
                    <CircleLayer
                        id="vesselDots"
                        style={{
                            circleRadius: 3,
                            circleOpacity: 0.8,
                            circleColor: "#ff0000",
                        }}
                    />

                    <SymbolLayer
                        id="vesselArrows"
                        style={{
                            iconImage: "vesselArrow",
                            iconAllowOverlap: true,
                            iconSize: 0.6,
                            iconRotate: ["coalesce", ["get", "trueHeading"], ["get", "cog"], 0],
                            iconRotationAlignment: "map",
                        }}
                    />
                </ShapeSource>

                {selected && (
                    <MarkerView id="selected-vessel" coordinate={selected.coord} anchor={{ x: 0.5, y: 1 }}>
                        <View style={styles.popup}>
                            <Text style={styles.popupTitle}>MMSI: {selected.props.mmsi}</Text>
                            <Text style={styles.popupText}>SOG: {selected.props.sog ?? "—"} kn</Text>
                            <Text style={styles.popupText}>COG: {selected.props.cog ?? "—"}°</Text>
                            <Text style={styles.popupText}>
                                {selected.props.updatedAt
                                    ? `Updated: ${new Date(selected.props.updatedAt).toLocaleTimeString()}`
                                    : "Updated: —"}
                            </Text>

                            <Pressable style={styles.popupClose} onPress={() => setSelected(null)}>
                                <Text style={styles.popupCloseText}>×</Text>
                            </Pressable>
                        </View>
                    </MarkerView>
                )}
            </MapView>

            <View style={styles.hud}>
                <Text style={styles.hudText}>
                    zoom: {hud.zoom.toFixed(1)} | vessels: {hud.count}
                    {hud.zoom < MIN_ZOOM ? " (zoom in to 12+)" : ""}
                </Text>
            </View>

            {/* Zoom controls */}
            <View style={styles.zoomControls}>
                <Pressable style={styles.zoomBtn} onPress={() => zoomBy(+1)}>
                    <Text style={styles.zoomText}>+</Text>
                </Pressable>
                <Pressable style={styles.zoomBtn} onPress={() => zoomBy(-1)}>
                    <Text style={styles.zoomText}>−</Text>
                </Pressable>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    root: { flex: 1 },
    map: { flex: 1 },

    hud: {
        position: "absolute",
        top: 10,
        left: 10,
        paddingHorizontal: 10,
        paddingVertical: 6,
        backgroundColor: "rgba(0,0,0,0.55)",
        borderRadius: 8,
    },
    hudText: { color: "white" },

    zoomControls: {
        position: "absolute",
        right: 12,
        bottom: 24,
        gap: 10,
    },
    zoomBtn: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: "rgba(0,0,0,0.6)",
        alignItems: "center",
        justifyContent: "center",
    },
    zoomText: {
        color: "white",
        fontSize: 24,
        lineHeight: 24,
    },

    popup: {
        minWidth: 170,
        paddingHorizontal: 10,
        paddingVertical: 8,
        borderRadius: 10,
        backgroundColor: "rgba(0,0,0,0.85)",
    },
    popupTitle: { color: "white", fontWeight: "600", marginBottom: 4 },
    popupText: { color: "white", fontSize: 12 },
    popupClose: {
        position: "absolute",
        right: 6,
        top: 4,
        width: 22,
        height: 22,
        alignItems: "center",
        justifyContent: "center",
    },
    popupCloseText: { color: "white", fontSize: 18, lineHeight: 18 },
});
