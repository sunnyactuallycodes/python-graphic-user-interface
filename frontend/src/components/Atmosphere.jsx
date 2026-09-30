import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Sky, Sparkles } from '@react-three/drei';
import * as THREE from 'three';

// Procedural volumetric cloud layer
function CloudCluster({ position, count = 12, radius = 25, speed = 0.05 }) {
  const groupRef = useRef();

  useFrame((state, delta) => {
    if (groupRef.current) {
      groupRef.current.position.x += delta * speed;
      // Wrap around when drifting too far
      if (groupRef.current.position.x > 180) {
        groupRef.current.position.x = -180;
      }
    }
  });

  // Generate cloud puff positions deterministically
  const puffs = React.useMemo(() => {
    const items = [];
    for (let i = 0; i < count; i++) {
      const u = Math.random();
      const v = Math.random();
      const theta = u * 2.0 * Math.PI;
      const phi = Math.acos(2.0 * v - 1.0);
      const r = Math.cbrt(Math.random()) * radius;
      const sinPhi = Math.sin(phi);
      const x = r * sinPhi * Math.cos(theta);
      const y = (r * sinPhi * Math.sin(theta)) * 0.35; // Flatten vertically
      const z = r * Math.cos(phi);
      const scale = 4.0 + Math.random() * 6.0;
      const opacity = 0.25 + Math.random() * 0.25;
      items.push({ pos: [x, y, z], scale, opacity });
    }
    return items;
  }, [count, radius]);

  return (
    <group ref={groupRef} position={position}>
      {puffs.map((puff, idx) => (
        <mesh key={idx} position={puff.pos}>
          <sphereGeometry args={[puff.scale, 14, 14]} />
          <meshStandardMaterial
            color="#eef6fb"
            roughness={0.9}
            metalness={0.05}
            transparent={true}
            opacity={puff.opacity}
            depthWrite={false}
          />
        </mesh>
      ))}
    </group>
  );
}

export function Atmosphere({ sunPosition = [60, 45, 80], cloudDensity = 1.0, showStars = true }) {
  return (
    <>
      {/* Dynamic Sky dome */}
      <Sky
        sunPosition={sunPosition}
        turbidity={7}
        rayleigh={1.5}
        mieCoefficient={0.005}
        mieDirectionalG={0.8}
        distance={450000}
      />

      {/* Atmospheric depth fog */}
      <fog attach="fog" args={['#0a1324', 60, 320]} />

      {/* Ambient and Key Lighting */}
      <ambientLight intensity={0.65} color="#dbeafe" />
      
      {/* Sun Light with Soft Shadows */}
      <directionalLight
        position={sunPosition}
        intensity={1.8}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-far={350}
        shadow-camera-left={-70}
        shadow-camera-right={70}
        shadow-camera-top={70}
        shadow-camera-bottom={-70}
        shadow-bias={-0.0005}
        color="#fffbf0"
      />

      {/* Hemisphere fill light for realistic sky bouncing */}
      <hemisphereLight
        skyColor="#38bdf8"
        groundColor="#0f172a"
        intensity={0.45}
      />

      {/* Realistic Volumetric Cloud Banks */}
      {cloudDensity > 0 && (
        <group>
          <CloudCluster position={[-70, 35, -40]} count={16} radius={32} speed={0.4} />
          <CloudCluster position={[40, 45, -70]} count={20} radius={40} speed={0.3} />
          <CloudCluster position={[-30, 55, 60]} count={15} radius={30} speed={0.5} />
          <CloudCluster position={[80, 40, 50]} count={18} radius={35} speed={0.35} />
          <CloudCluster position={[-120, 50, -10]} count={22} radius={45} speed={0.25} />
        </group>
      )}

      {/* Atmospheric dust / high altitude shimmer sparkles */}
      {showStars && (
        <Sparkles
          count={120}
          scale={[150, 70, 150]}
          size={3.5}
          speed={0.3}
          opacity={0.6}
          color="#38bdf8"
        />
      )}
    </>
  );
}
