import React from 'react';
import { Canvas } from '@react-three/fiber';
import { Atmosphere } from './Atmosphere';
import { TerrainGround } from './TerrainGround';
import { TrajectoryPath } from './TrajectoryPath';
import { CameraManager } from './CameraManager';

export function Scene3D({
  trail = [],
  current = { x: 0, y: 0, z: 0, roll: 0, pitch: 0, yaw: 0, speed: 0 },
  cameraMode = 'orbit',
  cloudDensity = 1.0,
  sunAngle = 45,
  showGroundProjection = true,
  showRadar = true,
  showMountains = true,
  trailColor = '#06b6d4',
  trailWidth = 3.5,
}) {
  // Convert sun angle to 3D position vector
  const rad = (sunAngle * Math.PI) / 180;
  const sunPosition = [Math.cos(rad) * 90, Math.sin(rad) * 70 + 10, Math.sin(rad * 0.5) * 60];

  return (
    <div className="scene-container">
      <Canvas
        shadows
        camera={{ position: [45, 30, 65], fov: 50, near: 0.1, far: 1000 }}
        gl={{ antialias: true, alpha: false, powerPreference: 'high-performance' }}
      >
        {/* Dynamic Sky & Clouds Environment */}
        <Atmosphere
          sunPosition={sunPosition}
          cloudDensity={cloudDensity}
          showStars={sunAngle < 20}
        />

        {/* Realistic Terrain & Radar Grid */}
        <TerrainGround
          showRadar={showRadar}
          showMountains={showMountains}
        />

        {/* 3D Real-time Trajectory Ribbon & Craft */}
        <TrajectoryPath
          trail={trail}
          current={current}
          showGroundProjection={showGroundProjection}
          trailColor={trailColor}
          trailWidth={trailWidth}
        />

        {/* Interactive Multi-Perspective Camera */}
        <CameraManager
          mode={cameraMode}
          target={current}
        />
      </Canvas>
    </div>
  );
}
