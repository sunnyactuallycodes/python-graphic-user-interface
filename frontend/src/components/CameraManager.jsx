import React, { useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';

export function CameraManager({ mode = 'orbit', target = { x: 0, y: 0, z: 0, yaw: 0, pitch: 0 } }) {
  const { camera } = useThree();
  const controlsRef = useRef();

  useFrame((state, delta) => {
    const targetVec = new THREE.Vector3(target.x || 0, target.y || 0, target.z || 0);

    if (mode === 'chase') {
      // Position camera behind and above the target craft
      const yawRad = THREE.MathUtils.degToRad(target.yaw || 0);
      const distance = 18;
      const height = 8;
      
      const desiredX = target.x - Math.sin(yawRad) * distance;
      const desiredZ = target.z - Math.cos(yawRad) * distance;
      const desiredY = target.y + height;

      // Smooth lerp camera position
      camera.position.lerp(new THREE.Vector3(desiredX, desiredY, desiredZ), delta * 4.0);
      camera.lookAt(targetVec.x, targetVec.y + 1.5, targetVec.z);
    } else if (mode === 'tactical') {
      // Top-down tactical view directly above target
      const desiredPos = new THREE.Vector3(target.x, 90, target.z);
      camera.position.lerp(desiredPos, delta * 3.0);
      camera.lookAt(targetVec);
    } else if (mode === 'fpv') {
      // Cockpit / Nose camera looking forward
      const yawRad = THREE.MathUtils.degToRad(target.yaw || 0);
      const forwardDist = 30;
      
      const nosePos = new THREE.Vector3(target.x, target.y + 0.4, target.z);
      const lookTarget = new THREE.Vector3(
        target.x + Math.sin(yawRad) * forwardDist,
        target.y + Math.sin(THREE.MathUtils.degToRad(target.pitch || 0)) * forwardDist,
        target.z + Math.cos(yawRad) * forwardDist
      );

      camera.position.copy(nosePos);
      camera.lookAt(lookTarget);
    }
  });

  return (
    <>
      {mode === 'orbit' && (
        <OrbitControls
          ref={controlsRef}
          makeDefault
          enableDamping
          dampingFactor={0.08}
          minDistance={5}
          maxDistance={220}
          maxPolarAngle={Math.PI / 2 + 0.05} // Don't dip far below ground
          target={[target.x || 0, Math.max(2, target.y || 0), target.z || 0]}
        />
      )}
    </>
  );
}
