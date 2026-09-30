import { useState, useEffect, useRef, useCallback } from 'react';

const API_BASE = 'http://localhost:8000';
const WS_URL = 'ws://localhost:8000/ws/telemetry';

export function useTelemetryWS(maxTrailPoints = 600) {
  const [current, setCurrent] = useState({
    packet_id: 0,
    timestamp: Date.now() / 1000,
    x: 0,
    y: 0,
    z: 0,
    vx: 0,
    vy: 0,
    vz: 0,
    speed: 0,
    distance: 0,
    roll: 0,
    pitch: 0,
    yaw: 0,
    source: 'simulation',
    port: null,
    status: 'connecting',
  });

  const [trail, setTrail] = useState([]);
  const [history, setHistory] = useState([]);
  const [connectionStatus, setConnectionStatus] = useState('connecting'); // 'connected' | 'disconnected' | 'connecting'
  const [packetRate, setPacketRate] = useState(0);
  const [availablePorts, setAvailablePorts] = useState([]);
  const [serverStatus, setServerStatus] = useState(null);

  const wsRef = useRef(null);
  const trailRef = useRef([]);
  const historyRef = useRef([]);
  const packetCounterRef = useRef(0);
  const lastPacketTimeRef = useRef(Date.now());
  const reconnectTimeoutRef = useRef(null);

  // Fetch available COM / Serial ports
  const fetchPorts = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/api/ports`);
      if (res.ok) {
        const ports = await res.json();
        setAvailablePorts(ports);
      }
    } catch (err) {
      console.warn('Could not fetch serial ports:', err);
    }
  }, []);

  // Fetch server status
  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/api/status`);
      if (res.ok) {
        const status = await res.json();
        setServerStatus(status);
      }
    } catch (err) {
      console.warn('Could not fetch server status:', err);
    }
  }, []);

  // Connect Serial port
  const connectSerial = async (port, baudrate = 115200) => {
    try {
      const res = await fetch(`${API_BASE}/api/connect`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ port, baudrate: parseInt(baudrate, 10) }),
      });
      const data = await res.json();
      await fetchStatus();
      return data;
    } catch (err) {
      throw new Error(err.message || 'Failed to connect serial port');
    }
  };

  // Disconnect Serial port
  const disconnectSerial = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/disconnect`, { method: 'POST' });
      const data = await res.json();
      await fetchStatus();
      return data;
    } catch (err) {
      console.error('Failed to disconnect serial:', err);
    }
  };

  // Change Simulator Mode
  const setSimulatorMode = async (mode, speed_multiplier = 1.0, noise_level = 0.02, scale = 1.0) => {
    try {
      const res = await fetch(`${API_BASE}/api/simulator/config`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode, speed_multiplier, noise_level, scale }),
      });
      const data = await res.json();
      await fetchStatus();
      return data;
    } catch (err) {
      console.error('Failed to set simulator config:', err);
    }
  };

  // Clear Trajectory
  const clearTrail = () => {
    trailRef.current = [];
    historyRef.current = [];
    setTrail([]);
    setHistory([]);
    fetch(`${API_BASE}/api/reset`, { method: 'POST' }).catch(() => {});
  };

  // Export CSV
  const exportCSV = () => {
    if (historyRef.current.length === 0) return;
    const headers = ['Packet_ID', 'Timestamp', 'X', 'Y', 'Z', 'Vx', 'Vy', 'Vz', 'Speed', 'Distance', 'Roll', 'Pitch', 'Yaw', 'Source'];
    const rows = historyRef.current.map((p) => [
      p.packet_id,
      p.timestamp,
      p.x,
      p.y,
      p.z,
      p.vx,
      p.vy,
      p.vz,
      p.speed,
      p.distance,
      p.roll,
      p.pitch,
      p.yaw,
      p.source,
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `trajectory_flight_log_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Export JSON
  const exportJSON = () => {
    if (historyRef.current.length === 0) return;
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(historyRef.current, null, 2));
    const link = document.createElement('a');
    link.setAttribute('href', dataStr);
    link.setAttribute('download', `trajectory_flight_log_${Date.now()}.json`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Main WebSocket Lifecycle
  useEffect(() => {
    let isMounted = true;

    const connectWebSocket = () => {
      if (wsRef.current && (wsRef.current.readyState === WebSocket.OPEN || wsRef.current.readyState === WebSocket.CONNECTING)) {
        return;
      }

      setConnectionStatus('connecting');
      const ws = new WebSocket(WS_URL);
      wsRef.current = ws;

      ws.onopen = () => {
        if (!isMounted) return;
        setConnectionStatus('connected');
        fetchStatus();
        fetchPorts();
      };

      ws.onmessage = (event) => {
        if (!isMounted) return;
        try {
          const data = JSON.parse(event.data);
          setCurrent(data);

          // Update trail buffer (Vector3 array for Three.js Line)
          const newPoint = [data.x, data.y, data.z];
          trailRef.current.push(newPoint);
          if (trailRef.current.length > maxTrailPoints) {
            trailRef.current.shift();
          }
          setTrail([...trailRef.current]);

          // Update telemetry chart history buffer (keep last 60 points)
          historyRef.current.push(data);
          if (historyRef.current.length > 3000) {
            historyRef.current.shift();
          }
          setHistory(historyRef.current.slice(-50));

          packetCounterRef.current += 1;
        } catch (e) {
          console.error('Error parsing telemetry JSON:', e);
        }
      };

      ws.onclose = () => {
        if (!isMounted) return;
        setConnectionStatus('disconnected');
        // Auto-reconnect after 2 seconds
        reconnectTimeoutRef.current = setTimeout(connectWebSocket, 2000);
      };

      ws.onerror = () => {
        if (!isMounted) return;
        setConnectionStatus('disconnected');
        ws.close();
      };
    };

    connectWebSocket();

    // Hz (packet rate) calculator interval
    const rateInterval = setInterval(() => {
      const now = Date.now();
      const elapsed = (now - lastPacketTimeRef.current) / 1000;
      if (elapsed > 0) {
        setPacketRate(Math.round(packetCounterRef.current / elapsed));
      }
      packetCounterRef.current = 0;
      lastPacketTimeRef.current = now;
    }, 1000);

    const portInterval = setInterval(fetchPorts, 5000);

    return () => {
      isMounted = false;
      clearInterval(rateInterval);
      clearInterval(portInterval);
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [maxTrailPoints, fetchPorts, fetchStatus]);

  return {
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
  };
}
