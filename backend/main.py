import asyncio
import json
import math
import sys
import threading
import time
from typing import Dict, List, Optional, Set
import numpy as np
from pydantic import BaseModel, Field
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import serial
import serial.tools.list_ports

app = FastAPI(title="MCU 3D Trajectory Telemetry Server", version="1.0.0")

# Enable CORS for React frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------------------------------------------------
# Data Models
# ---------------------------------------------------------
class TelemetryData(BaseModel):
    packet_id: int = 0
    timestamp: float = Field(default_factory=time.time)
    x: float = 0.0
    y: float = 0.0
    z: float = 0.0
    vx: float = 0.0
    vy: float = 0.0
    vz: float = 0.0
    speed: float = 0.0
    distance: float = 0.0
    roll: float = 0.0
    pitch: float = 0.0
    yaw: float = 0.0
    source: str = "simulation"  # "mcu" or "simulation"
    port: Optional[str] = None
    status: str = "active"

class PortInfo(BaseModel):
    device: str
    description: str
    hwid: str

class SerialConnectRequest(BaseModel):
    port: str
    baudrate: int = 115200

class SimulatorConfig(BaseModel):
    mode: str = "helix"  # helix, drone_survey, rocket, lissajous, aerobatic, orbit
    speed_multiplier: float = 1.0
    noise_level: float = 0.05
    scale: float = 1.0

# ---------------------------------------------------------
# Global State & WebSocket Hub
# ---------------------------------------------------------
class ConnectionManager:
    def __init__(self):
        self.active_connections: Set[WebSocket] = set()
        self._lock = asyncio.Lock()

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        async with self._lock:
            self.active_connections.add(websocket)

    async def disconnect(self, websocket: WebSocket):
        async with self._lock:
            self.active_connections.discard(websocket)

    async def broadcast(self, data: dict):
        if not self.active_connections:
            return
        dead = []
        for ws in list(self.active_connections):
            try:
                await ws.send_text(json.dumps(data))
            except Exception:
                dead.append(ws)
        if dead:
            async with self._lock:
                for ws in dead:
                    self.active_connections.discard(ws)

ws_manager = ConnectionManager()

# ---------------------------------------------------------
# Telemetry State Engine
# ---------------------------------------------------------
class TelemetryEngine:
    def __init__(self):
        self.current_data = TelemetryData()
        self.history: List[dict] = []
        self.max_history = 1000
        self.packet_count = 0
        self.total_distance = 0.0
        self.prev_pos = None

        # MCU Serial connection state
        self.serial_port: Optional[serial.Serial] = None
        self.serial_port_name: Optional[str] = None
        self.serial_baudrate: int = 115200
        self.is_serial_connected = False
        self.serial_thread: Optional[threading.Thread] = None
        self.stop_serial_flag = threading.Event()

        # Simulator state
        self.simulation_mode = "helix"  # helix, drone_survey, rocket, lissajous, aerobatic, orbit
        self.sim_speed = 1.0
        self.sim_scale = 1.0
        self.sim_noise = 0.02
        self.sim_time = 0.0

        # Smoothing filter
        self.alpha = 0.85  # Exponential smoothing factor
        self.smoothed_x = 0.0
        self.smoothed_y = 0.0
        self.smoothed_z = 0.0

    def get_serial_ports(self) -> List[PortInfo]:
        ports = []
        for p in serial.tools.list_ports.comports():
            ports.append(PortInfo(
                device=p.device,
                description=p.description or "Serial Device",
                hwid=p.hwid or ""
            ))
        return ports

    def connect_serial(self, port: str, baudrate: int = 115200) -> bool:
        self.disconnect_serial()
        try:
            self.serial_port = serial.Serial(port, baudrate, timeout=1.0)
            self.serial_port_name = port
            self.serial_baudrate = baudrate
            self.is_serial_connected = True
            self.stop_serial_flag.clear()
            self.serial_thread = threading.Thread(target=self._serial_worker, daemon=True)
            self.serial_thread.start()
            return True
        except Exception as e:
            self.is_serial_connected = False
            self.serial_port = None
            raise HTTPException(status_code=400, detail=f"Failed to connect to {port}: {str(e)}")

    def disconnect_serial(self):
        self.stop_serial_flag.set()
        if self.serial_thread and self.serial_thread.is_alive():
            self.serial_thread.join(timeout=0.5)
        if self.serial_port and self.serial_port.is_open:
            try:
                self.serial_port.close()
            except Exception:
                pass
        self.serial_port = None
        self.serial_port_name = None
        self.is_serial_connected = False

    def _serial_worker(self):
        """Worker thread to continuously read serial strings from MCU"""
        while not self.stop_serial_flag.is_set() and self.serial_port and self.serial_port.is_open:
            try:
                line = self.serial_port.readline().decode('utf-8', errors='ignore').strip()
                if not line:
                    continue
                
                # Parse either JSON or CSV / key-value format
                parsed = self._parse_mcu_line(line)
                if parsed:
                    self.update_telemetry(
                        x=parsed.get("x", 0.0),
                        y=parsed.get("y", 0.0),
                        z=parsed.get("z", 0.0),
                        roll=parsed.get("roll", 0.0),
                        pitch=parsed.get("pitch", 0.0),
                        yaw=parsed.get("yaw", 0.0),
                        source="mcu"
                    )
            except Exception as e:
                time.sleep(0.01)

    def _parse_mcu_line(self, line: str) -> Optional[dict]:
        """Tries JSON parse, then CSV 'x,y,z[,r,p,y]', then 'X:10 Y:20 Z:30'."""
        try:
            if line.startswith("{") and line.endswith("}"):
                return json.loads(line)
        except Exception:
            pass

        # CSV parse: "12.3, 45.6, 78.9"
        if "," in line:
            parts = [p.strip() for p in line.split(",")]
            try:
                nums = [float(p) for p in parts if p]
                if len(nums) >= 3:
                    res = {"x": nums[0], "y": nums[1], "z": nums[2]}
                    if len(nums) >= 6:
                        res["roll"], res["pitch"], res["yaw"] = nums[3], nums[4], nums[5]
                    return res
            except ValueError:
                pass

        # Space/Tag parse: "X:12.3 Y:45.6 Z:78.9"
        lower = line.lower()
        if "x:" in lower or "y:" in lower or "z:" in lower:
            res = {}
            for token in line.replace(":", " ").replace("=", " ").split():
                pass
        return None

    def update_telemetry(self, x: float, y: float, z: float, roll: float = 0.0, pitch: float = 0.0, yaw: float = 0.0, source: str = "simulation"):
        self.packet_count += 1
        now = time.time()

        # Exponential smoothing
        if self.packet_count == 1:
            self.smoothed_x, self.smoothed_y, self.smoothed_z = x, y, z
        else:
            self.smoothed_x = self.alpha * self.smoothed_x + (1 - self.alpha) * x
            self.smoothed_y = self.alpha * self.smoothed_y + (1 - self.alpha) * y
            self.smoothed_z = self.alpha * self.smoothed_z + (1 - self.alpha) * z

        # Velocity & Distance calculation
        vx, vy, vz = 0.0, 0.0, 0.0
        dt = 1.0 / 60.0  # Approx frame interval
        if self.prev_pos:
            px, py, pz, pt = self.prev_pos
            actual_dt = max(now - pt, 0.001)
            vx = (self.smoothed_x - px) / actual_dt
            vy = (self.smoothed_y - py) / actual_dt
            vz = (self.smoothed_z - pz) / actual_dt
            step_dist = math.sqrt((self.smoothed_x - px)**2 + (self.smoothed_y - py)**2 + (self.smoothed_z - pz)**2)
            self.total_distance += step_dist
        
        self.prev_pos = (self.smoothed_x, self.smoothed_y, self.smoothed_z, now)
        speed = math.sqrt(vx**2 + vy**2 + vz**2)

        # Auto-derive orientation (yaw & pitch) from velocity if not provided by sensors
        if roll == 0.0 and pitch == 0.0 and yaw == 0.0 and speed > 0.1:
            yaw = math.degrees(math.atan2(vx, vz))
            pitch = math.degrees(math.atan2(vy, math.sqrt(vx**2 + vz**2)))

        self.current_data = TelemetryData(
            packet_id=self.packet_count,
            timestamp=now,
            x=round(self.smoothed_x, 3),
            y=round(self.smoothed_y, 3),
            z=round(self.smoothed_z, 3),
            vx=round(vx, 3),
            vy=round(vy, 3),
            vz=round(vz, 3),
            speed=round(speed, 3),
            distance=round(self.total_distance, 3),
            roll=round(roll, 2),
            pitch=round(pitch, 2),
            yaw=round(yaw, 2),
            source=source,
            port=self.serial_port_name,
            status="connected" if self.is_serial_connected else "simulating"
        )

    def step_simulation(self, dt: float = 0.016):
        """Generates realistic flight trajectories mathematically"""
        self.sim_time += dt * self.sim_speed
        t = self.sim_time
        noise = (np.random.normal(0, self.sim_noise, 3)).tolist() if self.sim_noise > 0 else [0, 0, 0]

        x, y, z = 0.0, 0.0, 0.0
        roll, pitch, yaw = 0.0, 0.0, 0.0

        if self.simulation_mode == "helix":
            radius = 25.0 * self.sim_scale
            x = radius * math.cos(0.4 * t) + noise[0]
            z = radius * math.sin(0.4 * t) + noise[2]
            y = (5.0 + 3.0 * t % 40.0) * self.sim_scale + noise[1]
            roll = math.sin(0.4 * t) * 15.0

        elif self.simulation_mode == "drone_survey":
            # Lawnmower grid pattern
            period = 8.0
            row = int(t / period) % 5
            phase = (t % period) / period
            sweep = (phase if row % 2 == 0 else (1.0 - phase)) * 60.0 - 30.0
            x = sweep * self.sim_scale + noise[0]
            z = (row * 15.0 - 30.0) * self.sim_scale + noise[2]
            y = (18.0 + 2.0 * math.sin(0.5 * t)) * self.sim_scale + noise[1]
            roll = 5.0 * math.sin(t * 2.0)

        elif self.simulation_mode == "rocket":
            # Launch, apogee arc, and parachute float
            cycle_t = t % 25.0
            if cycle_t < 12.0:
                # Ascent phase with high vertical velocity
                x = (cycle_t * 2.5) * self.sim_scale + noise[0]
                y = (0.5 * 2.2 * cycle_t**2) * self.sim_scale + noise[1]
                z = (cycle_t * 1.5) * self.sim_scale + noise[2]
                pitch = 80.0 - cycle_t * 5.0
            else:
                # Parachute descent phase
                descent_t = cycle_t - 12.0
                x = (30.0 + descent_t * 1.0 + 3.0 * math.sin(descent_t)) * self.sim_scale + noise[0]
                y = max(158.4 - descent_t * 10.0, 2.0) * self.sim_scale + noise[1]
                z = (18.0 + 2.0 * math.cos(descent_t)) * self.sim_scale + noise[2]
                pitch = -10.0 + 5.0 * math.sin(descent_t * 2.0)

        elif self.simulation_mode == "lissajous":
            # 3D Knot trajectory
            x = (30.0 * math.sin(0.5 * t)) * self.sim_scale + noise[0]
            y = (20.0 + 15.0 * math.sin(0.8 * t)) * self.sim_scale + noise[1]
            z = (30.0 * math.sin(0.3 * t + math.pi / 4)) * self.sim_scale + noise[2]
            roll = math.cos(0.5 * t) * 25.0

        elif self.simulation_mode == "aerobatic":
            # Dynamic loops and barrel rolls
            radius = 20.0 * self.sim_scale
            x = radius * math.cos(0.7 * t) + noise[0]
            z = radius * math.sin(0.7 * t) + noise[2]
            y = (25.0 + 15.0 * math.sin(1.4 * t)) * self.sim_scale + noise[1]
            roll = (t * 180.0) % 360.0 - 180.0
            pitch = math.cos(1.4 * t) * 45.0

        elif self.simulation_mode == "orbit":
            # Smooth circular patrol
            radius = 35.0 * self.sim_scale
            x = radius * math.cos(0.3 * t) + noise[0]
            z = radius * math.sin(0.3 * t) + noise[2]
            y = (15.0 + 4.0 * math.sin(0.6 * t)) * self.sim_scale + noise[1]
            roll = 10.0

        self.update_telemetry(x, y, z, roll, pitch, yaw, source="simulation")

    def reset_path(self):
        self.packet_count = 0
        self.total_distance = 0.0
        self.sim_time = 0.0
        self.prev_pos = None

engine = TelemetryEngine()

# ---------------------------------------------------------
# REST Endpoints
# ---------------------------------------------------------
@app.get("/api/status")
def get_status():
    return {
        "status": "online",
        "is_serial_connected": engine.is_serial_connected,
        "serial_port": engine.serial_port_name,
        "baudrate": engine.serial_baudrate,
        "simulation_mode": engine.simulation_mode,
        "sim_speed": engine.sim_speed,
        "sim_scale": engine.sim_scale,
        "packet_count": engine.packet_count,
        "total_distance": round(engine.total_distance, 2)
    }

@app.get("/api/ports", response_model=List[PortInfo])
def list_ports():
    return engine.get_serial_ports()

@app.post("/api/connect")
def connect_port(req: SerialConnectRequest):
    success = engine.connect_serial(req.port, req.baudrate)
    return {"success": success, "port": req.port, "baudrate": req.baudrate}

@app.post("/api/disconnect")
def disconnect_port():
    engine.disconnect_serial()
    return {"success": True, "message": "Disconnected from serial port"}

@app.post("/api/simulator/config")
def update_simulator_config(config: SimulatorConfig):
    engine.simulation_mode = config.mode
    engine.sim_speed = config.speed_multiplier
    engine.sim_noise = config.noise_level
    engine.sim_scale = config.scale
    return {"success": True, "config": config}

@app.post("/api/reset")
def reset_telemetry():
    engine.reset_path()
    return {"success": True, "message": "Trajectory reset"}

# ---------------------------------------------------------
# WebSocket Telemetry Stream (60 Hz)
# ---------------------------------------------------------
@app.websocket("/ws/telemetry")
async def websocket_telemetry_endpoint(websocket: WebSocket):
    await ws_manager.connect(websocket)
    try:
        while True:
            # If no MCU is connected, step the math flight simulator
            if not engine.is_serial_connected:
                engine.step_simulation(dt=0.016)
            
            # Send current telemetry packet to client
            await websocket.send_text(engine.current_data.model_dump_json())
            await asyncio.sleep(0.016)  # ~60 updates per second
    except WebSocketDisconnect:
        await ws_manager.disconnect(websocket)
    except Exception:
        await ws_manager.disconnect(websocket)

if __name__ == "__main__":
    import uvicorn
    print("Starting MCU 3D Trajectory Telemetry Server on http://0.0.0.0:8000")
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
