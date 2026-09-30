import React from 'react';
import {
  Activity,
  Compass,
  Download,
  Trash2,
  Video,
  Eye,
  Crosshair,
  Sliders,
  Cpu,
  Layers,
  Gauge,
  Navigation,
  Wind,
  ShieldAlert,
  Radio
} from 'lucide-react';

// Real-time mini SVG Sparkline
function Sparkline({ data = [], color = '#06b6d4', height = 36, width = 140, label = 'Val' }) {
  if (!data || data.length < 2) {
    return <div className="sparkline-placeholder">Awaiting packets...</div>;
  }

  const values = data.map((d) => (typeof d === 'number' ? d : 0));
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;

  const points = values
    .map((val, idx) => {
      const x = (idx / (values.length - 1)) * (width - 6) + 3;
      const y = height - ((val - min) / range) * (height - 8) - 4;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');

  const lastVal = values[values.length - 1]?.toFixed(1) || '0.0';

  return (
    <div className="sparkline-container">
      <div className="sparkline-header">
        <span className="sparkline-label">{label}</span>
        <span className="sparkline-val" style={{ color }}>{lastVal}</span>
      </div>
      <svg width={width} height={height} className="sparkline-svg">
        <polyline
          fill="none"
          stroke={color}
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          points={points}
        />
      </svg>
    </div>
  );
}

export function TelemetryHUD({
  current = { x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, speed: 0, distance: 0, roll: 0, pitch: 0, yaw: 0, packet_id: 0, source: 'simulation' },
  history = [],
  trailCount = 0,
  packetRate = 0,
  connectionStatus = 'connected',
  cameraMode = 'orbit',
  setCameraMode,
  onOpenHardwareModal,
  onClearTrail,
  onExportCSV,
  onExportJSON,
  serverStatus,
}) {
  const isMCU = current.source === 'mcu' || serverStatus?.is_serial_connected;

  const xHistory = history.map((h) => h.x);
  const yHistory = history.map((h) => h.y);
  const zHistory = history.map((h) => h.z);
  const speedHistory = history.map((h) => h.speed);

  return (
    <div className="hud-overlay">
      {/* ---------------- TOP MISSION BAR ---------------- */}
      <header className="hud-top-bar">
        <div className="hud-brand">
          <div className="hud-logo-icon">
            <Radio className="pulse-icon text-cyan" size={20} />
          </div>
          <div>
            <h1 className="hud-title">AERO-TRAJECTORY 3D</h1>
            <span className="hud-version">MCU TELEMETRY ENGINE v1.0</span>
          </div>
        </div>

        {/* Live Status Indicators */}
        <div className="hud-status-cluster">
          <div className={`status-badge ${isMCU ? 'badge-mcu' : 'badge-sim'}`}>
            <span className="status-dot" />
            <span className="status-text">
              {isMCU ? `HARDWARE MCU: ${serverStatus?.serial_port || 'ONLINE'}` : `SIMULATOR: ${(serverStatus?.simulation_mode || 'HELIX').toUpperCase()}`}
            </span>
          </div>

          <div className="metric-chip">
            <Activity size={14} className="text-cyan" />
            <span>{packetRate} Hz</span>
          </div>

          <div className="metric-chip">
            <Gauge size={14} className="text-purple" />
            <span>PKT #{current.packet_id || 0}</span>
          </div>
        </div>

        {/* Top Action Controls */}
        <div className="hud-actions">
          <button className="hud-btn hud-btn-primary" onClick={onOpenHardwareModal}>
            <Cpu size={16} />
            <span>{isMCU ? 'MCU Config' : 'Connect MCU / Presets'}</span>
          </button>
        </div>
      </header>

      {/* ---------------- LEFT TELEMETRY METERS ---------------- */}
      <aside className="hud-panel hud-panel-left">
        <div className="panel-title-bar">
          <Crosshair size={15} className="text-cyan" />
          <span>REAL-TIME COORDINATES</span>
        </div>

        {/* Big Coordinate Readouts */}
        <div className="coord-grid">
          <div className="coord-card coord-x">
            <div className="coord-header">
              <span className="coord-axis">X (EAST)</span>
              <span className="coord-unit">meters</span>
            </div>
            <div className="coord-value">{current.x?.toFixed(2) || '0.00'}</div>
            <div className="coord-bar-track">
              <div
                className="coord-bar-fill bar-x"
                style={{ width: `${Math.min(100, Math.abs(current.x || 0) * 1.5)}%` }}
              />
            </div>
          </div>

          <div className="coord-card coord-y">
            <div className="coord-header">
              <span className="coord-axis">Y (ALTITUDE)</span>
              <span className="coord-unit">meters</span>
            </div>
            <div className="coord-value">{current.y?.toFixed(2) || '0.00'}</div>
            <div className="coord-bar-track">
              <div
                className="coord-bar-fill bar-y"
                style={{ width: `${Math.min(100, (current.y || 0) * 1.5)}%` }}
              />
            </div>
          </div>

          <div className="coord-card coord-z">
            <div className="coord-header">
              <span className="coord-axis">Z (NORTH)</span>
              <span className="coord-unit">meters</span>
            </div>
            <div className="coord-value">{current.z?.toFixed(2) || '0.00'}</div>
            <div className="coord-bar-track">
              <div
                className="coord-bar-fill bar-z"
                style={{ width: `${Math.min(100, Math.abs(current.z || 0) * 1.5)}%` }}
              />
            </div>
          </div>
        </div>

        {/* Flight Dynamics (Speed, Distance, Attitude) */}
        <div className="panel-title-bar" style={{ marginTop: '0.85rem' }}>
          <Navigation size={15} className="text-cyan" />
          <span>FLIGHT DYNAMICS</span>
        </div>

        <div className="dynamics-grid">
          <div className="dynamics-item">
            <span className="dyn-label">TOTAL SPEED</span>
            <span className="dyn-val">{current.speed?.toFixed(2) || '0.00'} m/s</span>
            <span className="dyn-sub">{((current.speed || 0) * 3.6).toFixed(1)} km/h</span>
          </div>

          <div className="dynamics-item">
            <span className="dyn-label">TRAJECTORY LENGTH</span>
            <span className="dyn-val text-cyan">{current.distance?.toFixed(1) || '0.0'} m</span>
            <span className="dyn-sub">{trailCount} points</span>
          </div>

          <div className="dynamics-item">
            <span className="dyn-label">ROLL / PITCH</span>
            <span className="dyn-val">{current.roll?.toFixed(1)}° / {current.pitch?.toFixed(1)}°</span>
            <span className="dyn-sub">Attitude</span>
          </div>

          <div className="dynamics-item">
            <span className="dyn-label">HEADING (YAW)</span>
            <span className="dyn-val text-purple">{current.yaw?.toFixed(1)}°</span>
            <span className="dyn-sub">Compass</span>
          </div>
        </div>
      </aside>

      {/* ---------------- RIGHT CAMERA & ACTIONS PANEL ---------------- */}
      <aside className="hud-panel hud-panel-right">
        <div className="panel-title-bar">
          <Video size={15} className="text-cyan" />
          <span>CAMERA PERSPECTIVE</span>
        </div>

        <div className="camera-btn-group">
          <button
            className={`cam-mode-btn ${cameraMode === 'orbit' ? 'active' : ''}`}
            onClick={() => setCameraMode('orbit')}
          >
            <Eye size={15} />
            <span>Free Orbit (360°)</span>
          </button>
          <button
            className={`cam-mode-btn ${cameraMode === 'chase' ? 'active' : ''}`}
            onClick={() => setCameraMode('chase')}
          >
            <Navigation size={15} />
            <span>Chase / Follow Cam</span>
          </button>
          <button
            className={`cam-mode-btn ${cameraMode === 'tactical' ? 'active' : ''}`}
            onClick={() => setCameraMode('tactical')}
          >
            <Crosshair size={15} />
            <span>Top-Down Radar</span>
          </button>
          <button
            className={`cam-mode-btn ${cameraMode === 'fpv' ? 'active' : ''}`}
            onClick={() => setCameraMode('fpv')}
          >
            <Compass size={15} />
            <span>Cockpit FPV</span>
          </button>
        </div>

        {/* Trajectory Management */}
        <div className="panel-title-bar" style={{ marginTop: '1.25rem' }}>
          <Download size={15} className="text-cyan" />
          <span>FLIGHT RECORDER & LOGS</span>
        </div>

        <div className="action-buttons-stack">
          <button className="hud-btn hud-btn-outline" onClick={onExportCSV}>
            <Download size={14} />
            <span>Export Flight Log (CSV)</span>
          </button>
          <button className="hud-btn hud-btn-outline" onClick={onExportJSON}>
            <Download size={14} />
            <span>Export Trajectory (JSON)</span>
          </button>
          <button className="hud-btn hud-btn-danger" onClick={onClearTrail}>
            <Trash2 size={14} />
            <span>Reset Trajectory</span>
          </button>
        </div>
      </aside>

      {/* ---------------- BOTTOM REAL-TIME SPARKLINE DASHBOARD ---------------- */}
      <footer className="hud-bottom-bar">
        <div className="sparkline-strip">
          <Sparkline data={xHistory} color="#06b6d4" label="X Coordinate" />
          <Sparkline data={yHistory} color="#10b981" label="Altitude (Y)" />
          <Sparkline data={zHistory} color="#a855f7" label="Z Coordinate" />
          <Sparkline data={speedHistory} color="#f59e0b" label="Velocity (m/s)" />
        </div>
      </footer>
    </div>
  );
}
