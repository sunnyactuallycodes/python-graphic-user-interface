import React, { useState } from 'react';
import {
  Cpu,
  RefreshCw,
  Zap,
  Sliders,
  Sun,
  Cloud,
  Layers,
  Palette,
  X,
  Radio,
  Compass,
  Activity,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';

export function HardwareControlModal({
  isOpen,
  onClose,
  availablePorts = [],
  onRefreshPorts,
  onConnectSerial,
  onDisconnectSerial,
  isSerialConnected,
  connectedPort,
  onSetSimulatorConfig,
  currentSimMode = 'helix',
  cloudDensity,
  setCloudDensity,
  sunAngle,
  setSunAngle,
  trailColor,
  setTrailColor,
  showGroundProjection,
  setShowGroundProjection,
  showRadar,
  setShowRadar,
  showMountains,
  setShowMountains,
}) {
  const [selectedPort, setSelectedPort] = useState('');
  const [baudrate, setBaudrate] = useState(115200);
  const [simSpeed, setSimSpeed] = useState(1.0);
  const [simNoise, setSimNoise] = useState(0.02);
  const [simScale, setSimScale] = useState(1.0);
  const [activeTab, setActiveTab] = useState('hardware'); // 'hardware' | 'simulator' | 'environment'
  const [statusMsg, setStatusMsg] = useState(null);
  const [isConnecting, setIsConnecting] = useState(false);

  if (!isOpen) return null;

  const handleConnect = async () => {
    if (!selectedPort && availablePorts.length > 0) {
      setSelectedPort(availablePorts[0].device);
    }
    const portToUse = selectedPort || (availablePorts[0] ? availablePorts[0].device : '');
    if (!portToUse) {
      setStatusMsg({ type: 'error', text: 'Please select a valid COM / Serial port.' });
      return;
    }
    setIsConnecting(true);
    setStatusMsg(null);
    try {
      await onConnectSerial(portToUse, baudrate);
      setStatusMsg({ type: 'success', text: `Connected to ${portToUse} at ${baudrate} baud.` });
    } catch (err) {
      setStatusMsg({ type: 'error', text: err.message || 'Connection failed' });
    } finally {
      setIsConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    try {
      await onDisconnectSerial();
      setStatusMsg({ type: 'success', text: 'Disconnected from MCU serial port.' });
    } catch (err) {
      setStatusMsg({ type: 'error', text: 'Failed to disconnect' });
    }
  };

  const handleSimPreset = (mode) => {
    onSetSimulatorConfig(mode, simSpeed, simNoise, simScale);
  };

  const colorPresets = [
    { label: 'Cyan Glow', color: '#06b6d4' },
    { label: 'Neon Purple', color: '#a855f7' },
    { label: 'Emerald Laser', color: '#10b981' },
    { label: 'Solar Amber', color: '#f59e0b' },
    { label: 'Plasma Red', color: '#ef4444' },
  ];

  const simModes = [
    { id: 'helix', name: 'Spiral Ascent', desc: 'Upward helical trajectory with bank angle' },
    { id: 'drone_survey', name: 'Drone Lawnmower Grid', desc: 'Autonomous aerial mapping search grid' },
    { id: 'rocket', name: 'Rocket Suborbital Arc', desc: 'High-G booster ascent and parachute descent' },
    { id: 'lissajous', name: '3D Lissajous Knot', desc: 'Complex harmonic 3D loop trajectory' },
    { id: 'aerobatic', name: 'Aerobatic Maneuvers', desc: 'Dynamic loops, rolls, and high-G pitch' },
    { id: 'orbit', name: 'Patrol Orbit', desc: 'Continuous circular surveillance path' },
  ];

  return (
    <div className="modal-backdrop">
      <div className="modal-window">
        {/* Header */}
        <div className="modal-header">
          <div className="modal-title-group">
            <Cpu className="modal-icon text-cyan" />
            <div>
              <h2 className="modal-title">Hardware Link & Environment Config</h2>
              <p className="modal-subtitle">Configure MCU Serial Ports, Flight Simulation & 3D Atmosphere</p>
            </div>
          </div>
          <button className="modal-close-btn" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="modal-tabs">
          <button
            className={`modal-tab ${activeTab === 'hardware' ? 'active' : ''}`}
            onClick={() => setActiveTab('hardware')}
          >
            <Radio size={16} /> MCU Hardware (Serial)
          </button>
          <button
            className={`modal-tab ${activeTab === 'simulator' ? 'active' : ''}`}
            onClick={() => setActiveTab('simulator')}
          >
            <Activity size={16} /> Flight Simulator
          </button>
          <button
            className={`modal-tab ${activeTab === 'environment' ? 'active' : ''}`}
            onClick={() => setActiveTab('environment')}
          >
            <Layers size={16} /> Atmosphere & Terrain
          </button>
        </div>

        {/* Status Notification */}
        {statusMsg && (
          <div className={`status-banner ${statusMsg.type}`}>
            {statusMsg.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
            <span>{statusMsg.text}</span>
          </div>
        )}

        {/* Tab Content */}
        <div className="modal-body">
          {/* TAB 1: MCU HARDWARE LINK */}
          {activeTab === 'hardware' && (
            <div className="tab-pane">
              <div className="card-section">
                <div className="section-header">
                  <span className="section-badge">UART / USB CDC</span>
                  <h3>Microcontroller Serial Connection</h3>
                </div>
                <p className="section-desc">
                  Connect directly to your Arduino, ESP32, STM32, or IMU/GPS unit over USB Serial. Coordinates will stream directly into the 3D scene.
                </p>

                <div className="grid-2col">
                  <div className="form-group">
                    <div className="form-label-row">
                      <label>Detected Serial Port</label>
                      <button className="icon-link-btn" onClick={onRefreshPorts} title="Refresh Ports">
                        <RefreshCw size={14} /> Refresh
                      </button>
                    </div>
                    <select
                      className="form-select"
                      value={selectedPort || connectedPort || ''}
                      onChange={(e) => setSelectedPort(e.target.value)}
                      disabled={isSerialConnected}
                    >
                      {availablePorts.length === 0 ? (
                        <option value="">No USB Serial Ports Detected</option>
                      ) : (
                        availablePorts.map((p) => (
                          <option key={p.device} value={p.device}>
                            {p.device} - {p.description}
                          </option>
                        ))
                      )}
                    </select>
                  </div>

                  <div className="form-group">
                    <label>Baud Rate</label>
                    <select
                      className="form-select"
                      value={baudrate}
                      onChange={(e) => setBaudrate(Number(e.target.value))}
                      disabled={isSerialConnected}
                    >
                      <option value={9600}>9600</option>
                      <option value={19200}>19200</option>
                      <option value={38400}>38400</option>
                      <option value={57600}>57600</option>
                      <option value={115200}>115200 (Recommended)</option>
                      <option value={230400}>230400</option>
                      <option value={921600}>921600</option>
                    </select>
                  </div>
                </div>

                <div className="action-row">
                  {isSerialConnected ? (
                    <button className="btn btn-danger" onClick={handleDisconnect}>
                      Disconnect {connectedPort}
                    </button>
                  ) : (
                    <button
                      className="btn btn-primary"
                      onClick={handleConnect}
                      disabled={isConnecting || availablePorts.length === 0}
                    >
                      {isConnecting ? 'Connecting...' : 'Connect Hardware MCU'}
                    </button>
                  )}
                </div>
              </div>

              {/* Sample Packet Protocol Card */}
              <div className="card-section subtle">
                <h4>MCU Transmission Protocol (JSON or CSV)</h4>
                <p className="code-hint">Send any of these formatted strings from your MCU at 115200 baud:</p>
                <pre className="code-snippet">
                  {`{"x": 14.2, "y": 28.5, "z": 9.1, "roll": 2.1, "pitch": -1.0, "yaw": 85.0}\n` +
                    `// Or simple comma-separated: 14.2, 28.5, 9.1, 2.1, -1.0, 85.0`}
                </pre>
              </div>
            </div>
          )}

          {/* TAB 2: FLIGHT SIMULATOR */}
          {activeTab === 'simulator' && (
            <div className="tab-pane">
              <div className="card-section">
                <div className="section-header">
                  <span className="section-badge badge-cyan">Virtual Trajectory Engine</span>
                  <h3>Preset Trajectory Profiles</h3>
                </div>
                <p className="section-desc">
                  Select a pre-calculated mathematical flight profile to test 3D rendering, ribbons, clouds, and mission control telemetry:
                </p>

                <div className="preset-grid">
                  {simModes.map((mode) => (
                    <div
                      key={mode.id}
                      className={`preset-card ${currentSimMode === mode.id ? 'selected' : ''}`}
                      onClick={() => handleSimPreset(mode.id)}
                    >
                      <div className="preset-header">
                        <h4>{mode.name}</h4>
                        {currentSimMode === mode.id && <span className="active-dot" />}
                      </div>
                      <p>{mode.desc}</p>
                    </div>
                  ))}
                </div>

                <div className="grid-3col" style={{ marginTop: '1.25rem' }}>
                  <div className="form-group">
                    <label>Speed Multiplier: {simSpeed}x</label>
                    <input
                      type="range"
                      min="0.2"
                      max="3.0"
                      step="0.1"
                      value={simSpeed}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value);
                        setSimSpeed(val);
                        onSetSimulatorConfig(currentSimMode, val, simNoise, simScale);
                      }}
                    />
                  </div>

                  <div className="form-group">
                    <label>Scale Factor: {simScale}x</label>
                    <input
                      type="range"
                      min="0.5"
                      max="2.5"
                      step="0.1"
                      value={simScale}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value);
                        setSimScale(val);
                        onSetSimulatorConfig(currentSimMode, simSpeed, simNoise, val);
                      }}
                    />
                  </div>

                  <div className="form-group">
                    <label>Sensor Jitter / Noise</label>
                    <input
                      type="range"
                      min="0.0"
                      max="0.15"
                      step="0.01"
                      value={simNoise}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value);
                        setSimNoise(val);
                        onSetSimulatorConfig(currentSimMode, simSpeed, val, simScale);
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: ATMOSPHERE & TERRAIN */}
          {activeTab === 'environment' && (
            <div className="tab-pane">
              <div className="card-section">
                <div className="section-header">
                  <span className="section-badge badge-purple">3D Photorealism</span>
                  <h3>Atmosphere, Sky & Terrain Settings</h3>
                </div>

                <div className="grid-2col">
                  <div className="form-group">
                    <div className="form-label-row">
                      <label>
                        <Cloud size={14} /> Volumetric Cloud Density: {cloudDensity.toFixed(1)}
                      </label>
                    </div>
                    <input
                      type="range"
                      min="0.0"
                      max="2.0"
                      step="0.1"
                      value={cloudDensity}
                      onChange={(e) => setCloudDensity(parseFloat(e.target.value))}
                    />
                  </div>

                  <div className="form-group">
                    <div className="form-label-row">
                      <label>
                        <Sun size={14} /> Solar Elevation / Time of Day: {sunAngle}°
                      </label>
                    </div>
                    <input
                      type="range"
                      min="5"
                      max="90"
                      step="1"
                      value={sunAngle}
                      onChange={(e) => setSunAngle(parseInt(e.target.value, 10))}
                    />
                  </div>
                </div>

                <div className="form-group" style={{ marginTop: '1.25rem' }}>
                  <label>Trajectory Glow Color</label>
                  <div className="color-presets-row">
                    {colorPresets.map((c) => (
                      <button
                        key={c.color}
                        className={`color-pill ${trailColor === c.color ? 'active' : ''}`}
                        style={{ '--pill-color': c.color }}
                        onClick={() => setTrailColor(c.color)}
                      >
                        <span className="color-swatch" style={{ background: c.color }} />
                        {c.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="toggle-list" style={{ marginTop: '1.25rem' }}>
                  <label className="toggle-item">
                    <input
                      type="checkbox"
                      checked={showGroundProjection}
                      onChange={(e) => setShowGroundProjection(e.target.checked)}
                    />
                    <span>Show Ground Projection Line & Altitude Ring</span>
                  </label>

                  <label className="toggle-item">
                    <input
                      type="checkbox"
                      checked={showRadar}
                      onChange={(e) => setShowRadar(e.target.checked)}
                    />
                    <span>Show Concentric Distance Radar Rings (100m)</span>
                  </label>

                  <label className="toggle-item">
                    <input
                      type="checkbox"
                      checked={showMountains}
                      onChange={(e) => setShowMountains(e.target.checked)}
                    />
                    <span>Show Perimeter Mountain Horizon</span>
                  </label>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
