import React, { useState } from 'react';
import { Scene3D } from './components/Scene3D';
import { TelemetryHUD } from './components/TelemetryHUD';
import { HardwareControlModal } from './components/HardwareControlModal';
import { useTelemetryWS } from './hooks/useTelemetryWS';

export default function App() {
  const {
    current,
    trail,
    history,
    connectionStatus,
    packetRate,
    availablePorts,
    serverStatus,
    fetchPorts,
    fetchStatus,
    connectSerial,
    disconnectSerial,
    setSimulatorMode,
    clearTrail,
    exportCSV,
    exportJSON,
  } = useTelemetryWS(600);

  // UI and 3D Environment States
  const [cameraMode, setCameraMode] = useState('orbit');
  const [isHardwareModalOpen, setIsHardwareModalOpen] = useState(false);
  const [cloudDensity, setCloudDensity] = useState(1.0);
  const [sunAngle, setSunAngle] = useState(45);
  const [trailColor, setTrailColor] = useState('#06b6d4');
  const [trailWidth, setTrailWidth] = useState(3.5);
  const [showGroundProjection, setShowGroundProjection] = useState(true);
  const [showRadar, setShowRadar] = useState(true);
  const [showMountains, setShowMountains] = useState(true);

  return (
    <main className="app-viewport">
      {/* 3D WebGL Canvas Layer */}
      <Scene3D
        trail={trail}
        current={current}
        cameraMode={cameraMode}
        cloudDensity={cloudDensity}
        sunAngle={sunAngle}
        showGroundProjection={showGroundProjection}
        showRadar={showRadar}
        showMountains={showMountains}
        trailColor={trailColor}
        trailWidth={trailWidth}
      />

      {/* Glassmorphic Aerospace Mission Control HUD */}
      <TelemetryHUD
        current={current}
        history={history}
        trailCount={trail.length}
        packetRate={packetRate}
        connectionStatus={connectionStatus}
        cameraMode={cameraMode}
        setCameraMode={setCameraMode}
        onOpenHardwareModal={() => {
          fetchPorts();
          fetchStatus();
          setIsHardwareModalOpen(true);
        }}
        onClearTrail={clearTrail}
        onExportCSV={exportCSV}
        onExportJSON={exportJSON}
        serverStatus={serverStatus}
      />

      {/* Hardware Connection & Simulator Modal */}
      <HardwareControlModal
        isOpen={isHardwareModalOpen}
        onClose={() => setIsHardwareModalOpen(false)}
        availablePorts={availablePorts}
        onRefreshPorts={fetchPorts}
        onConnectSerial={connectSerial}
        onDisconnectSerial={disconnectSerial}
        isSerialConnected={serverStatus?.is_serial_connected || false}
        connectedPort={serverStatus?.serial_port}
        onSetSimulatorConfig={setSimulatorMode}
        currentSimMode={serverStatus?.simulation_mode || 'helix'}
        cloudDensity={cloudDensity}
        setCloudDensity={setCloudDensity}
        sunAngle={sunAngle}
        setSunAngle={setSunAngle}
        trailColor={trailColor}
        setTrailColor={setTrailColor}
        showGroundProjection={showGroundProjection}
        setShowGroundProjection={setShowGroundProjection}
        showRadar={showRadar}
        setShowRadar={setShowRadar}
        showMountains={showMountains}
        setShowMountains={setShowMountains}
      />
    </main>
  );
}
