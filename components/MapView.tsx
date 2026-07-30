'use client';

import React, { useEffect, useState, useRef, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Compass, Navigation, Eye, Play, Square, AlertTriangle, CloudRain, Shield, AlertOctagon, Car, Sun, RefreshCw, Sliders, X, Radio, ArrowUp, ArrowLeft, ArrowRight, ArrowUpLeft, ArrowUpRight, RotateCcw, Sparkles, Layers, Smartphone, MapPin, Globe, LocateFixed } from 'lucide-react';

// Fix Leaflet icons in Next.js safely
const defaultIcon = typeof window !== 'undefined' ? L.icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
}) : null as any;

interface MapProps {
  stops: any[];
  geometry?: any;
  routeSegments?: any[];
  alternatives?: any[];
  isNavigationScreen?: boolean;
  navIndex?: number;
  onRouteRecalculated?: (newResult: any) => void;
}

// Function to calculate exact heading/bearing between two coordinates
function getBearing(lat1: number, lon1: number, lat2: number, lon2: number) {
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const lat1Rad = lat1 * Math.PI / 180;
  const lat2Rad = lat2 * Math.PI / 180;
  const y = Math.sin(dLon) * Math.cos(lat2Rad);
  const x = Math.cos(lat1Rad) * Math.sin(lat2Rad) - Math.sin(lat1Rad) * Math.cos(lat2Rad) * Math.cos(dLon);
  let brng = Math.atan2(y, x) * 180 / Math.PI;
  return (brng + 360) % 360;
}

// Function to calculate exact distance in KM between two latitude/longitude pairs
function calculateDistanceInKm(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371; // Earth radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Highly optimized continuous rotation tracking with mathematical damping (low-pass filter) to prevent structural wrapping-spin bugs
function calculateSmoothAngle(currentSmooth: number, target: number) {
  let diff = (target - currentSmooth) % 360;
  if (diff < -180) {
    diff += 360;
  } else if (diff > 180) {
    diff -= 360;
  }
  // Low-pass filter damping coefficient (0.12) to create smooth, cinematic rotation over time
  const nextAngle = currentSmooth + diff * 0.12;
  return (nextAngle + 360) % 360;
}

// Recenter mechanism that adapts to general view or simulation view with unlocked map interaction
function MapController({ 
  stops, 
  geometry, 
  carCoords, 
  isDriving, 
  is3DMode,
  mapOrientation,
  isNavigationScreen,
  isAutoFollowing,
  onUserPan
}: { 
  stops: any[]; 
  geometry?: any; 
  carCoords: [number, number] | null; 
  isDriving: boolean;
  is3DMode: boolean;
  mapOrientation: 'north' | 'track';
  isNavigationScreen: boolean;
  isAutoFollowing: boolean;
  onUserPan: () => void;
}) {
  const map = useMap();

  // Listen for physical user gestures on Leaflet map to release lock and allow free pan/zoom/rotate
  useEffect(() => {
    if (!map) return;
    const handleUserGesture = (e: any) => {
      if (e.originalEvent) {
        onUserPan();
      }
    };
    map.on('movestart dragstart touchstart', handleUserGesture);
    return () => {
      map.off('movestart dragstart touchstart', handleUserGesture);
    };
  }, [map, onUserPan]);

  useEffect(() => {
    if (!isAutoFollowing) return; // User is manually panning/exploring map, do not override position

    if (isNavigationScreen && carCoords) {
      const zoomLevel = 19.5;
      map.setView(carCoords, zoomLevel, { animate: true, duration: 0.5, easeLinearity: 1 });
    } else if (isDriving && carCoords) {
      const zoomLevel = is3DMode ? 19.5 : 18.2;
      map.setView(carCoords, zoomLevel, { animate: true, duration: 0.5, easeLinearity: 1 });
    } else {
      if (geometry?.coordinates?.length > 0) {
        const bounds = L.latLngBounds(geometry.coordinates.map((c: any) => [c[1], c[0]]));
        map.fitBounds(bounds, { padding: [55, 55], animate: false });
      } else if (stops.length > 0) {
        const bounds = L.latLngBounds(stops.map(s => [s.lat, s.lon]));
        map.fitBounds(bounds, { padding: [55, 55], animate: false });
      }
    }
  }, [stops, map, geometry, carCoords, isDriving, is3DMode, isNavigationScreen, isAutoFollowing]);

  useEffect(() => {
    const invalidate = () => {
      if (map) {
        map.invalidateSize();
      }
    };

    const timer1 = setTimeout(invalidate, 100);
    const timer2 = setTimeout(invalidate, 450);

    window.addEventListener('resize', invalidate);

    let observer: ResizeObserver | null = null;
    try {
      const container = map.getContainer();
      if (container) {
        observer = new ResizeObserver(() => {
          invalidate();
        });
        observer.observe(container);
      }
    } catch (e) {
      console.warn("ResizeObserver setup skipped:", e);
    }

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      window.removeEventListener('resize', invalidate);
      if (observer) {
        observer.disconnect();
      }
    };
  }, [map, is3DMode, stops, geometry]);

  // Keep interaction ALWAYS enabled so user can pan, zoom, and rotate like Google Maps
  useEffect(() => {
    if (!map) return;
    map.dragging.enable();
    map.touchZoom.enable();
    map.doubleClickZoom.enable();
    map.scrollWheelZoom.enable();
    map.boxZoom.enable();
    map.keyboard.enable();
  }, [map]);

  // Recenter Event Listener
  useEffect(() => {
    const handleRecenter = () => {
      if (!map) return;
      if (carCoords) {
        const zoomLevel = isNavigationScreen ? 19.5 : (is3DMode ? 19.5 : 18.2);
        map.setView(carCoords, zoomLevel, { animate: true, duration: 0.8 });
      } else {
        if (geometry?.coordinates?.length > 0) {
          const bounds = L.latLngBounds(geometry.coordinates.map((c: any) => [c[1], c[0]]));
          map.fitBounds(bounds, { padding: [55, 55], animate: true, duration: 0.8 });
        } else if (stops.length > 0) {
          const bounds = L.latLngBounds(stops.map(s => [s.lat, s.lon]));
          map.fitBounds(bounds, { padding: [55, 55], animate: true, duration: 0.8 });
        }
      }
    };
    window.addEventListener('recenter-map', handleRecenter);
    return () => window.removeEventListener('recenter-map', handleRecenter);
  }, [map, carCoords, geometry, stops, is3DMode, isNavigationScreen]);

  return null;
}

const getWeatherEmoji = (desc?: string, main?: string) => {
  const text = (desc || main || '').toLowerCase();
  if (text.includes('chuva') || text.includes('rain') || text.includes('drizzle') || text.includes('garoa')) return '🌧️';
  if (text.includes('tempestade') || text.includes('thunderstorm') || text.includes('raio')) return '⛈️';
  if (text.includes('nuvem') || text.includes('cloud') || text.includes('nublado')) return '☁️';
  if (text.includes('neve') || text.includes('snow') || text.includes('gelo')) return '❄️';
  if (text.includes('névoa') || text.includes('fog') || text.includes('mist') || text.includes('fum')) return '🌫️';
  return '☀️';
};

const createArrowIcon = (angle: number) => {
  return L.divIcon({
    html: `
      <div style="
        transform: rotate(${angle}deg);
        display: flex;
        align-items: center;
        justify-content: center;
        width: 16px;
        height: 16px;
        pointer-events: none;
      ">
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="#D1A054" stroke="#2D2C2A" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="filter: drop-shadow(0 0 4px rgba(209,160,84, 0.7));">
          <polyline points="18 15 12 9 6 15"></polyline>
        </svg>
      </div>
    `,
    className: '',
    iconSize: [16, 16],
    iconAnchor: [8, 8]
  });
};

function getRouteArrows(polyline: [number, number][], count = 18) {
  if (polyline.length < 2) return [];
  const arrows = [];
  const interval = Math.max(1, Math.floor(polyline.length / (count + 1)));
  for (let i = interval; i < polyline.length - 2; i += interval) {
    const pt1 = polyline[i];
    const pt2 = polyline[i + 1];
    if (pt1 && pt2) {
      const lat1 = pt1[0] * Math.PI / 180;
      const lon1 = pt1[1] * Math.PI / 180;
      const lat2 = pt2[0] * Math.PI / 180;
      const lon2 = pt2[1] * Math.PI / 180;
      const dLon = lon2 - lon1;
      const y = Math.sin(dLon) * Math.cos(lat2);
      const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLon);
      const bearing = (Math.atan2(y, x) * 180 / Math.PI + 360) % 360;
      
      arrows.push({
        coord: pt1,
        angle: bearing
      });
    }
  }
  return arrows;
}

// Custom icon creator for numbered tour markers (des-tilted to remain vertical and perpendicular)
const createNumberedIcon = (
  number: number, 
  isLast: boolean, 
  isFirst: boolean, 
  smoothHeading: number, 
  is3D: boolean, 
  isDriving: boolean,
  mapOrientation: 'north' | 'track',
  weather?: any,
  showWeatherLayer?: boolean
) => {
  const color = isFirst ? '#D1A054' : isLast ? '#F43F5E' : '#D1A054';
  
  // No modo estável 'north', o pin de parada compensa apenas a inclinação 3D vertical (rotateX).
  // No modo 'track', se estiver dirigindo, compensamos também a rotação Z do mapa inteiro.
  let rotationAdjustment = '';
  if (is3D) {
    if (mapOrientation === 'track' && isDriving) {
      rotationAdjustment = `rotateZ(${smoothHeading}deg) rotateX(-50deg) translateZ(8px)`;
    } else {
      rotationAdjustment = 'rotateZ(0deg) rotateX(-45deg) translateZ(8px)';
    }
  }

  const tempLabel = showWeatherLayer && weather?.main?.temp != null
    ? `<div style="
        position: absolute;
        top: -30px;
        left: 50%;
        transform: translateX(-50%);
        background: rgba(15, 23, 42, 0.95);
        border: 1px solid rgba(209,160,84, 0.6);
        border-radius: 8px;
        padding: 3px 6px;
        font-size: 10px;
        color: #D1A054;
        font-weight: 900;
        white-space: nowrap;
        box-shadow: 0 4px 10px rgba(0,0,0,0.5);
        display: flex;
        align-items: center;
        gap: 2.5px;
        z-index: 1000;
      ">
        <span style="font-size: 10px; line-height: 1;">${getWeatherEmoji(weather.weather?.[0]?.description, weather.weather?.[0]?.main)}</span>
        <span style="font-family: sans-serif; font-size: 10px; font-weight: 950; letter-spacing: -0.2px;">${Math.round(weather.main.temp)}°</span>
       </div>`
    : '';
  
  return L.divIcon({
    html: `
      <div style="position: relative;" class="animated-marker">
        ${tempLabel}
        <div class="custom-marker-wrapper" style="
          transform: ${rotationAdjustment};
          transform-origin: bottom center;
          transition: transform 1s linear;
          background-color: ${color};
          color: #2D2C2A;
          width: 32px;
          height: 32px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 900;
          font-size: 13px;
          border: 2.5px solid #2D2C2A;
          box-shadow: 0 4px 12px ${color}80;
        ">
          ${number}
        </div>
      </div>
    `,
    className: '',
    iconSize: [32, 32],
    iconAnchor: [16, 32], // Anchor bottom-center for perfect accuracy
  });
};

// Custom car vehicle icon (pulsing glowing neon or compass)
const createCarIcon = (
  heading: number, 
  smoothHeading: number, 
  is3D: boolean, 
  isDriving: boolean,
  mapOrientation: 'north' | 'track',
  isNavigationScreen = false
) => {
  if (isNavigationScreen) {
    return L.divIcon({
      html: `
        <div style="
          display: flex;
          align-items: center;
          justify-content: center;
          width: 54px;
          height: 54px;
          position: relative;
        ">
          <!-- Outer Compass Dial (Locked North-up for ultra UX stability) -->
          <div style="
            position: absolute;
            width: 48px;
            height: 48px;
            border-radius: 50%;
            border: 2px solid rgba(209,160,84, 0.55);
            background: rgba(9, 13, 22, 0.85);
            box-shadow: 0 0 15px rgba(209,160,84, 0.25);
            display: flex;
            align-items: center;
            justify-content: center;
          ">
            <span style="
              position: absolute;
              top: 1px;
              font-family: monospace;
              font-size: 10px;
              font-weight: 950;
              color: #ff453a;
              text-shadow: 0 0 6px rgba(255, 69, 58, 0.75);
            ">N</span>
            <div style="
              position: absolute;
              width: 4px;
              height: 4px;
              background-color: #D1A054;
              border-radius: 50%;
            "></div>
          </div>
          
          <!-- Inner Navigation Compass Pointer (Apontando sempre para cima / Norte) -->
          <div style="
            transform: rotate(${mapOrientation === 'track' ? 0 : smoothHeading}deg);
            transition: transform 0.25s cubic-bezier(0.16, 1, 0.3, 1);
            display: flex;
            align-items: center;
            justify-content: center;
            width: 54px;
            height: 54px;
            z-index: 2;
          ">
            <svg viewBox="0 0 24 24" fill="currentColor" style="width: 28px; height: 28px; color: #D1A054; filter: drop-shadow(0 0 8px #D1A054);">
              <path d="M12 2L4.5 20.29L5.21 21L12 18L18.79 21L19.5 20.29L12 2Z" />
            </svg>
          </div>
        </div>
      `,
      className: '',
      iconSize: [54, 54],
      iconAnchor: [27, 27], // Center anchor for perfectly centered rotation symmetry
    });
  }

  // O ponteiro do carro permanece apontando para o Norte / Pra Cima (0 deg) no modo de rotação do mapa, girando o mapa ao redor dele
  let rotationAdjustment = '';
  if (is3D) {
    if (mapOrientation === 'track') {
      rotationAdjustment = 'rotateX(-50deg) rotate(0deg)';
    } else {
      rotationAdjustment = `rotateX(-45deg) rotate(${smoothHeading}deg)`;
    }
  } else {
    if (mapOrientation === 'track') {
      rotationAdjustment = 'rotate(0deg)';
    } else {
      rotationAdjustment = `rotate(${smoothHeading}deg)`;
    }
  }

  return L.divIcon({
    html: `
      <div style="
        transform: ${rotationAdjustment};
        transition: transform 1s linear;
        display: flex;
        align-items: center;
        justify-content: center;
        width: 48px;
        height: 48px;
      ">
        <!-- Pulsing locator glow circle -->
        <div style="
          position: absolute;
          width: 38px;
          height: 38px;
          border-radius: 50%;
          background: rgba(209,160,84, 0.28);
          border: 1.5px solid rgba(209,160,84, 0.7);
          box-shadow: 0 0 22px rgba(209,160,84, 0.95);
          animation: pulseMarker 1.2s infinite alternate ease-in-out;
        "></div>
        <!-- Directional vehicle arrow pointing to front -->
        <svg viewBox="0 0 24 24" fill="currentColor" style="width: 26px; height: 26px; color: #D1A054; filter: drop-shadow(0 0 8px #D1A054); transform: translateY(-1px);">
          <path d="M12 2L4.5 20.29L5.21 21L12 18L18.79 21L19.5 20.29L12 2Z" />
        </svg>
      </div>
    `,
    className: '',
    iconSize: [48, 48],
    iconAnchor: [24, 24],
  });
};

// Web Audio API custom synthesizer tones (Waze-like beeps and warning prompts)
const playWebAudioTone = (freqs: number[], type: OscillatorType = 'sine', duration = 0.15, delay = 0) => {
  if (typeof window === 'undefined') return;
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    
    freqs.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.type = type;
      osc.frequency.setValueAtTime(freq, ctx.currentTime + delay + idx * duration);
      
      gain.gain.setValueAtTime(0.12, ctx.currentTime + delay + idx * duration);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + delay + idx * duration + duration - 0.01);
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      
      osc.start(ctx.currentTime + delay + idx * duration);
      osc.stop(ctx.currentTime + delay + idx * duration + duration);
    });
  } catch (e) {
    console.warn("Web Audio API blocked or unavailable:", e);
  }
};

const playAlertSound = () => {
  playWebAudioTone([440, 380], 'sine', 0.18);
};

const playArrivalSound = () => {
  playWebAudioTone([261.63, 329.63, 392.00, 523.25], 'triangle', 0.12);
};

const playRecalculateSound = () => {
  playWebAudioTone([349.23, 440.00, 523.25, 659.25, 783.99], 'sine', 0.08);
};

function getCompassCardinal(deg: number) {
  const normalized = (deg % 360 + 360) % 360;
  const val = Math.floor((normalized / 22.5) + 0.5);
  const arr = ["N", "NNE", "NE", "ENE", "L", "LSE", "SE", "SSE", "S", "SSO", "SO", "OSO", "O", "ONO", "NO", "NNO"];
  return arr[(val % 16)];
}

export default function MapView({ stops, geometry, routeSegments = [], alternatives = [], isNavigationScreen = false, navIndex = 0, onRouteRecalculated }: MapProps) {
  const polyline = useMemo(() => {
    return (geometry?.coordinates?.map((c: number[]) => [c[1], c[0]]) || []) as [number, number][];
  }, [geometry]);

  // Map Tile Detail Style State (default: Google Padrão Vetor HD com detalhamento máximo)
  const [tileStyle, setTileStyle] = useState<'google-streets' | 'google-hybrid' | 'google-terrain' | 'carto-voyager' | 'dark'>('google-streets');
  const [showTileMenu, setShowTileMenu] = useState(false);

  // Real Device Gyroscope & Compass Orientation States
  const [useGyroscope, setUseGyroscope] = useState(false);
  const [gyroHeading, setGyroHeading] = useState(0);
  const [smoothGyroHeading, setSmoothGyroHeading] = useState(0);
  const [gyroActive, setGyroActive] = useState(false);

  // 3D Navigation Simulation States
  const [is3DMode, setIs3DMode] = useState(isNavigationScreen ? false : false);
  const [isDriving, setIsDriving] = useState(false);
  const [isAutoFollowing, setIsAutoFollowing] = useState(true);
  const [carCoords, setCarCoords] = useState<[number, number] | null>(null);
  const [heading, setHeading] = useState(0);
  const [smoothHeading, setSmoothHeading] = useState(0); // Multi-turn mathematical state
  const [simulatedIndex, setSimulatedIndex] = useState(0);
  const [simStartIdx, setSimStartIdx] = useState(0);
  const [simEndIdx, setSimEndIdx] = useState(0);
  const [mapOrientation, setMapOrientation] = useState<'north' | 'track'>(isNavigationScreen ? 'track' : 'track'); // Default track mode keeping cursor pointing UP to device antenna
  
  // Real-time HUD stats
  const [speedHUD, setSpeedHUD] = useState(0);
  const [instructionHUD, setInstructionHUD] = useState("Pronto para iniciar a jornada");

  // Advanced Waze Simulator Controls & Traffic Injections
  const [useRealGPS, setUseRealGPS] = useState(true); // Default to Real GPS on device!
  const [simSpeedFactor, setSimSpeedFactor] = useState(1); // Default to 1x realistic speed
  const [activeSimIncident, setActiveSimIncident] = useState<'none' | 'congested' | 'blocked'>('none');
  const [autoRerouteEnabled, setAutoRerouteEnabled] = useState(true); // Auto rerouting on severe delay
  const [isRerouting, setIsRerouting] = useState(false);
  const [reroutingAlert, setReroutingAlert] = useState<string | null>(null);
  const [secondsStuck, setSecondsStuck] = useState(0); // Counts simulated time trapped in traffic
  const [detourProposal, setDetourProposal] = useState<{
    timeSavedMinutes: number;
    cause: string;
    reason: string;
  } | null>(null);

  // Real Device Orientation (Gyroscope / Compass Sensor Listener - Always Active)
  useEffect(() => {
    const handleOrientation = (e: DeviceOrientationEvent) => {
      let headingVal: number | null = null;
      if ((e as any).webkitCompassHeading !== undefined && (e as any).webkitCompassHeading !== null) {
        headingVal = (e as any).webkitCompassHeading;
      } else if (e.alpha !== null && e.alpha !== undefined) {
        headingVal = (360 - e.alpha) % 360;
      }

      if (headingVal !== null && !isNaN(headingVal)) {
        setGyroHeading(headingVal);
        setSmoothGyroHeading(prev => calculateSmoothAngle(prev, headingVal as number));
        setGyroActive(true);
      }
    };

    if (typeof window !== 'undefined' && ('DeviceOrientationEvent' in window || 'ondeviceorientation' in window)) {
      window.addEventListener('deviceorientationabsolute', handleOrientation, true);
      window.addEventListener('deviceorientation', handleOrientation, true);
    }

    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('deviceorientationabsolute', handleOrientation, true);
        window.removeEventListener('deviceorientation', handleOrientation, true);
      }
    };
  }, []);

  const toggleGyroscope = async () => {
    if (!useGyroscope) {
      if (typeof window !== 'undefined' && typeof (DeviceOrientationEvent as any)?.requestPermission === 'function') {
        try {
          const permissionState = await (DeviceOrientationEvent as any).requestPermission();
          if (permissionState === 'granted') {
            setUseGyroscope(true);
            setIs3DMode(true);
            setMapOrientation('track');
            setInstructionHUD("Giroscópio ativado! O mapa gira conforme a orientação do dispositivo.");
          } else {
            alert('Permissão para sensor de giroscópio e bússola foi recusada.');
          }
        } catch (err) {
          setUseGyroscope(true);
          setIs3DMode(true);
          setMapOrientation('track');
          setInstructionHUD("Giroscópio ativado! O mapa gira conforme a orientação do dispositivo.");
        }
      } else {
        setUseGyroscope(true);
        setIs3DMode(true);
        setMapOrientation('track');
        setInstructionHUD("Giroscópio ativado! O mapa gira conforme a orientação do dispositivo.");
      }
    } else {
      setUseGyroscope(false);
      setGyroActive(false);
      setInstructionHUD("Bússola/Giroscópio desativado. Modo de orientação normal.");
    }
  };

  // Map stops to their closest indices globally for exact partition logic
  const stopIndices = useMemo(() => {
    return stops.map(stop => {
      let minDistance = Infinity;
      let closestIdx = 0;
      for (let i = 0; i < polyline.length; i++) {
        const latDiff = polyline[i][0] - stop.lat;
        const lonDiff = polyline[i][1] - stop.lon;
        const dist = latDiff * latDiff + lonDiff * lonDiff;
        if (dist < minDistance) {
          minDistance = dist;
          closestIdx = i;
        }
      }
      return closestIdx;
    });
  }, [stops, polyline]);

  // Active leg index boundaries based on the current navIndex
  const activeRange = useMemo(() => {
    if (stopIndices.length === 0) return null;
    const startIdx = stopIndices[Math.max(0, navIndex - 1)] || 0;
    const endIdx = stopIndices[Math.min(stops.length - 1, navIndex)] || (polyline.length - 1);
    return { startIdx, endIdx };
  }, [stopIndices, navIndex, stops.length, polyline.length]);

  // Path segments partitioned perfectly for gorgeous visual representation
  const completedPath = useMemo(() => {
    if (!activeRange) return [];
    return polyline.slice(0, activeRange.startIdx + 1);
  }, [polyline, activeRange]);

  const activePath = useMemo(() => {
    if (!activeRange) return polyline;
    return polyline.slice(activeRange.startIdx, activeRange.endIdx + 1);
  }, [polyline, activeRange]);

  const remainingPath = useMemo(() => {
    if (!activeRange) return [];
    return polyline.slice(activeRange.endIdx);
  }, [polyline, activeRange]);

  // Real-time route progress percentage
  const simProgress = useMemo(() => {
    if (simEndIdx <= simStartIdx) return 0;
    const progress = (simulatedIndex - simStartIdx) / (simEndIdx - simStartIdx);
    return Math.max(0, Math.min(100, Math.round(progress * 100)));
  }, [simulatedIndex, simStartIdx, simEndIdx]);

  // Plain-word dynamic instructions showing in the floating top banner
  const currentLegStatus = useMemo(() => {
    if (navIndex === 0) return "Aguardando início - Toque em Começar";
    if (simulatedIndex >= simEndIdx) {
      if (navIndex >= stops.length - 1) return "Corrida Concluída! Toque em Finalizar";
      return "Destinatário alcançado! Toque em Continuar";
    }
    const currentStopName = stops[navIndex]?.name || stops[navIndex]?.address?.split(',')[0] || "Próxima parada";
    return `Seguindo para: ${currentStopName}`;
  }, [navIndex, simulatedIndex, simEndIdx, stops]);

  // Dynamic turn-by-turn navigation step tracker based on simulatedIndex relative to segments
  const activeStep = useMemo(() => {
    if (!routeSegments || routeSegments.length === 0) return null;
    const currentLegIdx = Math.max(0, navIndex - 1);
    const segment = routeSegments[currentLegIdx];
    if (!segment || !segment.steps) return null;

    // Relative index inside the active leg segment
    const startIdx = stopIndices[currentLegIdx] || 0;
    const relativeSimIdx = simulatedIndex - startIdx;

    // Find current step based on way_points range
    const step = segment.steps.find((s: any) => {
      const [start, end] = s.way_points;
      return relativeSimIdx >= start && relativeSimIdx <= end;
    });

    if (step) return step;

    // Fallback: first step that starts after the current position
    const nextStep = segment.steps.find((s: any) => s.way_points[0] > relativeSimIdx);
    return nextStep || segment.steps[segment.steps.length - 1] || null;
  }, [routeSegments, stopIndices, navIndex, simulatedIndex]);

  // Translate step instruction text to specific directional vector indicators
  const stepDirection = useMemo(() => {
    if (!activeStep?.instruction) return "straight";
    const text = activeStep.instruction.toLowerCase();
    if (text.includes("esquerda") || text.includes("left")) {
      if (text.includes("leve") || text.includes("slight")) return "slight-left";
      return "left";
    }
    if (text.includes("direita") || text.includes("right")) {
      if (text.includes("leve") || text.includes("slight")) return "slight-right";
      return "right";
    }
    if (text.includes("retorne") || text.includes("u-turn") || text.includes("meia volta")) {
      return "u-turn";
    }
    if (text.includes("rotatória") || text.includes("roundabout")) {
      return "roundabout";
    }
    return "straight";
  }, [activeStep]);

  // Dynamic 100% precision real-time turn distance countdown
  const realTimeTurnDistanceMeters = useMemo(() => {
    if (!carCoords || !activeStep || !polyline || polyline.length === 0) return null;
    const currentLegIdx = Math.max(0, navIndex - 1);
    const startIdx = stopIndices[currentLegIdx] || 0;
    
    const waypoints = activeStep.way_points;
    if (!waypoints || waypoints.length < 2) return null;

    const targetPolyIdx = Math.min(polyline.length - 1, startIdx + waypoints[1]);
    const targetCoord = polyline[targetPolyIdx];
    if (!targetCoord) return null;

    const distKm = calculateDistanceInKm(carCoords[0], carCoords[1], targetCoord[0], targetCoord[1]);
    return Math.round(distKm * 1000); // exact meters
  }, [carCoords, activeStep, polyline, stopIndices, navIndex]);

  // Live traffic and weather layer controls (disabled by default for clean map view)
  const [showTrafficLayer, setShowTrafficLayer] = useState(false);
  const [showWeatherLayer, setShowWeatherLayer] = useState(false);

  // Local Occurrences database state
  const [localOccurrences, setLocalOccurrences] = useState<any[]>([]);

  useEffect(() => {
    let active = true;
    const loadOccurrences = async () => {
      try {
        const { db } = await import('@/lib/db');
        const list = await db.occurrences.toArray();
        if (active) {
          setLocalOccurrences(list);
        }
      } catch (e) {
        console.warn("Falha de persistencia de ocorrencias locais no mapa:", e);
      }
    };
    loadOccurrences();
    // Poll local Dexie IndexedDB every 2500ms for real-time reactivity without ANY network/API overload
    const interval = setInterval(loadOccurrences, 2500);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, []);

  // Sync state with props in render to avoid synchronous useEffect setState calls
  const [prevPolyline, setPrevPolyline] = useState<[number, number][]>(polyline);
  if (polyline !== prevPolyline) {
    setPrevPolyline(polyline);
    setCarCoords(polyline.length > 0 ? polyline[0] : null);
  }

  const [prevIsNavScreen, setPrevIsNavScreen] = useState(isNavigationScreen);
  if (isNavigationScreen !== prevIsNavScreen) {
    setPrevIsNavScreen(isNavigationScreen);
    setIs3DMode(false); // Force flat 2D map during active navigation screen
    setMapOrientation('north'); // Force strictly stable locked North up orientation
    if (!isNavigationScreen) {
      setIsDriving(false);
    }
  }

  const [prevIs3DMode, setPrevIs3DMode] = useState(is3DMode);
  if (is3DMode !== prevIs3DMode) {
    setPrevIs3DMode(is3DMode);
    if (!is3DMode) {
      setSmoothHeading(0);
      setHeading(0);
    }
  }

  // Build high-resolution color-graded segments based on stops risk interpolation and Dexie reported occurrences
  const segments = useMemo(() => {
    if (polyline.length < 2) return [];

    // Find index markers of route stops inside the polyline indices
    const stopIndices = stops.map(stop => {
      let minDistance = Infinity;
      let closestIdx = 0;
      for (let i = 0; i < polyline.length; i++) {
        const latDiff = polyline[i][0] - stop.lat;
        const lonDiff = polyline[i][1] - stop.lon;
        const dist = latDiff * latDiff + lonDiff * lonDiff;
        if (dist < minDistance) {
          minDistance = dist;
          closestIdx = i;
        }
      }
      return closestIdx;
    });

    // Compute localized risk profile for each individual point coordinate along the route
    const getPointColor = (pt: [number, number], index: number) => {
      // Step A: Interpolate stop-to-stop baseline risk
      let baselineRisk = 0;
      if (stops.length >= 2) {
        let legIdx = 0;
        for (let i = 0; i < stopIndices.length - 1; i++) {
          if (index >= stopIndices[i] && index <= stopIndices[i + 1]) {
            legIdx = i;
            break;
          }
          if (index > stopIndices[i + 1]) {
            legIdx = i;
          }
        }
        const startIdx = stopIndices[legIdx];
        const endIdx = stopIndices[legIdx + 1] || polyline.length - 1;
        const totalSteps = Math.max(1, endIdx - startIdx);
        const ratio = Math.max(0, Math.min(1, (index - startIdx) / totalSteps));
        
        const riskA = stops[legIdx]?.riskScore || 0;
        const riskB = stops[legIdx + 1]?.riskScore || 0;
        baselineRisk = riskA * (1 - ratio) + riskB * ratio;
      } else if (stops.length === 1) {
        baselineRisk = stops[0].riskScore || 0;
      }

      // Step B: Collect risk additions from local user-reported occurrences (saved in Dexie)
      let localAlertBoost = 0;
      for (const occ of localOccurrences) {
        const dist = calculateDistanceInKm(pt[0], pt[1], occ.lat, occ.lon);
        if (dist <= 0.5) { // within 500m (threat circle)
          const desc = String(occ.description || occ.type).toLowerCase();
          if (desc.includes('alagamento') || desc.includes('flood') || desc.includes('bloqueio') || desc.includes('closed')) {
            localAlertBoost += 45; // total blockage / severe risk
          } else if (desc.includes('acidente') || desc.includes('accident') || desc.includes('congestion') || desc.includes('lentidão')) {
            localAlertBoost += 30; // moderate slow down
          } else {
            localAlertBoost += 20; // light warning (pothole, attention)
          }
        } else if (dist <= 1.2) { // cautious notice zone within 1.2km
          localAlertBoost += 10;
        }
      }

      // Step C: Incorporate static route weather/hazard components
      stops.forEach(s => {
        if (s.activeOccurrences) {
          s.activeOccurrences.forEach((o: any) => {
            const dist = calculateDistanceInKm(pt[0], pt[1], s.lat, s.lon);
            if (dist <= 0.8) {
              localAlertBoost += 15;
            }
          });
        }
      });

      const finalScore = baselineRisk + localAlertBoost;

      if (finalScore > 40) {
        return "#EF4444"; // Red (Crítico / Bloqueado / Perigo)
      } else if (finalScore > 15) {
        return "#F59E0B"; // Orange (Atenção / Lentidão)
      } else {
        return "#D1A054"; // Green (Pista Livre / Seguro)
      }
    };

    // Fast-clustering contiguous indices with equivalent colors to prevent React-Leaflet element explosion
    const clusters: { coords: [number, number][]; color: string }[] = [];
    let currentCoords: [number, number][] = [polyline[0]];
    let currentColor = getPointColor(polyline[0], 0);

    for (let i = 1; i < polyline.length; i++) {
      const color = getPointColor(polyline[i], i);
      if (color === currentColor) {
        currentCoords.push(polyline[i]);
      } else {
        currentCoords.push(polyline[i]); // overlap coordinate to avoid cracks/holes on line styling
        clusters.push({ coords: currentCoords, color: currentColor });
        currentCoords = [polyline[i]];
        currentColor = color;
      }
    }
    if (currentCoords.length > 0) {
      clusters.push({ coords: currentCoords, color: currentColor });
    }

    return clusters;
  }, [polyline, stops, localOccurrences]);

// Core Dynamic Rerouting Engine (Consults live Maps engines from current vehicle position)
  const triggerWazeReroute = React.useCallback(async (forcedOrigin?: [number, number]) => {
    const startPoint = forcedOrigin || carCoords;
    if (isRerouting || !startPoint || polyline.length === 0) return;
    setIsRerouting(true);
    playAlertSound();
    setReroutingAlert("DESVIO SOLICITADO: Buscando rota alternativa mais rápida...");
    
    // Smooth cinematic wait simulating advanced satellite path computations (1.5s)
    await new Promise(resolve => setTimeout(resolve, 1500));

    try {
      const remainingStops = stops.slice(navIndex);
      if (remainingStops.length === 0) {
        setIsRerouting(false);
        setReroutingAlert(null);
        return;
      }

      // Origin point is now the exact active simulated car location!
      const recalculatePoints = [
        [startPoint[0], startPoint[1]],
        ...remainingStops.map(s => [s.lat, s.lon])
      ];
      
      // Clean points to avoid ORS 400 error on identical consecutive points
      const cleanPoints: [number, number][] = [];
      recalculatePoints.forEach(p => {
        if (cleanPoints.length === 0) {
          cleanPoints.push(p as [number, number]);
        } else {
          const prev = cleanPoints[cleanPoints.length - 1];
          const dist = Math.sqrt(Math.pow(p[0] - prev[0], 2) + Math.pow(p[1] - prev[1], 2));
          if (dist > 0.0001) { // ~10 meters
            cleanPoints.push(p as [number, number]);
          }
        }
      });
      
      if (cleanPoints.length < 2) {
         setIsRerouting(false);
         return;
      }


      // Dual-redundant premium routing sequence (Google Maps Enterprise with OpenRouteService fallback)
      let response = await fetch('/api/gmaps', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'directions',
          payload: {
            points: cleanPoints,
            preference: 'fastest'
          }
        })
      });

      if (!response.ok) {
        console.warn("Google Maps API unavailable or rate-limited. Trying OpenRouteService fallback routing...");
        response = await fetch('/api/ors', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            endpoint: 'v2/directions/driving-car/geojson',
            method: 'POST',
            body: {
              coordinates: cleanPoints.map(p => [p[1], p[0]]),
              preference: 'fastest',
              instructions: true,
              language: "pt"
            }
          })
        });
      }

      if (!response.ok) {
        throw new Error(`Dual Routing Engines HTTP Error (GMaps & ORS failed)`);
      }

      const resultData = await response.json();
      const firstFeature = resultData?.features?.[0];
      const newGeometry = resultData?.geometry || firstFeature?.geometry;
      const newSummary = resultData?.summary || firstFeature?.properties?.summary || { distance: 10000, duration: 900 };
      const newSegments = resultData?.segments || firstFeature?.properties?.segments || [];
      
      if (resultData && newGeometry) {
        // Play the iconic high-tech recalculation tone!
        playRecalculateSound();
        
        // Clear all artificial congestion parameters to let the vehicle speed up on the clear route
        setActiveSimIncident('none');
        setSecondsStuck(0);

        // Wipe temporary Dexie DB occurrences so the map renders beautiful and clean
        try {
          const { db } = await import('@/lib/db');
          await db.occurrences.clear();
          setLocalOccurrences([]);
        } catch (dbErr) {
          console.warn("Could not clear occurrences table, continuing...", dbErr);
        }

        // Propagate the new road geometry to the parent controller to synchronize all UI segments
        if (onRouteRecalculated) {
          const newRouteResult = {
            sequence: stops,
            geometry: newGeometry,
            summary: newSummary,
            segments: newSegments
          };
          onRouteRecalculated(newRouteResult);
        }

        // Snap simulation back to index zero of the newly generated clear route
        setSimulatedIndex(0);
        setSimStartIdx(0);
        setSimEndIdx(newGeometry.coordinates.length - 1);

        setReroutingAlert("DESVIO APLICADO: Nova rota ótima calculada via GPS! Evitando congestionamentos.");
        setInstructionHUD("Rota recalculada com sucesso! Desviando do trânsito.");

        setTimeout(() => {
          setReroutingAlert(null);
        }, 4500);
      } else {
        throw new Error("No route geometry returned in recalculation response");
      }
    } catch (err) {
      console.error("Failed to recalculate intelligent route:", err);
      setReroutingAlert("AVISO HARPIA: Tentativa de recálculo efetuada, mas as vias alternativas encontram-se congestionadas. Mantendo trajeto original.");
      setTimeout(() => {
        setReroutingAlert(null);
      }, 4500);
    } finally {
      setIsRerouting(false);
    }
  }, [isRerouting, carCoords, polyline, navIndex, stops, onRouteRecalculated]);

  // Real Geolocation Tracking System (updates only when the device actually changes geographical location)
  useEffect(() => {
    let watchId: number | undefined;
    const shouldTrack = useRealGPS && (isDriving || (isNavigationScreen && navIndex > 0));

    if (shouldTrack) {
      if ('geolocation' in navigator) {
        setTimeout(() => setInstructionHUD("Aguardando sinal de GPS para iniciar..."), 0);
        
        watchId = navigator.geolocation.watchPosition(
          (position) => {
            const { latitude, longitude, heading: geoHeading, speed } = position.coords;
            let snappedCoords: [number, number] = [latitude, longitude];
            let closestIdx = 0;

            if (polyline && polyline.length > 1) {
              let minD = Infinity;

              const distSq = (p1: [number, number], p2: [number, number]) => 
                Math.pow(p1[0] - p2[0], 2) + Math.pow(p1[1] - p2[1], 2);
              
              for (let i = 0; i < polyline.length - 1; i++) {
                const A = polyline[i];
                const B = polyline[i + 1];
                const l2 = distSq(A, B);
                
                let t = 0;
                if (l2 > 0) {
                  t = ((latitude - A[0]) * (B[0] - A[0]) + (longitude - A[1]) * (B[1] - A[1])) / l2;
                  t = Math.max(0, Math.min(1, t));
                }
                
                const proj: [number, number] = [
                  A[0] + t * (B[0] - A[0]), 
                  A[1] + t * (B[1] - A[1])
                ];
                
                // Distância quadrada entre GPS bruto e o ponto projetado no segmento da rota
                const d = distSq([latitude, longitude], proj);
                
                if (d < minD) {
                  minD = d;
                  closestIdx = i;
                  
                  // Se o usuário estiver num raio de ~150 metros da rota, grudamos ele nela para 100% de estabilidade e precisão.
                  // d < 0.0000025 graus quadrados é aproximadamente 150m^2.
                  if (d < 0.000005) { 
                    snappedCoords = proj;
                  } else {
                    // Usuário saiu completamente da rota, solta o snap
                    snappedCoords = [latitude, longitude];
                    // Se desviar consideravelmente, recalcula a rota do novo ponto
                    if (d > 0.000025 && autoRerouteEnabled && !isRerouting) {
                      triggerWazeReroute([latitude, longitude]);
                    }
                  }
                }
              }
              
              if (isNavigationScreen) {
                setSimulatedIndex(closestIdx);
              }
            } else if (polyline && polyline.length === 1) {
              snappedCoords = polyline[0];
            }

            const newCoords: [number, number] = snappedCoords;
            
            setCarCoords((prevCarCoords) => {
              if (prevCarCoords) {
                // To avoid jumpy headings, if GPS speed is too low to provide accurate heading, base it purely on route geometry
                const calculatedHeading = (speed && speed > 2.5 && geoHeading !== null && !isNaN(geoHeading)) 
                  ? geoHeading 
                  : getBearing(prevCarCoords[0], prevCarCoords[1], newCoords[0], newCoords[1]);
                  
                setHeading(calculatedHeading);
                setSmoothHeading(prev => calculateSmoothAngle(prev, calculatedHeading));
              }
              return newCoords;
            });
            
            let activeColor = "#D1A054";
            let minColorD = Infinity;
            for (const seg of segments) {
              for (const c of seg.coords) {
                const d = Math.sqrt(Math.pow(c[0] - newCoords[0], 2) + Math.pow(c[1] - newCoords[1], 2));
                if (d < minColorD) {
                  minColorD = d;
                  activeColor = seg.color;
                }
              }
            }

            if (speed !== null && speed > 0.1) {
              setSpeedHUD(Math.round(speed * 3.6));
            } else {
              setSpeedHUD(0);
            }

            if (activeColor === "#EF4444") {
              setInstructionHUD("ALERTA CRÍTICO: Segmento com alto índice de perigo!");
            } else if (activeColor === "#F59E0B") {
              setInstructionHUD("Alerta Moderado: Atenção adiante.");
            } else {
              setInstructionHUD("Trecho seguro (Verde). Siga a rota sugerida.");
            }
          },
          (error) => {
            console.warn("Geolocalização não disponível ou pendente de permissão:", error);
            setInstructionHUD("Aguardando sinal GPS...");
          },
          { enableHighAccuracy: true, maximumAge: 0, timeout: 10000 }
        );
      }
    } else {
      setTimeout(() => {
        if (polyline.length > 0) {
          setCarCoords(polyline[0]);
        }
        setSpeedHUD(0);
        setInstructionHUD("Pronto para iniciar a jornada");
      }, 0);
    }

    return () => {
      if (watchId !== undefined) {
        navigator.geolocation.clearWatch(watchId);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDriving, polyline, segments, isNavigationScreen, navIndex, useRealGPS]);

  // Initial setup for navigation leg
  useEffect(() => {
    if (!isNavigationScreen || polyline.length === 0 || stops.length === 0 || stopIndices.length === 0) return;

    // Determine bounds for active navigation leg: from stops[Math.max(0, navIndex - 1)] to stops[navIndex]
    const startIdx = stopIndices[Math.max(0, navIndex - 1)] || 0;
    const endIdx = stopIndices[Math.min(stops.length - 1, navIndex)] || (polyline.length - 1);

    setTimeout(() => {
      setSimStartIdx(startIdx);
      setSimEndIdx(endIdx);
      setSimulatedIndex(startIdx);
      if (polyline[startIdx]) {
        setCarCoords(polyline[startIdx]);
      }
      // If navIndex > 0 (user pressed Começar / Start), activate tracking & 3D orientation
      if (navIndex > 0) {
        setIs3DMode(true);
        setInstructionHUD("Navegação ativa. Siga a rota até o destino.");
      } else {
        setIsDriving(false);
        setSpeedHUD(0);
        setInstructionHUD("Pronto para iniciar - Toque em Começar");
      }
      
      // Set initial bearing orientation
      if (startIdx < polyline.length - 1) {
        const bearing = getBearing(polyline[startIdx][0], polyline[startIdx][1], polyline[startIdx + 1][0], polyline[startIdx + 1][1]);
        setHeading(bearing);
        setSmoothHeading(bearing);
      }
    }, 0);

  }, [navIndex, polyline, stops, isNavigationScreen, stopIndices]);

    // Timer-based Autopilot Simulation loop for desktop/iFrame environments
  useEffect(() => {
    if (!isDriving || useRealGPS || !isNavigationScreen || polyline.length === 0 || simEndIdx <= simStartIdx) {
      return;
    }

    const intervalDuration = 500;

    const timer = setInterval(() => {
      setSimulatedIndex(prevIdx => {
        if (prevIdx >= simEndIdx) {
          clearInterval(timer);
          setIsDriving(false);
          setSpeedHUD(0);
          setInstructionHUD("Parada alcançada com sucesso! Conclua a entrega.");
          playArrivalSound();
          return simEndIdx;
        }

        let targetSpeed = 60;
        let isCongested = activeSimIncident === 'congested';

        // Dynamic proximity scan for user-reported or baseline traffic spikes on the active route
        if (!isCongested && prevIdx < polyline.length) {
          const pt = polyline[prevIdx];
          for (const occ of localOccurrences) {
            const d = calculateDistanceInKm(pt[0], pt[1], occ.lat, occ.lon);
            if (d < 0.45) { // 450 meters risk circle
              isCongested = true;
              break;
            }
          }
        }

        if (isCongested) {
          targetSpeed = Math.floor(Math.random() * 4) + 4; // Crawling at 4-7 km/h
          setInstructionHUD("ALERTA: Lentidão severa adiante na via!");
          
          setSecondsStuck(s => {
            const nextSecs = s + 0.5;
            // Propose detour recommendation for user to accept or decline!
            if (nextSecs >= 3.0 && !isRerouting && !detourProposal) {
              setTimeout(() => {
                playAlertSound();
                setDetourProposal({
                  timeSavedMinutes: 6,
                  cause: 'Congestionamento em Tempo Real',
                  reason: 'Lentidão severa detectada no trecho à frente. Deseja aplicar o desvio recomendado?'
                });
              }, 10);
            }
            return nextSecs;
          });
        } else if (activeSimIncident === 'blocked') {
          targetSpeed = 0; // Completely stopped
          setInstructionHUD("VIA INTERDITADA: Bloqueio total detectado à frente!");
          
          setSecondsStuck(s => {
            const nextSecs = s + 0.5;
            if (nextSecs >= 2.0 && !isRerouting && !detourProposal) {
              setTimeout(() => {
                playAlertSound();
                setDetourProposal({
                  timeSavedMinutes: 12,
                  cause: 'Pista Bloqueada por Incidente',
                  reason: 'A via à frente está com trânsito interrompido. Recomendado aplicar o desvio alternativo.'
                });
              }, 10);
            }
            return nextSecs;
          });
        } else {
          targetSpeed = Math.floor(Math.random() * 8) + 52; // Cruising safely at 52-60 km/h
          setSecondsStuck(0);
        }

        setSpeedHUD(targetSpeed);

        if (targetSpeed === 0) {
          return prevIdx; // Sit tight
        }

        // Adjust coordinate advance steps based on speed limits and acceleration factor
        const step = Math.max(1, Math.round((targetSpeed / 60) * simSpeedFactor));
        const nextIdx = Math.min(simEndIdx, prevIdx + step);

        const nextCoords = polyline[nextIdx];
        if (nextCoords) {
          setCarCoords(nextCoords);
          if (prevIdx < nextIdx) {
            const bearing = getBearing(polyline[prevIdx][0], polyline[prevIdx][1], nextCoords[0], nextCoords[1]);
            setHeading(bearing);
            setSmoothHeading(prev => calculateSmoothAngle(prev, bearing));
          }
        }

        return nextIdx;
      });
    }, intervalDuration);

    return () => clearInterval(timer);
  }, [isDriving, useRealGPS, isNavigationScreen, polyline, simEndIdx, simSpeedFactor, activeSimIncident, autoRerouteEnabled, isRerouting, localOccurrences, simStartIdx, triggerWazeReroute]);

  const criticalPoints = stops.filter(s => s.riskScore > 40);

  // Active rotation angle (uses physical device gyroscope/compass orientation when active, or route bearing when navigating)
  const activeRotationHeading = (useGyroscope || gyroActive) ? smoothGyroHeading : smoothHeading;

  // Computed transform configuration based on 3D View, device gyroscope orientation or route bearing
  const mapTransformStyles = is3DMode ? {
    transform: `perspective(1000px) rotateX(${isDriving ? '50deg' : '40deg'}) rotateZ(${(mapOrientation === 'track' || useGyroscope || gyroActive) ? -activeRotationHeading : 0}deg) scale(1.45)`,
    transformOrigin: '50% 50%',
    transition: (useGyroscope || gyroActive) ? 'transform 0.15s ease-out' : 'transform 1s linear',
    height: '100%',
    width: '100%',
    background: '#2D2C2A'
  } : {
    transform: (mapOrientation === 'track' || useGyroscope || gyroActive) ? `rotateZ(${-activeRotationHeading}deg) scale(1.25)` : 'none',
    transformOrigin: '50% 50%',
    transition: (useGyroscope || gyroActive) ? 'transform 0.15s ease-out' : 'transform 0.8s cubic-bezier(0.16, 1, 0.3, 1)',
    height: '100%',
    width: '100%',
    background: '#2D2C2A'
  };

  return (
    <div className={`h-full w-full relative overflow-hidden bg-[#2D2C2A] ${is3DMode ? 'isometric-map-wrapper' : ''}`}>
      
      {/* 3D Horizon Blend Overlay Gradient */}
      {is3DMode && (
        <div className="absolute top-0 left-0 right-0 h-[40%] bg-gradient-to-b from-[#2D2C2A] via-[#2D2C2A]/70 to-transparent z-[990] pointer-events-none" />
      )}

      {/* CLIMA REAL-TIME HUD OVERLAY */}
      {showWeatherLayer && !isNavigationScreen && stops.length > 0 && (
        <div className="absolute top-16 left-4 z-[995] bg-slate-950/90 backdrop-blur-md border border-teal-500/30 p-3.5 rounded-2xl w-56 shadow-2xl text-white font-sans animate-in fade-in slide-in-from-left-4 duration-200 select-none">
          <div className="flex items-center gap-2 mb-2 border-b border-white/10 pb-1.5 justify-between">
            <div className="flex items-center gap-1.5">
              <CloudRain className="w-3.5 h-3.5 text-teal-400" />
              <span className="text-[10px] font-black uppercase tracking-widest text-teal-400">Clima em Tempo Real</span>
            </div>
            <button 
              onClick={() => setShowWeatherLayer(false)}
              className="text-slate-400 hover:text-white text-xs font-bold px-1"
            >
              ✕
            </button>
          </div>
          <div className="space-y-1.5 max-h-36 overflow-y-auto custom-scrollbar pr-1">
            {stops.map((s, i) => (
              <div key={i} className="flex items-center justify-between text-[10.5px] border-b border-white/5 last:border-0 pb-1 last:pb-0">
                <span className="truncate max-w-[110px] text-slate-300 font-medium">
                  {i === 0 ? 'Origem' : (s?.stopType === 'pickup') ? `Ponto de Coleta` : i === stops.length - 1 ? 'Destino Final' : `Parada #${i + 1}`}
                </span>
                <div className="flex items-center gap-1 shrink-0 font-bold text-teal-300">
                   <span>{getWeatherEmoji(s.weather?.weather?.[0]?.description, s.weather?.weather?.[0]?.main)}</span>
                   <span>{s.weather?.main?.temp ? `${Math.round(s.weather.main.temp)}°C` : '28°C'}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TRÂNSITO REAL-TIME HUD OVERLAY */}
      {showTrafficLayer && !isNavigationScreen && stops.length > 0 && (
        <div className="absolute top-16 right-4 z-[995] bg-slate-950/90 backdrop-blur-md border border-amber-500/30 p-3.5 rounded-2xl w-60 shadow-2xl text-white font-sans animate-in fade-in slide-in-from-right-4 duration-200 select-none">
          <div className="flex items-center gap-2 mb-2 border-b border-white/10 pb-1.5 justify-between">
            <div className="flex items-center gap-1.5">
              <Car className="w-3.5 h-3.5 text-amber-400" />
              <span className="text-[10px] font-black uppercase tracking-widest text-amber-400">Trânsito em Tempo Real</span>
            </div>
            <button 
              onClick={() => setShowTrafficLayer(false)}
              className="text-slate-400 hover:text-white text-xs font-bold px-1"
            >
              ✕
            </button>
          </div>
          <div className="space-y-1.5 text-[11px]">
            <div className="flex items-center justify-between">
              <span className="text-slate-400 font-semibold">Velocidade Média:</span>
              <span className="text-amber-400 font-black font-mono">38 km/h</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-400 font-semibold">Flutuação:</span>
              <span className="text-red-400 font-black text-[10px] bg-red-950/40 border border-red-500/20 px-1 rounded">Ligeira (+4 min)</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-400 font-semibold">Incidentes:</span>
              <span className="text-red-400 font-black font-mono">{localOccurrences.length + criticalPoints.length}</span>
            </div>
          </div>
        </div>
      )}

      {/* Primary Leaflet Container with inline structural CSS Transforms */}
      <div style={mapTransformStyles} className="leaflet-3d-renderer-inner font-sans">
        <MapContainer
          center={[-3.119, -60.021]}
          zoom={12}
          style={{ height: '100%', width: '100%' }}
          zoomControl={false}
        >
          <TileLayer
            key={tileStyle}
            attribution='&copy; Google Maps HD'
            url={
              tileStyle === 'google-streets'
                ? "https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}&scale=2"
                : tileStyle === 'google-hybrid'
                ? "https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}&scale=2"
                : tileStyle === 'google-terrain'
                ? "https://mt1.google.com/vt/lyrs=p&x={x}&y={y}&z={z}&scale=2"
                : tileStyle === 'carto-voyager'
                ? "https://a.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}@2x.png"
                : tileStyle === 'dark'
                ? "https://a.basemaps.cartocdn.com/rastertiles/dark_all/{z}/{x}/{y}@2x.png"
                : "https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}&scale=2"
            }
            maxNativeZoom={22}
            maxZoom={22}
            detectRetina={true}
            className={tileStyle === 'dark' ? "dark-map-tiles" : ""}
          />
          
          {/* Stops Markers */}
          {stops.map((stop, idx) => (
            <Marker 
              key={stop.id || `stop-${idx}`}
              position={[stop.lat, stop.lon]} 
              icon={createNumberedIcon(idx + 1, idx === stops.length - 1, idx === 0, smoothHeading, is3DMode, isDriving, mapOrientation, stop.weather, showWeatherLayer)}
            >
              <Popup className="custom-popup">
                <div className="p-2 min-w-[140px]">
                  <p className="font-display font-bold text-slate-900 border-b border-slate-100 pb-1 mb-1">
                    {idx === 0 ? 'Origem' : (stop.stopType === 'pickup') ? `Ponto de Coleta` : idx === stops.length - 1 ? 'Destino Final' : `Parada #${idx + 1}`}
                  </p>
                  <p className="text-[10px] text-slate-500 mb-2 leading-tight">{stop.address}</p>
                  <div className="flex justify-between items-center bg-slate-950 text-white p-2 rounded-lg">
                      <div className="flex flex-col">
                          <span className="text-[8px] uppercase text-slate-400">Risco</span>
                          <span className={`text-xs font-black ${stop.riskScore > 30 ? 'text-red-500' : 'text-emerald-400'}`}>{Math.round(stop.riskScore)}%</span>
                      </div>
                      <div className="flex flex-col items-end">
                          <span className="text-[8px] uppercase text-slate-400">Clima</span>
                          <div className="flex items-center gap-1">
                            {stop.weather && (
                              /* eslint-disable-next-line @next/next/no-img-element */
                              <img 
                                src={`https://openweathermap.org/img/wn/${stop.weather.weather[0].icon}.png`}
                                alt={stop.weather.weather[0].description}
                                className="w-5 h-5 invert opacity-80"
                              />
                            )}
                            <span className="text-xs font-black">{Math.round(stop.weather?.main?.temp || 0)}°C</span>
                          </div>
                      </div>
                  </div>
                </div>
              </Popup>
            </Marker>
          ))}

          {/* Active Navigation Driving Vehicle Marker (Carrinho do Waze) */}
          {carCoords && (
            <Marker
              position={carCoords}
              icon={createCarIcon(heading, smoothHeading, is3DMode, isDriving, mapOrientation, isNavigationScreen)}
              zIndexOffset={1000}
            />
          )}

          {/* Hazard & Critical Points Animation Glow */}
          {showTrafficLayer && criticalPoints.map((cp, idx) => (
             <Marker 
              key={`risk-${idx}`} 
              position={[cp.lat + 0.0005, cp.lon + 0.0005]} 
              icon={L.divIcon({
                  html: `<div class="animate-ping w-4 h-4 bg-red-500 rounded-full opacity-75"></div>`,
                  className: ''
              })}
             />
          ))}

          {/* User Reported Occurrences (Waze-style markers) */}
          {showTrafficLayer && localOccurrences.map((occ, idx) => (
            <Marker
              key={`occ-${occ.id || idx}`}
              position={[occ.lat, occ.lon]}
              icon={L.divIcon({
                html: `
                  <div class="relative flex items-center justify-center">
                    <div class="absolute inset-0 bg-alert animate-ping rounded-full opacity-30" style="animation-duration: 2s;"></div>
                    <div class="w-8 h-8 bg-slate-900 border-2 border-alert rounded-xl flex items-center justify-center shadow-[0_5px_15px_rgba(239,68,68,0.3)] transform transition-transform" style="transform: ${is3DMode ? `rotateX(40deg) rotateZ(${isDriving && mapOrientation === 'track' ? smoothHeading : 0}deg)` : 'rotate(0deg)'}">
                       <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#EF4444" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg>
                    </div>
                  </div>
                `,
                className: '',
                iconSize: [32, 32],
                iconAnchor: [16, 16],
              })}
            >
              <Popup className="custom-popup">
                <div className="p-2 min-w-[120px]">
                  <p className="text-[10px] uppercase font-bold text-alert mb-1 tracking-wider">Reporte Comunitário</p>
                  <p className="font-bold text-slate-800 text-sm">{occ.description || occ.type}</p>
                </div>
              </Popup>
            </Marker>
          ))}

  {polyline.length >= 2 && (
            <>
              {/* Alternative Routes (Behind Main Route) */}
              {alternatives.map((alt, idx) => {
                const altCoords = alt.geometry?.coordinates?.map((c: number[]) => [c[1], c[0]]) as [number, number][];
                if (!altCoords || altCoords.length < 2) return null;
                return (
                  <Polyline 
                    key={`alt-${idx}`}
                    positions={altCoords} 
                    color="#64748B" 
                    weight={5} 
                    opacity={0.4}
                    dashArray="8, 8"
                    lineJoin="round"
                    lineCap="round"
                  />
                );
              })}

              {isNavigationScreen ? (
                <>
                  {/* Completed path segments: thin elegant grey line */}
                  {completedPath.length > 1 && (
                    <Polyline 
                      positions={completedPath} 
                      color="#475569" 
                      weight={3} 
                      opacity={0.4} 
                      lineJoin="round" 
                      lineCap="round"
                    />
                  )}
                  {/* Remaining segments: clean dashed slate-blue line */}
                  {remainingPath.length > 1 && (
                    <Polyline 
                      positions={remainingPath} 
                      color="#D1A054" 
                      weight={4} 
                      opacity={0.6} 
                      dashArray="5, 10"
                      lineJoin="round" 
                      lineCap="round"
                    />
                  )}
                  {/* Active leg of the navigation: bright neon cyan glowing line */}
                  {activePath.length > 1 && (
                    <>
                      {/* Robust solid dark background border underlay to outline and pop the active route line */}
                      <Polyline
                        positions={activePath}
                        color="#2D2C2A"
                        weight={9}
                        opacity={0.8}
                        lineJoin="round"
                        lineCap="round"
                      />
                      {/* Glow backlight aura */}
                      <Polyline
                        positions={activePath}
                        color="#D1A054"
                        weight={8}
                        opacity={0.3}
                        className="route-line-glow"
                        lineJoin="round"
                        lineCap="round"
                      />
                      {/* Clean neon route line of highest contrast */}
                      <Polyline
                        positions={activePath}
                        color="#D1A054"
                        weight={5}
                        opacity={1}
                        lineJoin="round"
                        lineCap="round"
                      />
                    </>
                  )}
                </>
              ) : (
                <>
                  {/* Backlight Route Tube Glow */}
                  <Polyline 
                    positions={polyline} 
                    color="#D1A054" 
                    weight={8} 
                    opacity={0.15}
                  />
                  {/* Colored Segments Multi-Path */}
                  {segments.map((seg, i) => {
                    const isRed = showTrafficLayer && seg.color === "#EF4444";
                    const isOrange = showTrafficLayer && seg.color === "#F59E0B";
                    
                    // Set custom stroke dash style based on safety profile
                    let strokeDash = "10, 5"; 
                    if (isOrange) {
                      strokeDash = "6, 6"; // tight attention dashes
                    } else if (isRed) {
                      strokeDash = "15, 6"; // thick hazard blocks
                    }

                    const segmentClass = showTrafficLayer
                      ? (isRed 
                        ? "route-line-animated-danger" 
                        : isOrange 
                        ? "route-line-animated-warning" 
                        : "route-line-animated-safe")
                      : "";

                    const segmentColor = showTrafficLayer ? seg.color : "#D1A054";

                    return (
                      <React.Fragment key={i}>
                        {/* Secondary underlying warning backlight aura specifically for the red critical pieces */}
                        {isRed && (
                          <Polyline 
                            positions={seg.coords}
                            color="#EF4444"
                            weight={10}
                            opacity={0.35}
                            lineJoin="round"
                            lineCap="round"
                            className="route-line-glow"
                          />
                        )}
                        <Polyline 
                          positions={seg.coords} 
                          color={segmentColor} 
                          weight={5} 
                          opacity={1}
                          lineJoin="round"
                          lineCap="round"
                          dashArray={showTrafficLayer ? strokeDash : undefined}
                          className={segmentClass}
                        />
                      </React.Fragment>
                    );
                  })}
                </>
              )}

              {/* Dynamic trace arrow direction markers (ONLY on active path if navigation screen, or polyline for full view) */}
              {getRouteArrows(isNavigationScreen ? activePath : polyline, isNavigationScreen ? 8 : 22).map((arrow, idx) => (
                <Marker
                  key={`arrow-${idx}`}
                  position={arrow.coord}
                  icon={createArrowIcon(arrow.angle)}
                  zIndexOffset={500}
                />
              ))}
            </>
          )}
          
          <MapController 
            stops={stops} 
            geometry={geometry} 
            carCoords={carCoords} 
            isDriving={isDriving} 
            is3DMode={is3DMode} 
            mapOrientation={mapOrientation}
            isNavigationScreen={isNavigationScreen}
            isAutoFollowing={isAutoFollowing}
            onUserPan={() => setIsAutoFollowing(false)}
          />
        </MapContainer>
      </div>

      {/* Floating Recenter Map Button when map is manually moved */}
      {!isAutoFollowing && (
        <button
          type="button"
          onClick={() => {
            setIsAutoFollowing(true);
            window.dispatchEvent(new CustomEvent('recenter-map'));
          }}
          className="fixed bottom-28 right-4 z-[1600] bg-tech text-slate-950 font-black text-xs uppercase tracking-wider px-4 py-2.5 rounded-2xl shadow-[0_10px_30px_rgba(209,160,84,0.5)] border border-white/30 flex items-center gap-2 hover:scale-105 active:scale-95 transition-all animate-bounce cursor-pointer"
        >
          <LocateFixed className="w-4 h-4" />
          <span>Recentralizar Rota</span>
        </button>
      )}

      {/* WAZE-LIKE PROGRESS HUD & SPEED INDICATOR */}
      {isNavigationScreen && (
        <>
          {/* HIGHLY ACCESSIBLE, PREMIUM GPS NAVIGATION TOP HUD */}
          <div className="absolute top-4 left-4 right-4 z-[1001] bg-slate-950/98 backdrop-blur-xl border border-tech/40 rounded-2xl shadow-[0_16px_48px_rgba(0,0,0,0.8)] p-4 max-w-2xl mx-auto flex items-center gap-4 transition-all duration-300 md:p-5">
            {/* Action Arrow Icon based on next step direction */}
            <div className="flex flex-col items-center justify-center bg-emerald-600/90 border border-emerald-400/30 w-14 h-14 rounded-2xl shrink-0 shadow-[0_0_15px_rgba(16,185,129,0.3)]">
              {stepDirection === 'left' && <ArrowLeft className="w-8 h-8 text-white stroke-[3.5px] animate-pulse" />}
              {stepDirection === 'slight-left' && <ArrowUpLeft className="w-8 h-8 text-white stroke-[3.5px]" />}
              {stepDirection === 'right' && <ArrowRight className="w-8 h-8 text-white stroke-[3.5px] animate-pulse" />}
              {stepDirection === 'slight-right' && <ArrowUpRight className="w-8 h-8 text-white stroke-[3.5px]" />}
              {stepDirection === 'u-turn' && <RotateCcw className="w-8 h-8 text-white stroke-[3.5px]" />}
              {stepDirection === 'roundabout' && <RefreshCw className="w-8 h-8 text-white stroke-[3.5px] animate-spin-slow" />}
              {stepDirection === 'straight' && <ArrowUp className="w-8 h-8 text-white stroke-[3.5px]" />}
            </div>
            
            {/* Turn-by-Turn Info Section (Optimized for visibility from distance & real-time meters precision) */}
            <div className="flex-1 min-w-0">
              {activeStep ? (
                <>
                  <div className="flex items-center gap-1.5 mb-1">
                    <span className="text-[11px] uppercase tracking-widest text-emerald-400 font-black flex items-center gap-1">
                      {realTimeTurnDistanceMeters !== null ? (
                        realTimeTurnDistanceMeters <= 25 ? (
                          <span className="bg-emerald-500 text-slate-950 px-2 py-0.5 rounded font-black animate-bounce text-[10px]">VIRAR AGORA</span>
                        ) : (
                          <span>{stepDirection === 'right' ? 'Vire à direita' : stepDirection === 'left' ? 'Vire à esquerda' : 'Siga em frente'} em {realTimeTurnDistanceMeters >= 1000 ? `${(realTimeTurnDistanceMeters/1000).toFixed(1)} km` : `${realTimeTurnDistanceMeters} metros`}</span>
                        )
                      ) : (
                        <span>{activeStep.distance ? `A ${Math.round(activeStep.distance)} metros` : 'Siga em frente'}</span>
                      )}
                    </span>
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                  </div>
                  <h2 className="text-sm md:text-base lg:text-lg font-black text-white leading-snug tracking-tight truncate">
                    {activeStep.instruction || "Prossiga na via indicada"}
                  </h2>
                </>
              ) : (
                <>
                  <span className="text-[9px] uppercase tracking-wider text-slate-500 font-extrabold block mb-0.5">Navegação Ativa</span>
                  <h2 className="text-sm md:text-base font-black text-white leading-tight">
                    {currentLegStatus}
                  </h2>
                </>
              )}
            </div>

            {/* Solicitar Desvio Button */}
            <button
              onClick={() => {
                playAlertSound();
                setDetourProposal({
                  timeSavedMinutes: 6,
                  cause: 'Solicitação de Desvio do Condutor',
                  reason: 'Buscando alternativa de trajeto com menor tempo e maior fluidez para as paradas restantes...'
                });
              }}
              disabled={isRerouting}
              className="px-2.5 py-1.5 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-300 hover:bg-amber-500/30 active:scale-95 transition-all text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 shrink-0 ml-1 cursor-pointer"
              title="Solicitar recomendação de desvio de rota"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRerouting ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Solicitar Desvio</span>
            </button>

            {/* Simulated progress percentage */}
            <div className="flex flex-col items-end shrink-0 pl-2 border-l border-white/10">
              <span className="text-lg font-black font-mono text-tech leading-none">{simProgress}%</span>
              <span className="text-[8px] text-slate-500 font-extrabold uppercase tracking-widest mt-1">concluído</span>
            </div>

            {/* Real-time highly prominent progress strip */}
            <div className="absolute bottom-0 left-4 right-4 h-1 bg-slate-900 overflow-hidden rounded-full">
              <div 
                className="h-full bg-gradient-to-r from-tech to-amber-400 transition-all duration-300 ease-out shadow-[0_0_12px_rgba(209,160,84,1)]" 
                style={{ width: `${simProgress}%` }}
              ></div>
            </div>
          </div>

          {/* Speed Limit & Current Speed Bubble (Bottom Left HUD) */}
          <div className="absolute bottom-28 md:bottom-24 left-4 z-[1001] flex flex-col items-center gap-2 select-none">
            {/* Speed Limit Sign (Standard Brazilian R-19 traffic sign: White circle, thick red ring, dark bold number) */}
            <div className="w-13 h-13 bg-white rounded-full border-[5px] border-red-600 shadow-2xl flex flex-col items-center justify-center text-slate-950 border-solid ring-2 ring-black/40" title="Limite de Velocidade Máxima Permitida na Via (60 km/h)">
              <span className="text-[6.5px] font-black uppercase text-red-600 tracking-tighter -mb-1">MÁX</span>
              <span className="font-extrabold text-lg tracking-tighter leading-none text-black">60</span>
            </div>
            {/* Real-time Current Speed Meter Bubble */}
            <div className={`w-14 h-14 rounded-full border-[3px] flex flex-col items-center justify-center shadow-2xl transition-all duration-200 ${speedHUD > 60 ? 'bg-red-600 text-white border-white shadow-[0_0_25px_rgba(239,68,68,0.8)] animate-bounce' : 'bg-slate-950/90 border-tech text-tech shadow-[0_0_20px_rgba(209,160,84,0.35)]'}`} title="Sua Velocidade Atual em Tempo Real">
              <span className="font-mono text-xl font-black leading-none tracking-tighter -mb-0.5">{speedHUD}</span>
              <span className="text-[7.5px] uppercase font-black tracking-widest opacity-90">km/h</span>
            </div>
          </div>

          {/* CINEMATIC REROUTING LOADING OVERLAY */}
          {isRerouting && (
            <div className="absolute inset-0 bg-slate-950/85 backdrop-blur-md z-[2500] flex flex-col items-center justify-center text-center p-6 transition-all duration-300">
              <div className="relative mb-6">
                <div className="w-24 h-24 rounded-full border-[5px] border-tech/25 border-t-tech animate-spin shadow-[0_0_30px_rgba(209,160,84,0.4)]" />
                <Compass className="w-11 h-11 text-tech animate-pulse absolute top-6 left-6" />
              </div>
              <h3 className="text-xl font-black text-white tracking-tight">Sincronizando com Servidores de Rota</h3>
              <p className="text-xs text-slate-400 mt-2 max-w-sm leading-relaxed">
                Escaneando mapa de trânsito em tempo real de Manaus. Buscando rotas alternativas inteligentes para desviar da lentidão...
              </p>
            </div>
          )}

          {/* FLOATING SUCCESS OR WARNING BANNER FOR ROUTE RECALCULATION */}
          {reroutingAlert && (
            <div className="absolute top-24 left-4 right-4 z-[1002] bg-slate-950/95 backdrop-blur-md border border-emerald-500/30 text-emerald-300 rounded-2xl px-4 py-3.5 shadow-[0_12px_40px_rgba(16,185,129,0.25)] text-xs font-semibold flex items-center gap-3 max-w-lg mx-auto animate-pulse">
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping shrink-0" />
              <div className="flex-1">
                <span className="text-slate-400 text-[10px] font-extrabold uppercase tracking-widest block mb-0.5">Assistente de Voz</span>
                <span className="text-xs leading-normal font-black">{reroutingAlert}</span>
              </div>
            </div>
          )}

          {/* ROUTE DETOUR RECOMMENDATION PROMPT (User Accept/Decline Modal) */}
          {detourProposal && (
            <div className="absolute top-28 left-4 right-4 z-[2000] bg-slate-950/98 backdrop-blur-2xl border border-amber-500/40 rounded-3xl p-5 shadow-[0_20px_60px_rgba(0,0,0,0.9)] max-w-md mx-auto text-white animate-in zoom-in-95 duration-200">
              <div className="flex items-start justify-between gap-3 mb-3 border-b border-white/10 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center shrink-0">
                    <Navigation className="w-5 h-5 text-amber-400 animate-pulse" />
                  </div>
                  <div>
                    <span className="text-[10px] font-black uppercase tracking-widest text-amber-400 block">Recomendação do Sistema</span>
                    <h4 className="text-sm font-black text-white">Desvio de Rota Sugerido</h4>
                  </div>
                </div>
                <span className="bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 font-mono text-[11px] font-black px-2.5 py-1 rounded-full shrink-0 flex items-center gap-1">
                  ⚡ ~{detourProposal.timeSavedMinutes} min economizados
                </span>
              </div>

              <div className="space-y-1.5 mb-4 text-xs leading-relaxed text-slate-300">
                <p className="font-bold text-amber-200 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping inline-block shrink-0" />
                  {detourProposal.cause}
                </p>
                <p className="text-slate-400 text-[11.5px] leading-relaxed">{detourProposal.reason}</p>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <button
                  onClick={() => {
                    setDetourProposal(null);
                    setSecondsStuck(0);
                    setInstructionHUD("Mantendo rota original conforme opção do condutor.");
                  }}
                  className="py-2.5 px-3 rounded-2xl bg-slate-900 border border-slate-700/80 text-slate-300 hover:text-white font-black text-[11px] uppercase tracking-wider transition-all cursor-pointer"
                >
                  Manter Rota Atual
                </button>
                <button
                  onClick={async () => {
                    setDetourProposal(null);
                    setSecondsStuck(0);
                    await triggerWazeReroute();
                  }}
                  className="py-2.5 px-3 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 hover:brightness-110 font-black text-[11px] uppercase tracking-wider shadow-lg shadow-amber-500/20 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  Aceitar Desvio
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* PERSISTENT MAP SYSTEM CONTROLS (Compact Floating Dock) */}
      {!isNavigationScreen && (
        <div className="absolute bottom-6 right-4 z-[1001] flex items-center gap-1.5 p-1.5 bg-slate-950/80 backdrop-blur-md border border-slate-800/80 rounded-2xl shadow-2xl">
          {/* Toggle Live Weather Layer */}
          <button
            onClick={() => setShowWeatherLayer(!showWeatherLayer)}
            className={`p-2 rounded-xl transition-all ${
              showWeatherLayer 
                ? 'bg-teal-500/20 text-teal-300 border border-teal-500/40' 
                : 'text-slate-400 hover:text-white hover:bg-slate-900'
            }`}
            title="Alternar Clima"
          >
            <CloudRain className="w-4 h-4" />
          </button>

          {/* Toggle Live Traffic Layer */}
          <button
            onClick={() => setShowTrafficLayer(!showTrafficLayer)}
            className={`p-2 rounded-xl transition-all ${
              showTrafficLayer 
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40' 
                : 'text-slate-400 hover:text-white hover:bg-slate-900'
            }`}
            title="Alternar Trânsito"
          >
            <Car className="w-4 h-4" />
          </button>

          <div className="w-px h-4 bg-slate-800/80 my-auto" />

          {/* Camadas do Mapa */}
          <div className="relative">
            <button
              onClick={() => setShowTileMenu(!showTileMenu)}
              className={`p-2 rounded-xl transition-all ${
                showTileMenu || tileStyle !== 'dark'
                  ? 'bg-amber-500 text-slate-950 font-bold'
                  : 'text-slate-400 hover:text-white hover:bg-slate-900'
              }`}
              title="Estilos de Mapa"
            >
              <Layers className="w-4 h-4" />
            </button>

            {showTileMenu && (
              <div className="absolute right-0 bottom-12 bg-slate-950/95 border border-slate-800 backdrop-blur-md rounded-2xl p-2.5 shadow-2xl w-52 flex flex-col gap-1.5 z-[10000] text-xs">
                <div className="text-[9px] font-black uppercase text-tech tracking-wider border-b border-white/10 pb-1 flex justify-between items-center">
                  <span>Estilo do Mapa</span>
                  <button onClick={() => setShowTileMenu(false)} className="text-slate-400 hover:text-white">✕</button>
                </div>

                <button
                  onClick={() => { setTileStyle('google-hybrid'); setShowTileMenu(false); }}
                  className={`flex items-center gap-2 p-1.5 rounded-lg text-left transition-all ${
                    tileStyle === 'google-hybrid' ? 'bg-amber-500/20 border border-amber-500/40 text-amber-300 font-bold' : 'hover:bg-white/5 text-slate-300'
                  }`}
                >
                  <Globe className="w-3.5 h-3.5 shrink-0 text-amber-400" />
                  <span className="text-[11px]">Satélite Híbrido</span>
                </button>

                <button
                  onClick={() => { setTileStyle('google-streets'); setShowTileMenu(false); }}
                  className={`flex items-center gap-2 p-1.5 rounded-lg text-left transition-all ${
                    tileStyle === 'google-streets' ? 'bg-amber-500/20 border border-amber-500/40 text-amber-300 font-bold' : 'hover:bg-white/5 text-slate-300'
                  }`}
                >
                  <MapPin className="w-3.5 h-3.5 shrink-0 text-cyan-400" />
                  <span className="text-[11px]">Vetor / Ruas</span>
                </button>

                <button
                  onClick={() => { setTileStyle('google-terrain'); setShowTileMenu(false); }}
                  className={`flex items-center gap-2 p-1.5 rounded-lg text-left transition-all ${
                    tileStyle === 'google-terrain' ? 'bg-amber-500/20 border border-amber-500/40 text-amber-300 font-bold' : 'hover:bg-white/5 text-slate-300'
                  }`}
                >
                  <Sun className="w-3.5 h-3.5 shrink-0 text-emerald-400" />
                  <span className="text-[11px]">Topografia</span>
                </button>

                <button
                  onClick={() => { setTileStyle('dark'); setShowTileMenu(false); }}
                  className={`flex items-center gap-2 p-1.5 rounded-lg text-left transition-all ${
                    tileStyle === 'dark' ? 'bg-amber-500/20 border border-amber-500/40 text-amber-300 font-bold' : 'hover:bg-white/5 text-slate-300'
                  }`}
                >
                  <Compass className="w-3.5 h-3.5 shrink-0 text-slate-400" />
                  <span className="text-[11px]">Modo Escuro</span>
                </button>
              </div>
            )}
          </div>

          {/* Giroscópio */}
          <button
            onClick={toggleGyroscope}
            className={`p-2 rounded-xl transition-all ${
              useGyroscope
                ? 'bg-cyan-500 text-slate-950 font-bold'
                : 'text-slate-400 hover:text-white hover:bg-slate-900'
            }`}
            title="Giroscópio"
          >
            <Smartphone className="w-4 h-4" />
          </button>

          {/* Orientação */}
          <button
            onClick={() => {
              setMapOrientation(prev => prev === 'north' ? 'track' : 'north');
            }}
            className={`p-2 rounded-xl transition-all ${
              mapOrientation === 'track'
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                : 'text-slate-400 hover:text-white hover:bg-slate-900'
            }`}
            title="Orientação"
          >
            <Navigation className="w-4 h-4" style={{ transform: mapOrientation === 'track' ? `rotate(${heading}deg)` : 'rotate(0deg)', transition: 'transform 0.3s' }} />
          </button>

          {/* Modo 3D */}
          <button
            onClick={() => {
              setIs3DMode(!is3DMode);
              if (!is3DMode && !carCoords && polyline.length > 0) {
                setCarCoords(polyline[0]);
              }
            }}
            className={`p-2 rounded-xl transition-all ${
              is3DMode 
                ? 'bg-amber-500 text-slate-950 font-bold' 
                : 'text-slate-400 hover:text-white hover:bg-slate-900'
            }`}
            title="Modo 3D"
          >
            <Compass className="w-4 h-4" style={{ transform: `rotate(${-smoothHeading}deg)` }} />
          </button>

          {/* Piloto / Simulação */}
          {polyline.length >= 2 && (
            <button
              onClick={() => {
                if (isDriving) {
                  setIsDriving(false);
                } else {
                  setIsDriving(true);
                  setIs3DMode(true);
                }
              }}
              className={`p-2 rounded-xl transition-all ${
                isDriving 
                  ? 'bg-red-500 text-white' 
                  : 'text-amber-400 hover:bg-slate-900'
              }`}
              title={isDriving ? "Parar Simulação" : "Simular GPS"}
            >
              {isDriving ? <Square className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current" />}
            </button>
          )}
        </div>
      )}

      {/* FLUXO AO VIVO STATUS OVERLAY */}
      <div className="absolute top-4 right-4 z-[1000] flex flex-col gap-2">
        <div className="glass px-3 py-2 rounded-xl text-[10px] uppercase font-black tracking-widest flex items-center gap-2 border border-white/10 shadow-2xl select-none">
            <div className={`w-2 h-2 rounded-full ${isDriving ? 'bg-red-500 animate-ping' : 'bg-tech animate-pulse shadow-[0_0_8px_#D1A054]'}`} />
            <span>{isDriving ? 'NAV SIMULAÇÃO' : 'FLUXO AO VIVO'}</span>
        </div>

        {useGyroscope && (
          <div className="bg-slate-950/90 border border-cyan-500/40 px-3 py-2 rounded-xl text-[10px] font-mono font-bold text-cyan-300 flex items-center gap-2 shadow-[0_0_15px_rgba(6,182,212,0.25)] select-none">
            <Smartphone className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
            <span>GIROSCÓPIO: {Math.round(gyroHeading)}° {getCompassCardinal(gyroHeading)}</span>
          </div>
        )}
      </div>

      <style jsx global>{`
        /* Custom Keyframe animation for Glowing car locator and points */
        @keyframes pulseMarker {
          from {
            transform: scale(0.9);
            opacity: 0.7;
          }
          to {
            transform: scale(1.1);
            opacity: 1;
            box-shadow: 0 0 25px rgba(209,160,84, 0.95);
          }
        }

        /* High Resolution Route Performance Segment Classes */
        .route-line-animated-safe {
            stroke-dashoffset: 0;
            animation: dashSafe 16s linear infinite;
        }
        @keyframes dashSafe {
            from { stroke-dashoffset: 1000; }
            to { stroke-dashoffset: 0; }
        }

        .route-line-animated-warning {
            stroke-dashoffset: 0;
            animation: dashWarning 42s linear infinite;
        }
        @keyframes dashWarning {
            from { stroke-dashoffset: 1000; }
            to { stroke-dashoffset: 0; }
        }

        .route-line-animated-danger {
            stroke-dashoffset: 0;
            animation: dashDanger 70s linear infinite;
        }
        @keyframes dashDanger {
            from { stroke-dashoffset: 0; }
            to { stroke-dashoffset: 1000; } /* Flow backward simulating severe backlog */
        }

        .route-line-glow {
          animation: pulseRouteGlow 1.8s ease-in-out infinite alternate;
        }
        @keyframes pulseRouteGlow {
          from {
            opacity: 0.18;
            stroke-width: 8px;
          }
          to {
            opacity: 0.52;
            stroke-width: 12px;
          }
        }

        /* Essential Leaflet 3D Tilt Overrides for Mapbox/Leaflet tilts */
        .isometric-map-wrapper {
          perspective: 800px;
        }
        .isometric-map-wrapper .leaflet-container {
          overflow: visible !important;
        }
        .isometric-map-wrapper .leaflet-map-pane {
          overflow: visible !important;
        }
        
        /* Des-tilt popup wrapper so they remain perpendicular and vertical */
        .isometric-map-wrapper .leaflet-marker-icon .custom-marker-wrapper {
          transform-origin: bottom center !important;
        }

        .leaflet-popup-content-wrapper {
            background: #2D2C2A;
            color: #f8fafc;
            border-radius: 20px;
            padding: 0;
            overflow: hidden;
            border: 1px solid rgba(255,255,255,0.1);
            box-shadow: 0 20px 40px rgba(0,0,0,0.5);
        }
        .leaflet-popup-content {
            margin: 0;
        }
        .leaflet-popup-tip {
            background: #2D2C2A;
        }
        .custom-popup .text-slate-900 {
            color: #f8fafc !important;
        }
        .custom-popup .text-slate-500 {
            color: #94a3b8 !important;
        }
        .custom-popup .border-slate-100 {
            border-color: rgba(255,255,255,0.1) !important;
        }
      `}</style>
    </div>
  );
}
