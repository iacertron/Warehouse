import React, { useMemo, useState } from 'react';
import _ from 'lodash';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Text, Edges } from '@react-three/drei';
import { getColorCarga } from '../utils/colorUtils';

// ── Escala industrial 1u ≈ 1m ──────────────────────────────────────────────
const NIVEL_H   = 1.2;
const BLOQUE_SP = 18;
const RACK_SP   = 2.5;
const PALLET_W  = 1.2;   // largo a lo largo del rack (Z)
const PALLET_D  = 0.8;   // profundidad reach (X)
const FILA_OFF  = 1.2;   // offset Z para fila U1/U2
const FLOOR_Y   = -0.85;

// Semidimensiones del rack en X/Z
const HW = PALLET_D / 2 + 0.08;   // 0.48
const HD = PALLET_W / 2 + 0.05;   // 0.65

const bloqueX   = (p) => (p - 1) * BLOQUE_SP;
const rackZ     = (r) => (r - 1) * RACK_SP;
const filaZ     = (t) => t === 'U2' ? FILA_OFF : -FILA_OFF;
const nivelBase = (n) => (n - 1) * NIVEL_H;

// ── Rack metálico ──────────────────────────────────────────────────────────
const RackEstructura = ({ x, z, niveles, rackNum }) => {
  const colH  = niveles * NIVEL_H + Math.abs(FLOOR_Y);
  const colMY = FLOOR_Y + colH / 2;

  return (
    <group>
      {[[-HW, -HD], [-HW, HD], [HW, -HD], [HW, HD]].map(([dx, dz], i) => (
        <mesh key={i} position={[x + dx, colMY, z + dz]} castShadow>
          <boxGeometry args={[0.06, colH, 0.06]} />
          <meshStandardMaterial color="#4a5568" metalness={0.95} roughness={0.1} />
        </mesh>
      ))}

      {Array.from({ length: niveles + 1 }, (_, n) => (
        <mesh key={n} position={[x, nivelBase(n + 1), z]} castShadow>
          <boxGeometry args={[PALLET_D + 0.16, 0.05, PALLET_W + 0.1]} />
          <meshStandardMaterial color="#37474F" metalness={0.85} roughness={0.25} />
        </mesh>
      ))}

      {/* Barra de seguridad naranja */}
      <mesh position={[x, FLOOR_Y + 0.04, z]}>
        <boxGeometry args={[PALLET_D + 0.16, 0.08, PALLET_W + 0.1]} />
        <meshStandardMaterial color="#ea580c" metalness={0.2} roughness={0.6} />
      </mesh>

      <Text
        position={[x + HW + 0.12, nivelBase(1) + 0.4, z]}
        rotation={[0, -Math.PI / 2, 0]}
        fontSize={0.2}
        color="#78909C"
        anchorX="center"
        anchorY="middle"
      >
        {String(rackNum).padStart(2, '0')}
      </Text>
    </group>
  );
};

// ── Pallet europeo ─────────────────────────────────────────────────────────
function PalletMesh({ ubi, palletsEnUbi, modoColor, colorMapSKU, opacidad, matchBusqueda, onSelectPallet, isSelected }) {
  const x    = bloqueX(ubi.pasillo);
  const z    = rackZ(ubi.rack) + filaZ(ubi.tipoUbi);
  const base = nivelBase(ubi.nivel);

  const colorBorde = matchBusqueda ? '#ef4444' : '#334155';
  const colorCarga = palletsEnUbi.length > 0
    ? getColorCarga(palletsEnUbi, modoColor, colorMapSKU)
    : '#334155';

  const cantidad = palletsEnUbi[0]?.cantidad ?? 0;
  const altCarga = Math.min(0.5 + (cantidad / 100) * 0.5, NIVEL_H - 0.22);
  const woodY    = base + 0.06;
  const cargoY   = base + 0.12 + altCarga / 2;
  const zunchoY  = base + 0.12 + altCarga - 0.07;

  return (
    <group>
      {palletsEnUbi.length > 0 && (
        <>
          <group
            onClick={(e) => { e.stopPropagation(); if (opacidad > 0.5) onSelectPallet({ ubi, pallets: palletsEnUbi }); }}
            onPointerOver={(e) => { e.stopPropagation(); if (opacidad > 0.5) document.body.style.cursor = 'pointer'; }}
            onPointerOut={() => { document.body.style.cursor = 'auto'; }}
          >
            <mesh position={[x, woodY, z]} castShadow>
              <boxGeometry args={[PALLET_D, 0.12, PALLET_W]} />
              <meshStandardMaterial color="#8B6914" roughness={0.95} metalness={0} transparent opacity={opacidad} />
            </mesh>

            <mesh position={[x, cargoY, z]} castShadow>
              <boxGeometry args={[PALLET_D - 0.04, altCarga, PALLET_W - 0.04]} />
              <meshStandardMaterial color={colorCarga} roughness={0.4} metalness={0} transparent opacity={opacidad} />
              <Edges scale={matchBusqueda ? 1.05 : 1.01} threshold={15} color={colorBorde} />
            </mesh>

            <mesh position={[x, zunchoY, z]}>
              <boxGeometry args={[PALLET_D + 0.01, 0.03, 0.05]} />
              <meshStandardMaterial color="#1e293b" transparent opacity={opacidad} />
            </mesh>
            <mesh position={[x, zunchoY, z]}>
              <boxGeometry args={[0.05, 0.03, PALLET_W + 0.01]} />
              <meshStandardMaterial color="#1e293b" transparent opacity={opacidad} />
            </mesh>
          </group>

          {isSelected && (
            <Text
              position={[x, base + altCarga + 0.6, z]}
              fontSize={0.25}
              color="#fbbf24"
              anchorX="center"
              outlineWidth={0.02}
              outlineColor="#000000"
            >
              {ubi.ubicacion}
            </Text>
          )}
        </>
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

  // Clave incluye tipoUbi → 2 filas back-to-back por bloque
  const racks = useMemo(() => {
    const map = new Map();
    maestro.forEach(u => {
      const key  = `${u.pasillo}-${u.rack}-${u.tipoUbi}`;
      const prev = map.get(key);
      if (!prev || u.nivel > prev.niveles) {
        map.set(key, { pasillo: u.pasillo, rack: u.rack, niveles: u.nivel, tipoUbi: u.tipoUbi });
      }
    });
    return [...map.values()];
  }, [maestro]);

  const { centroX, centroZ, topY, maxP } = useMemo(() => {
    if (!maestro.length) return { centroX: 0, centroZ: 0, topY: 6, maxP: 1 };
    const mp = Math.max(...maestro.map(u => u.pasillo));
    const mr = Math.max(...maestro.map(u => u.rack));
    const mn = Math.max(...maestro.map(u => u.nivel));
    return {
      centroX: bloqueX(mp) / 2,
      centroZ: rackZ(mr) / 2,
      topY:    mn * NIVEL_H,
      maxP:    mp,
    };
  }, [maestro]);

  const handleSelect = (data) => {
    setSelectedUbicacion(data.ubi.ubicacion);
    onSelectPallet(data);
  };

  const lineOff    = HW + 0.1;
  const leftWallX  = -HW - 5;
  const rightWallX = bloqueX(maxP) + HW + 5;
  const wallMidY   = FLOOR_Y + 15 / 2;

  return (
    <Canvas shadows camera={{ position: [centroX, 35, 65], fov: 50 }}>
      <fog attach="fog" args={['#0a0a0f', 40, 120]} />

      <ambientLight intensity={0.2} />
      <directionalLight
        position={[centroX, 20, centroZ + 20]}
        intensity={0.5}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
      />

      {/* Lámparas industriales — 1 cada 2 pasillos */}
      {pasillos.filter((_, i) => i % 2 === 0).map(p => (
        <React.Fragment key={p}>
          <pointLight
            position={[bloqueX(p), 12, centroZ]}
            intensity={1.5}
            color="#fff5e0"
            distance={25}
            decay={2}
          />
          <mesh position={[bloqueX(p), 12, centroZ]}>
            <sphereGeometry args={[0.15, 8, 8]} />
            <meshStandardMaterial color="#fffde7" emissive="#fffde7" emissiveIntensity={2} />
          </mesh>
        </React.Fragment>
      ))}

      <OrbitControls
        makeDefault
        target={[centroX, 2, 0]}
        maxPolarAngle={Math.PI / 2 + 0.05}
        minDistance={10}
        maxDistance={150}
      />

      {/* Piso concreto */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[centroX, FLOOR_Y, centroZ]} receiveShadow>
        <planeGeometry args={[200, 80]} />
        <meshStandardMaterial color="#1c1c1e" roughness={0.95} metalness={0} />
      </mesh>

      {/* Paredes laterales */}
      <mesh position={[leftWallX, wallMidY, centroZ]}>
        <boxGeometry args={[0.5, 15, 80]} />
        <meshStandardMaterial color="#111318" roughness={0.9} metalness={0.05} />
      </mesh>
      <mesh position={[rightWallX, wallMidY, centroZ]}>
        <boxGeometry args={[0.5, 15, 80]} />
        <meshStandardMaterial color="#111318" roughness={0.9} metalness={0.05} />
      </mesh>

      {/* Techo */}
      <mesh position={[centroX, 14, centroZ]}>
        <boxGeometry args={[200, 0.3, 80]} />
        <meshStandardMaterial color="#0d0d0f" roughness={0.9} />
      </mesh>

      {/* Vigas transversales cada 8u en Z */}
      {Array.from({ length: 10 }, (_, i) => (
        <mesh key={i} position={[centroX, 13.85, centroZ + (i - 5) * 8]}>
          <boxGeometry args={[200, 0.3, 0.4]} />
          <meshStandardMaterial color="#1a1a1f" />
        </mesh>
      ))}

      {/* Zona de picking */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[centroX, FLOOR_Y + 0.001, -RACK_SP]}>
        <planeGeometry args={[200, RACK_SP * 1.2]} />
        <meshStandardMaterial color="#052e16" roughness={0.85} transparent opacity={0.85} />
      </mesh>
      <Text
        position={[centroX, FLOOR_Y + 0.01, -RACK_SP]}
        rotation={[-Math.PI / 2, 0, 0]}
        fontSize={0.45}
        color="#22c55e"
        anchorX="center"
        anchorY="middle"
      >
        ZONA PICKING
      </Text>

      {/* Líneas amarillas — bordes de cada bloque */}
      {pasillos.map(p => {
        const x = bloqueX(p);
        return (
          <React.Fragment key={p}>
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[x + lineOff, FLOOR_Y + 0.002, centroZ]}>
              <planeGeometry args={[0.1, 80]} />
              <meshStandardMaterial color="#fbbf24" />
            </mesh>
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[x - lineOff, FLOOR_Y + 0.002, centroZ]}>
              <planeGeometry args={[0.1, 80]} />
              <meshStandardMaterial color="#fbbf24" />
            </mesh>
          </React.Fragment>
        );
      })}

      {/* Racks */}
      {racks.map(({ pasillo, rack, niveles, tipoUbi }) => (
        <RackEstructura
          key={`${pasillo}-${rack}-${tipoUbi}`}
          x={bloqueX(pasillo)}
          z={rackZ(rack) + filaZ(tipoUbi)}
          niveles={niveles}
          rackNum={rack}
        />
      ))}

      {/* Pallets */}
      {maestro.map((ubi, i) => {
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
            opacidad = matchBusqueda ? 1 : 0.1;
          } else {
            opacidad = 0.1;
          }
        }

        return (
          <PalletMesh
            key={i}
            ubi={ubi}
            palletsEnUbi={palletsEnUbi}
            modoColor={modoColor}
            colorMapSKU={colorMapSKU}
            opacidad={opacidad}
            matchBusqueda={matchBusqueda}
            onSelectPallet={handleSelect}
            isSelected={selectedUbicacion === ubi.ubicacion}
          />
        );
      })}

      {/* Etiquetas de pasillo */}
      {pasillos.map(p => (
        <Text
          key={p}
          position={[bloqueX(p), topY + 1.5, -0.5]}
          fontSize={0.9}
          color="#3b82f6"
          anchorX="center"
          anchorY="middle"
        >
          {`P${String(p).padStart(2, '0')}`}
        </Text>
      ))}
    </Canvas>
  );
}
