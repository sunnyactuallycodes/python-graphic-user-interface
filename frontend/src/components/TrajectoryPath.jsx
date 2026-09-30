import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { Line, Sphere } from '@react-three/drei';
import * as THREE from 'three';

// 3D Aerospace Craft / Drone representation
function CraftModel({ position, rotation, speed }) {
  const craftRef = useRef();
  const thrusterGlowRef = useRef();

  useFrame(({ clock }) => {
    if (thrusterGlowRef.current) {
      const pulse = 1.0 + Math.sin(clock.getElapsedTime() * 15.0) * 0.3;
      thrusterGlowRef.current.scale.set(pulse, pulse, pulse);
    }
  });

  return (
    <group ref={craftRef} position={position} rotation={rotation}>
      {/* Fuselage */}
      <mesh castShadow>
        <coneGeometry args={[0.8, 3.2, 8]} />
        <meshStandardMaterial
          color="#0284c7"
          roughness={0.2}
          metalness={0.8}
          emissive="#0369a1"
          emissiveIntensity={0.2}
        />
      </mesh>

      {/* Cockpit Canopy */}
      <mesh position={[0, 0.4, 0.3]} castShadow>
        <sphereGeometry args={[0.45, 16, 16]} />
        <meshStandardMaterial
          color="#38bdf8"
          roughness={0.1}
          metalness={0.9}
          transparent
          opacity={0.85}
        />
      </mesh>

      {/* Main Delta Wings */}
      <mesh position={[0, -0.6, 0]} rotation={[0, 0, 0]} castShadow>
        <boxGeometry args={[4.2, 0.1, 1.4]} />
        <meshStandardMaterial color="#0f172a" roughness={0.4} metalness={0.7} />
      </mesh>

      {/* Wingtip Navigation Lights */}
      <mesh position={[2.1, -0.6, 0]}>
        <sphereGeometry args={[0.12, 8, 8]} />
        <meshBasicMaterial color="#22c55e" /> {/* Starboard Green */}
      </mesh>
      <mesh position={[-2.1, -0.6, 0]}>
        <sphereGeometry args={[0.12, 8, 8]} />
        <meshBasicMaterial color="#ef4444" /> {/* Port Red */}
      </mesh>

      {/* Vertical Stabilizer Fin */}
      <mesh position={[0, 0.4, -0.8]} rotation={[0, 0, 0]} castShadow>
        <boxGeometry args={[0.1, 1.2, 0.9]} />
        <meshStandardMaterial color="#0369a1" roughness={0.3} metalness={0.6} />
      </mesh>

      {/* Thruster Jet Exhaust Glow */}
      <mesh ref={thrusterGlowRef} position={[0, -1.6, 0]}>
        <sphereGeometry args={[0.4, 12, 12]} />
        <meshBasicMaterial color="#38bdf8" transparent opacity={0.8} />
      </mesh>
      <pointLight position={[0, -1.6, 0]} color="#38bdf8" intensity={2.5} distance={8} />

      {/* Target Crosshair Bounding Sphere */}
      <mesh>
        <sphereGeometry args={[2.5, 16, 16]} />
        <meshBasicMaterial color="#38bdf8" wireframe transparent opacity={0.15} />
      </mesh>
    </group>
  );
}

export function TrajectoryPath({
  trail = [],
  current = { x: 0, y: 0, z: 0, roll: 0, pitch: 0, yaw: 0, speed: 0 },
  showGroundProjection = true,
  showWaypoints = true,
  trailColor = '#06b6d4',
  trailWidth = 3.5,
}) {
  const currentPos = [current.x, current.y, current.z];

  // Derive Three.js rotation in radians
  const craftRotation = useMemo(() => {
    const r = THREE.MathUtils.degToRad(current.roll || 0);
    const p = THREE.MathUtils.degToRad(current.pitch || 0);
    const y = THREE.MathUtils.degToRad(current.yaw || 0);
    // Three.js Euler convention: YXZ or XYZ
    const euler = new THREE.Euler(p - Math.PI / 2, y, r, 'YXZ');
    return euler;
  }, [current.roll, current.pitch, current.yaw]);

  // Sample waypoints along the trajectory for dot markers
  const waypoints = useMemo(() => {
    if (!showWaypoints || trail.length < 5) return [];
    const step = Math.max(1, Math.floor(trail.length / 25));
    const pts = [];
    for (let i = 0; i < trail.length; i += step) {
      pts.push(trail[i]);
    }
    return pts;
  }, [trail, showWaypoints]);

  return (
    <group>
      {/* Dynamic 3D Trajectory Ribbon */}
      {trail.length >= 2 && (
        <Line
          points={trail}
          color={trailColor}
          lineWidth={trailWidth}
          dashed={false}
        />
      )}

      {/* Glowing waypoint markers */}
      {waypoints.map((pt, idx) => (
        <mesh key={idx} position={pt}>
          <sphereGeometry args={[0.25, 8, 8]} />
          <meshBasicMaterial color="#38bdf8" transparent opacity={0.7} />
        </mesh>
      ))}

      {/* Target Craft Marker */}
      <CraftModel
        position={currentPos}
        rotation={craftRotation}
        speed={current.speed || 0}
      />

      {/* Ground Projection Line & Shadow Ring */}
      {showGroundProjection && (
        <group>
          {/* Vertical drop line to ground plane */}
          <Line
            points={[
              [current.x, current.y, current.z],
              [current.x, 0.05, current.z],
            ]}
            color="#ef4444"
            lineWidth={1.5}
            dashed={true}
            dashScale={2}
            dashSize={0.8}
            gapSize={0.4}
          />

          {/* Ground Footprint Ring */}
          <mesh position={[current.x, 0.06, current.z]} rotation={[-Math.PI / 2, 0, 0]}>
            <ringGeometry args={[1.2, 1.6, 24]} />
            <meshBasicMaterial color="#ef4444" transparent opacity={0.6} />
          </mesh>
          <mesh position={[current.x, 0.06, current.z]} rotation={[-Math.PI / 2, 0, 0]}>
            <circleGeometry args={[0.3, 16]} />
            <meshBasicMaterial color="#ef4444" />
          </mesh>
        </group>
      )}
    </group>
  );
}
