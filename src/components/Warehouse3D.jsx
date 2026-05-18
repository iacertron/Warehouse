import React, { useMemo, useState } from 'react';
import _ from 'lodash';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Text, Edges, Grid } from '@react-three/drei';
import { getColorCarga } from '../utils/colorUtils';

// ── Constantes ─────────────────────────────────────────────────────────────
const NIVEL_H  = 1.2;
const FLOOR_Y  = -0.85;
const PALLET_W = 1.2;
const PALLET_D = 0.8;

const HW = PALLET_D / 2 + 0.08;
const HD = PALLET_W / 2 + 0.05;

const nivelBase = (n) => (n - 1) * NIVEL_H;

// ── Layout zigzag back-to-back ─────────────────────────────────────────────
const calcPos = (pasillo, rack, offsetZ) => {
  const esImpar = rack % 2 !== 0;
  return {
    x:      (pasillo - 1) * 16 + (esImpar ? -1.3 : 1.3),
    z:      -(Math.ceil(rack / 2) * 1.4) + offsetZ,
    esImpar,
  };
};

// ── Rack ejecutivo ─────────────────────────────────────────────────────────
const RackEstructura = ({ x, z, niveles, rackNum, esImpar, esU2 }) => {
  const profundidadExtra = esU2 ? 1.3 : 0;
  const depthSign = esImpar ? -1 : 1;
  const xBack = x + depthSign * profundidadExtra;

  const colH  = niveles * NIVEL_H + Math.abs(FLOOR_Y);
  const colMY = FLOOR_Y + colH / 2;

  const labelX  = esImpar ? x - HW - 0.12 : x + HW + 0.12;
  const labelRY = esImpar ? Math.PI / 2 : -Math.PI / 2;

  const postsX = esU2
    ? [[x - HW, -HD], [x - HW, HD], [xBack + (esImpar ? -HW : HW), -HD], [xBack + (esImpar ? -HW : HW), HD]]
    : [[-HW, -HD], [-HW, HD], [HW, -HD], [HW, HD]].map(([dx, dz]) => [x + dx, dz]);

  return (
    <group>
      {postsX.map(([px, dz], i) => (
        <mesh key={i} position={[px, colMY, z + dz]} castShadow>
          <boxGeometry args={[0.06, colH, 0.06]} />
          <meshStandardMaterial color="#3f4754" metalness={0.7} roughness={0.35} />
        </mesh>
      ))}

      {Array.from({ length: niveles + 1 }, (_, n) => (
        <React.Fragment key={n}>
          <mesh position={[x, nivelBase(n + 1), z]} castShadow>
            <boxGeometry args={[PALLET_D + 0.16, 0.05, PALLET_W + 0.1]} />
            <meshStandardMaterial color="#2d3340" metalness={0.65} roughness={0.4} />
          </mesh>
          {esU2 && (
            <mesh position={[xBack, nivelBase(n + 1), z]} castShadow>
              <boxGeometry args={[PALLET_D + 0.16, 0.05, PALLET_W + 0.1]} />
              <meshStandardMaterial color="#2d3340" metalness={0.65} roughness={0.4} />
            </mesh>
          )}
        </React.Fragment>
      ))}

      <mesh position={[x, FLOOR_Y + 0.04, z]}>
        <boxGeometry args={[PALLET_D + 0.16, 0.08, PALLET_W + 0.1]} />
        <meshStandardMaterial color="#b45309" metalness={0.25} roughness={0.55} />
      </mesh>
      {esU2 && (
        <mesh position={[xBack, FLOOR_Y + 0.04, z]}>
          <boxGeometry args={[PALLET_D + 0.16, 0.08, PALLET_W + 0.1]} />
          <meshStandardMaterial color="#b45309" metalness={0.25} roughness={0.55} />
        </mesh>
      )}

      <Text
        position={[labelX, nivelBase(1) + 0.4, z]}
        rotation={[0, labelRY, 0]}
        fontSize={0.2}
        color="#94a3b8"
        anchorX="center"
        anchorY="middle"
      >
        {String(rackNum).padStart(2, '0')}
      </Text>
    </group>
  );
};

// ── Pallet ejecutivo PBR ───────────────────────────────────────────────────
function PalletMesh({ ubi, x, z, palletsEnUbi, modoColor, colorMapSKU, opacidad, matchBusqueda, onSelectPallet, isSelected, esU2, esImpar }) {
  const base = nivelBase(ubi.nivel);

  const colorBorde = matchBusqueda ? '#f59e0b' : '#1e293b';
  const colorCarga = palletsEnUbi.length > 0
    ? getColorCarga(palletsEnUbi, modoColor, colorMapSKU)
    : '#1e293b';

  const cantidad = palletsEnUbi[0]?.cantidad ?? 0;
  const altCarga = Math.min(0.5 + (cantidad / 100) * 0.5, NIVEL_H - 0.22);
  const woodY    = base + 0.06;
  const cargoY   = base + 0.12 + altCarga / 2;
  const zunchoY  = base + 0.12 + altCarga - 0.07;

  const depthSign = esImpar ? -1 : 1;
  const xBack = x + depthSign * 1.3;

  if (palletsEnUbi.length === 0) return null;

  return (
    <group>
      <group
        onClick={(e) => { e.stopPropagation(); if (opacidad > 0.5) onSelectPallet({ ubi, pallets: palletsEnUbi }); }}
        onPointerOver={(e) => { e.stopPropagation(); if (opacidad > 0.5) document.body.style.cursor = 'pointer'; }}
        onPointerOut={() => { document.body.style.cursor = 'auto'; }}
      >
        {/* Pallet frontal */}
        <mesh position={[x, woodY, z]} castShadow>
          <boxGeometry args={[PALLET_D, 0.12, PALLET_W]} />
          <meshStandardMaterial color="#a16207" roughness={0.9} metalness={0} transparent opacity={opacidad} />
        </mesh>
        <mesh position={[x, cargoY, z]} castShadow>
          <boxGeometry args={[PALLET_D - 0.04, altCarga, PALLET_W - 0.04]} />
          <meshStandardMaterial color={colorCarga} roughness={0.45} metalness={0.05} transparent opacity={opacidad} />
          <Edges scale={matchBusqueda ? 1.06 : 1.01} threshold={15} color={colorBorde} />
        </mesh>
        <mesh position={[x, zunchoY, z]}>
          <boxGeometry args={[PALLET_D + 0.01, 0.03, 0.05]} />
          <meshStandardMaterial color="#0f172a" transparent opacity={opacidad} />
        </mesh>
        <mesh position={[x, zunchoY, z]}>
          <boxGeometry args={[0.05, 0.03, PALLET_W + 0.01]} />
          <meshStandardMaterial color="#0f172a" transparent opacity={opacidad} />
        </mesh>

        {/* Pallet trasero U2 */}
        {esU2 && (
          <>
            <mesh position={[xBack, woodY, z]} castShadow>
              <boxGeometry args={[PALLET_D, 0.12, PALLET_W]} />
              <meshStandardMaterial color="#a16207" roughness={0.9} metalness={0} transparent opacity={opacidad} />
            </mesh>
            <mesh position={[xBack, cargoY, z]} castShadow>
              <boxGeometry args={[PALLET_D - 0.04, altCarga, PALLET_W - 0.04]} />
              <meshStandardMaterial color={colorCarga} roughness={0.45} metalness={0.05} transparent opacity={opacidad * 0.85} />
            </mesh>
          </>
        )}
      </group>

      {isSelected && (
        <Text
          position={[x, base + altCarga + 0.65, z]}
          fontSize={0.28}
          color="#fbbf24"
          anchorX="center"
          outlineWidth={0.025}
          outlineColor="#000000"
        >
          {ubi.ubicacion}
        </Text>
      )}
    </group>
  );
}

// ── Componente principal ───────────────────────────────────────────────────
export default function Warehouse3D({ maestro, lx02, modoColor, colorMapSKU, onSelectPallet, terminoBusqueda }) {
  const [selectedUbicacion, setSelectedUbicacion] = useState(null);

  const searchNormalized   = terminoBusqueda?.toLowerCase().trim();
  const modoBusquedaActivo = searchNormalized && searchNormalized.length > 1;

  const invPorUbicacion = useMemo(() => _.groupBy(lx02, 'ubicacion'), [lx02]);

  const pasillos = useMemo(
    () => [...new Set(maestro.map(u => u.pasillo))].sort((a, b) => a - b),
    [maestro],
  );

  const racks = useMemo(() => {
    const map = new Map();
    maestro.forEach(u => {
      const key  = `${u.pasillo}-${u.rack}`;
      const prev = map.get(key);
      if (!prev || u.nivel > prev.niveles) {
        map.set(key, {
          pasillo: u.pasillo,
          rack: u.rack,
          niveles: u.nivel,
          esU2: u.tipoUbi === 'U2',
        });
      }
    });
    return [...map.values()];
  }, [maestro]);

  const { centroX, centroZ, offsetZ, topY, maxP } = useMemo(() => {
    if (!maestro.length) return { centroX: 0, centroZ: 0, offsetZ: 30, topY: 6, maxP: 1 };
    const maxP  = Math.max(...maestro.map(u => u.pasillo));
    const maxR  = Math.max(...maestro.map(u => u.rack));
    const maxN  = Math.max(...maestro.map(u => u.nivel));
    const maxRG = Math.ceil(maxR / 2);
    const oZ    = Math.max(30, maxRG * 1.4 + 10);
    const zFirst = oZ - 1.4;
    const zLast  = oZ - maxRG * 1.4;
    return {
      centroX: (maxP - 1) * 8,
      centroZ: (zFirst + zLast) / 2,
      offsetZ: oZ,
      topY:    maxN * NIVEL_H,
      maxP,
    };
  }, [maestro]);

  const handleSelect = (data) => {
    setSelectedUbicacion(data.ubi.ubicacion);
    onSelectPallet(data);
  };

  const lineOff    = 1.3 + HW + 0.1;
  const leftWallX  = -6;
  const rightWallX = (maxP - 1) * 16 + 6;
  const wallMidY   = FLOOR_Y + 8;

  return (
    <Canvas shadows camera={{ position: [centroX, 35, 65], fov: 50 }}>
      <fog attach="fog" args={['#e5e7eb', 80, 200]} />

      <ambientLight intensity={0.6} color="#ffffff" />
      <spotLight
        position={[centroX - 20, 18, centroZ]}
        intensity={1.5}
        color="#f0f9ff"
        angle={Math.PI / 3}
        penumbra={0.4}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
      />
      <spotLight
        position={[centroX + 20, 18, centroZ]}
        intensity={1.5}
        color="#f0f9ff"
        angle={Math.PI / 3}
        penumbra={0.4}
        castShadow
      />
      <spotLight
        position={[centroX, 18, centroZ + 20]}
        intensity={1.2}
        color="#f0f9ff"
        angle={Math.PI / 3}
        penumbra={0.4}
      />

      <OrbitControls
        makeDefault
        target={[centroX, 2, 0]}
        maxPolarAngle={Math.PI / 2 + 0.05}
        minDistance={10}
        maxDistance={150}
      />

      {/* Piso oscuro */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[centroX, FLOOR_Y, centroZ]} receiveShadow>
        <planeGeometry args={[200, 80]} />
        <meshStandardMaterial color="#2a2a2e" roughness={0.92} metalness={0.05} />
      </mesh>

      {/* Grid sobre piso */}
      <Grid
        position={[centroX, FLOOR_Y + 0.001, centroZ]}
        args={[200, 80]}
        cellSize={2}
        cellThickness={0.5}
        cellColor="#1a1a1e"
        sectionSize={10}
        sectionThickness={1}
        sectionColor="#222228"
        fadeDistance={80}
        fadeStrength={1}
        infiniteGrid={false}
      />

      {/* Paredes laterales claras */}
      <mesh position={[leftWallX, wallMidY, centroZ]}>
        <boxGeometry args={[0.4, 16, 80]} />
        <meshStandardMaterial color="#d4d4d8" roughness={0.85} metalness={0.02} />
      </mesh>
      <mesh position={[rightWallX, wallMidY, centroZ]}>
        <boxGeometry args={[0.4, 16, 80]} />
        <meshStandardMaterial color="#d4d4d8" roughness={0.85} metalness={0.02} />
      </mesh>

      {/* Zona picking */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[centroX, FLOOR_Y + 0.001, offsetZ + 1.5]}>
        <planeGeometry args={[200, 3]} />
        <meshStandardMaterial color="#052e16" roughness={0.85} transparent opacity={0.7} />
      </mesh>
      <Text
        position={[centroX, FLOOR_Y + 0.01, offsetZ + 1.5]}
        rotation={[-Math.PI / 2, 0, 0]}
        fontSize={0.5}
        color="#22c55e"
        anchorX="center"
        anchorY="middle"
      >
        ZONA PICKING
      </Text>

      {/* Líneas amarillas de pasillo */}
      {pasillos.map(p => {
        const cx = (p - 1) * 16;
        return (
          <React.Fragment key={p}>
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[cx + lineOff, FLOOR_Y + 0.002, centroZ]}>
              <planeGeometry args={[0.1, 80]} />
              <meshStandardMaterial color="#fbbf24" />
            </mesh>
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[cx - lineOff, FLOOR_Y + 0.002, centroZ]}>
              <planeGeometry args={[0.1, 80]} />
              <meshStandardMaterial color="#fbbf24" />
            </mesh>
          </React.Fragment>
        );
      })}

      {/* Estructuras de rack */}
      {racks.map(({ pasillo, rack, niveles, esU2 }) => {
        const { x, z, esImpar } = calcPos(pasillo, rack, offsetZ);
        return (
          <RackEstructura
            key={`${pasillo}-${rack}`}
            x={x} z={z}
            niveles={niveles}
            rackNum={rack}
            esImpar={esImpar}
            esU2={esU2}
          />
        );
      })}

      {/* Pallets */}
      {maestro.map((ubi, i) => {
        const { x, z, esImpar } = calcPos(ubi.pasillo, ubi.rack, offsetZ);
        const palletsEnUbi = invPorUbicacion[ubi.ubicacion] ?? [];
        const ocupado      = palletsEnUbi.length > 0;
        let matchBusqueda  = false;
        let opacidad       = 1;

        if (modoBusquedaActivo) {
          if (ocupado) {
            matchBusqueda = palletsEnUbi.some(p =>
              p.material?.toLowerCase().includes(searchNormalized) ||
              p.descripcion?.toLowerCase().includes(searchNormalized) ||
              p.lote?.toLowerCase().includes(searchNormalized)
            );
            opacidad = matchBusqueda ? 1 : 0.08;
          } else {
            opacidad = 0.08;
          }
        }

        return (
          <PalletMesh
            key={i}
            ubi={ubi}
            x={x} z={z}
            palletsEnUbi={palletsEnUbi}
            modoColor={modoColor}
            colorMapSKU={colorMapSKU}
            opacidad={opacidad}
            matchBusqueda={matchBusqueda}
            onSelectPallet={handleSelect}
            isSelected={selectedUbicacion === ubi.ubicacion}
            esU2={ubi.tipoUbi === 'U2'}
            esImpar={esImpar}
          />
        );
      })}

      {/* Etiquetas de pasillo ejecutivas */}
      {pasillos.map(p => (
        <Text
          key={p}
          position={[(p - 1) * 16, topY + 1.5, offsetZ + 0.5]}
          fontSize={4}
          color="#f8fafc"
          anchorX="center"
          anchorY="middle"
        >
          {`P${String(p).padStart(2, '0')}`}
        </Text>
      ))}
    </Canvas>
  );
}
