import React, { useMemo } from 'react';
import { Text } from '@react-three/drei';
import * as THREE from 'three';

// Low-poly perimeter terrain hills for depth and parallax
function MountainRing({ radius = 130, count = 28 }) {
  const mountains = useMemo(() => {
    const items = [];
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2;
      const r = radius + (Math.sin(i * 1.7) * 15);
      const x = Math.cos(angle) * r;
      const z = Math.sin(angle) * r;
      const height = 18 + Math.abs(Math.sin(i * 2.3)) * 22;
      const baseWidth = 24 + Math.abs(Math.cos(i * 1.5)) * 14;
      items.push({ x, z, height, baseWidth, rot: Math.random() * Math.PI });
    }
    return items;
  }, [radius, count]);

  return (
    <group>
      {mountains.map((m, idx) => (
        <mesh key={idx} position={[m.x, m.height / 2, m.z]} rotation={[0, m.rot, 0]} receiveShadow>
          <coneGeometry args={[m.baseWidth, m.height, 6]} />
          <meshStandardMaterial
            color="#1e293b"
            roughness={0.85}
            metalness={0.1}
            flatShading={true}
          />
        </mesh>
      ))}
    </group>
  );
}

// Concentric Radar Rings & Crosshairs
function RadarGrid({ maxRadius = 100, step = 20 }) {
  const rings = useMemo(() => {
    const arr = [];
    for (let r = step; r <= maxRadius; r += step) {
      arr.push(r);
    }
    return arr;
  }, [maxRadius, step]);

  return (
    <group position={[0, 0.05, 0]}>
      {rings.map((r) => (
        <mesh key={r} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[r - 0.15, r + 0.15, 64]} />
          <meshBasicMaterial color="#0284c7" transparent opacity={0.35} />
        </mesh>
      ))}

      {/* Distance Labels */}
      {rings.map((r) => (
        <group key={`label-${r}`}>
          <Text
            position={[r + 1.5, 0.1, 0]}
            rotation={[-Math.PI / 2, 0, -Math.PI / 2]}
            fontSize={2.0}
            color="#38bdf8"
            anchorX="center"
            anchorY="middle"
          >
            {`${r}m`}
          </Text>
        </group>
      ))}
    </group>
  );
}

export function TerrainGround({ showRadar = true, showMountains = true }) {
  return (
    <group>
      {/* Main Ground Plane */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
        <planeGeometry args={[300, 300, 64, 64]} />
        <meshStandardMaterial
          color="#0b1329"
          roughness={0.8}
          metalness={0.2}
        />
      </mesh>

      {/* High-tech Glowing Matrix Grid Overlay */}
      <gridHelper
        args={[300, 60, '#0284c7', '#1e293b']}
        position={[0, 0.02, 0]}
      />

      {/* Launch Origin / Base Station Pad */}
      <mesh position={[0, 0.08, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0, 4.0, 32]} />
        <meshBasicMaterial color="#0ea5e9" transparent opacity={0.4} />
      </mesh>
      <mesh position={[0, 0.09, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[3.8, 4.2, 32]} />
        <meshBasicMaterial color="#38bdf8" />
      </mesh>

      {/* Cardinal Direction Markers */}
      <Text position={[0, 0.1, -90]} rotation={[-Math.PI / 2, 0, 0]} fontSize={6} color="#38bdf8" anchorX="center" anchorY="middle">
        NORTH (+Z)
      </Text>
      <Text position={[0, 0.1, 90]} rotation={[-Math.PI / 2, 0, Math.PI]} fontSize={6} color="#64748b" anchorX="center" anchorY="middle">
        SOUTH (-Z)
      </Text>
      <Text position={[90, 0.1, 0]} rotation={[-Math.PI / 2, 0, -Math.PI / 2]} fontSize={6} color="#64748b" anchorX="center" anchorY="middle">
        EAST (+X)
      </Text>
      <Text position={[-90, 0.1, 0]} rotation={[-Math.PI / 2, 0, Math.PI / 2]} fontSize={6} color="#64748b" anchorX="center" anchorY="middle">
        WEST (-X)
      </Text>

      {/* Radar distance rings */}
      {showRadar && <RadarGrid maxRadius={100} step={25} />}

      {/* Surrounding Mountain Horizon */}
      {showMountains && <MountainRing radius={135} count={30} />}
    </group>
  );
}
