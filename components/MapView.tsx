'use client';

import React, { useEffect, useState, useRef, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Compass, Navigation, Eye, Play, Square, AlertTriangle, CloudRain, Shield, AlertOctagon } from 'lucide-react';

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
  isNavigationScreen?: boolean;
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

// Recenter mechanism that adapts to general view or simulation view with enhanced elite-level zoom zoom
function MapController({ 
  stops, 
  geometry, 
  carCoords, 
  isDriving, 
  is3DMode,
  mapOrientation
}: { 
  stops: any[]; 
  geometry?: any; 
  carCoords: [number, number] | null; 
  isDriving: boolean;
  is3DMode: boolean;
  mapOrientation: 'north' | 'track';
}) {
  const map = useMap();

  useEffect(() => {
    if (isDriving && carCoords) {
      // Direct high-precision focus on the active vehicle during cockpit simulation
      const zoomLevel = is3DMode ? 18.5 : 17;
      // Disable animation for frequent periodic updates (300ms) to bypass Leaflet's pan animation queue lag
      map.setView(carCoords, zoomLevel, { animate: false });
    } else {
      // Normal bounds fitting
      if (geometry?.coordinates?.length > 0) {
        const bounds = L.latLngBounds(geometry.coordinates.map((c: any) => [c[1], c[0]]));
        map.fitBounds(bounds, { padding: [55, 55], animate: false });
      } else if (stops.length > 0) {
        const bounds = L.latLngBounds(stops.map(s => [s.lat, s.lon]));
        map.fitBounds(bounds, { padding: [55, 55], animate: false });
      }
    }
  }, [stops, map, geometry, carCoords, isDriving, is3DMode]);

  useEffect(() => {
    // Force recalculate map size to prevent gray box issues when 3D mode toggles or mounts
    const timer = setTimeout(() => {
      map.invalidateSize();
    }, 400);
    return () => clearTimeout(timer);
  }, [map, is3DMode]);

  // Dynamically enable/disable interface dragging under active tracking rotation to solve Leaflet coordinate offsets
  useEffect(() => {
    const isActivelyRotating = is3DMode && isDriving && mapOrientation === 'track';
    if (isActivelyRotating) {
      map.dragging.disable();
      map.touchZoom.disable();
      map.doubleClickZoom.disable();
      map.scrollWheelZoom.disable();
      map.boxZoom.disable();
      map.keyboard.disable();
    } else {
      map.dragging.enable();
      map.touchZoom.enable();
      map.doubleClickZoom.enable();
      map.scrollWheelZoom.enable();
      map.boxZoom.enable();
      map.keyboard.enable();
    }
  }, [map, is3DMode, isDriving, mapOrientation]);

  // Recenter Event Listener
  useEffect(() => {
    const handleRecenter = () => {
      if (!map) return;
      if (carCoords) {
        const zoomLevel = is3DMode ? 18.5 : 17;
        map.setView(carCoords, zoomLevel, { animate: true, duration: 1 });
      } else {
        if (geometry?.coordinates?.length > 0) {
          const bounds = L.latLngBounds(geometry.coordinates.map((c: any) => [c[1], c[0]]));
          map.fitBounds(bounds, { padding: [55, 55], animate: true, duration: 1 });
        } else if (stops.length > 0) {
          const bounds = L.latLngBounds(stops.map(s => [s.lat, s.lon]));
          map.fitBounds(bounds, { padding: [55, 55], animate: true, duration: 1 });
        }
      }
    };
    window.addEventListener('recenter-map', handleRecenter);
    return () => window.removeEventListener('recenter-map', handleRecenter);
  }, [map, carCoords, geometry, stops, is3DMode]);

  return null;
}

// Custom icon creator for numbered tour markers (des-tilted to remain vertical and perpendicular)
const createNumberedIcon = (
  number: number, 
  isLast: boolean, 
  isFirst: boolean, 
  smoothHeading: number, 
  is3D: boolean, 
  isDriving: boolean,
  mapOrientation: 'north' | 'track'
) => {
  const color = isFirst ? '#00D4AA' : isLast ? '#F43F5E' : '#3B82F6';
  
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
  
  return L.divIcon({
    html: `
      <div class="custom-marker-wrapper" style="
        transform: ${rotationAdjustment};
        transform-origin: bottom center;
        transition: ${isDriving ? 'none' : 'transform 0.35s cubic-bezier(0.16, 1, 0.3, 1)'};
        background-color: ${color};
        color: #0F172A;
        width: 32px;
        height: 32px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-weight: 900;
        font-size: 13px;
        border: 2.5px solid #0F172A;
        box-shadow: 0 4px 12px ${color}80;
      ">
        ${number}
      </div>
    `,
    className: '',
    iconSize: [32, 32],
    iconAnchor: [16, 32], // Anchor bottom-center for perfect accuracy
  });
};

// Custom car vehicle icon (pulsing glowing neon)
const createCarIcon = (
  heading: number, 
  smoothHeading: number, 
  is3D: boolean, 
  isDriving: boolean,
  mapOrientation: 'north' | 'track'
) => {
  // No modo 'track' com simulação ativa, o mapa gira embaixo do carro, então mantemos o carro reto de pé.
  // Já no modo estável 'north' (conforto de UX), o carro gira suavemente no próprio eixo de acordo com o rumo das pistas.
  let rotationAdjustment = '';
  if (is3D) {
    if (mapOrientation === 'track' && isDriving) {
      rotationAdjustment = 'rotateX(-50deg)';
    } else {
      rotationAdjustment = `rotateX(-45deg) rotate(${smoothHeading}deg)`;
    }
  } else {
    rotationAdjustment = `rotate(${smoothHeading}deg)`;
  }

  return L.divIcon({
    html: `
      <div style="
        transform: ${rotationAdjustment};
        transition: ${isDriving ? 'none' : 'transform 0.35s cubic-bezier(0.16, 1, 0.3, 1)'};
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
          background: rgba(0, 212, 170, 0.28);
          border: 1.5px solid rgba(0, 212, 170, 0.7);
          box-shadow: 0 0 22px rgba(0, 212, 170, 0.95);
          animation: pulseMarker 1.2s infinite alternate ease-in-out;
        "></div>
        <!-- Directional vehicle arrow pointing to front -->
        <svg viewBox="0 0 24 24" fill="currentColor" style="width: 26px; height: 26px; color: #00D4AA; filter: drop-shadow(0 0 8px #00D4AA); transform: translateY(-1px);">
          <path d="M12 2L4.5 20.29L5.21 21L12 18L18.79 21L19.5 20.29L12 2Z" />
        </svg>
      </div>
    `,
    className: '',
    iconSize: [48, 48],
    iconAnchor: [24, 24],
  });
};

export default function MapView({ stops, geometry, isNavigationScreen = false }: MapProps) {
  const polyline = useMemo(() => {
    return (geometry?.coordinates?.map((c: number[]) => [c[1], c[0]]) || []) as [number, number][];
  }, [geometry]);

  // 3D Navigation Simulation States
  const [is3DMode, setIs3DMode] = useState(isNavigationScreen);
  const [isDriving, setIsDriving] = useState(false);
  const [carCoords, setCarCoords] = useState<[number, number] | null>(null);
  const [heading, setHeading] = useState(0);
  const [smoothHeading, setSmoothHeading] = useState(0); // Multi-turn mathematical state
  const [simulatedIndex, setSimulatedIndex] = useState(0);
  const [mapOrientation, setMapOrientation] = useState<'north' | 'track'>('north'); // Padrão 'north' (Norte para cima, de altíssima estabilidade e sem trepidação)
  
  // Real-time HUD stats
  const [speedHUD, setSpeedHUD] = useState(0);
  const [instructionHUD, setInstructionHUD] = useState("Pronto para iniciar a jornada");

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
    setIs3DMode(isNavigationScreen);
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
        return "#00D4AA"; // Green (Pista Livre / Seguro)
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

  // Real Geolocation Tracking System (updates only when the device actually changes geographical location)
  useEffect(() => {
    let watchId: number | undefined;

    if (isDriving) {
      if ('geolocation' in navigator) {
        setTimeout(() => setInstructionHUD("Aguardando sinal de GPS para iniciar..."), 0);
        
        watchId = navigator.geolocation.watchPosition(
          (position) => {
            const { latitude, longitude, heading: geoHeading, speed } = position.coords;
            const newCoords: [number, number] = [latitude, longitude];
            
            setCarCoords((prevCarCoords) => {
              if (prevCarCoords) {
                // If heading is not provided by device sensors, calculate it from the path progress dynamically
                const calculatedHeading = geoHeading !== null && !isNaN(geoHeading) 
                  ? geoHeading 
                  : getBearing(prevCarCoords[0], prevCarCoords[1], latitude, longitude);
                  
                setHeading(calculatedHeading);
                setSmoothHeading(prev => calculateSmoothAngle(prev, calculatedHeading));
              }
              return newCoords;
            });

            // Dynamically calculate which segment color matches closest to current live latitude & longitude coordinates
            let activeColor = "#00D4AA";
            let minD = Infinity;
            for (const seg of segments) {
              for (const c of seg.coords) {
                const d = Math.sqrt(Math.pow(c[0] - latitude, 2) + Math.pow(c[1] - longitude, 2));
                if (d < minD) {
                  minD = d;
                  activeColor = seg.color;
                }
              }
            }

            // Display speed if provided, otherwise fallback to 0 or stationary values safely
            if (speed !== null && speed > 0.1) {
              setSpeedHUD(Math.round(speed * 3.6));
            } else {
              setSpeedHUD(0);
            }

            // Provide contextually intelligent safety-critical responses to active segment profiles
            if (activeColor === "#EF4444") {
              setInstructionHUD("ALERTA CRÍTICO: Você está em um trecho de alto perigo na rota! Navegação de segurança ativa.");
            } else if (activeColor === "#F59E0B") {
              setInstructionHUD("Alerta Moderado: Trecho sob alerta moderado ou lentidão adiante.");
            } else {
              setInstructionHUD("Trecho livre seguro (Verde). Siga a rota sugerida.");
            }

            // Evaluate proxemics of critical security or terrain risks
            const dangerousStopIdx = stops.findIndex(s => {
              const distance = Math.sqrt(Math.pow(s.lat - latitude, 2) + Math.pow(s.lon - longitude, 2));
              return distance < 0.005; // ~500 meters
            });
            if (dangerousStopIdx !== -1 && stops[dangerousStopIdx].riskScore > 35) {
              setInstructionHUD(`Alerta de Risco: Zona crítica próxima com ${Math.round(stops[dangerousStopIdx].riskScore)}% de risco.`);
            }
          },
          (error) => {
            console.error("Erro na geolocalização:", error);
            setInstructionHUD("Erro de GPS. Verifique a permissão de localização do navegador.");
          },
          {
            enableHighAccuracy: true,
            maximumAge: 0,
            timeout: 10000
          }
        );
      } else {
        setTimeout(() => setInstructionHUD("Geolocalização não suportada neste dispositivo."), 0);
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
  }, [isDriving, polyline, segments, stops]);

  const criticalPoints = stops.filter(s => s.riskScore > 40);

  // Computed transform configuration based on 3D View and active Pilot navigation heading (Track Up or North Up)
  const mapTransformStyles = is3DMode ? {
    transform: `perspective(1000px) rotateX(${isDriving ? '50deg' : '40deg'}) rotateZ(${isDriving && mapOrientation === 'track' ? -smoothHeading : 0}deg)`,
    transformOrigin: '50% 50%',
    transition: isDriving ? 'none' : 'transform 1s cubic-bezier(0.16, 1, 0.3, 1)',
    height: '100%',
    width: '100%',
    background: '#020617'
  } : {
    transform: 'none',
    transformOrigin: '50% 50%',
    transition: 'transform 1s cubic-bezier(0.16, 1, 0.3, 1)',
    height: '100%',
    width: '100%',
    background: '#020617'
  };

  return (
    <div className={`h-full w-full relative overflow-hidden bg-[#020617] ${is3DMode ? 'isometric-map-wrapper' : ''}`}>
      
      {/* 3D Horizon Blend Overlay Gradient */}
      {is3DMode && (
        <div className="absolute top-0 left-0 right-0 h-[40%] bg-gradient-to-b from-[#020617] via-[#020617]/70 to-transparent z-[990] pointer-events-none" />
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
            attribution='&copy; CARTO'
            url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          />
          
          {/* Stops Markers */}
          {stops.map((stop, idx) => (
            <Marker 
              key={stop.id || `stop-${idx}`}
              position={[stop.lat, stop.lon]} 
              icon={createNumberedIcon(idx + 1, idx === stops.length - 1, idx === 0, smoothHeading, is3DMode, isDriving, mapOrientation)}
            >
              <Popup className="custom-popup">
                <div className="p-2 min-w-[140px]">
                  <p className="font-display font-bold text-slate-900 border-b border-slate-100 pb-1 mb-1">
                    {idx === 0 ? 'Origem' : idx === stops.length - 1 ? 'Destino Final' : `Parada #${idx + 1}`}
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
              icon={createCarIcon(heading, smoothHeading, is3DMode, isDriving, mapOrientation)}
              zIndexOffset={1000}
            />
          )}

          {/* Hazard & Critical Points Animation Glow */}
          {criticalPoints.map((cp, idx) => (
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
          {localOccurrences.map((occ, idx) => (
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
              {/* Backlight Route Tube Glow */}
              <Polyline 
                positions={polyline} 
                color="#00D4AA" 
                weight={8} 
                opacity={0.15}
              />
              {/* Colored Segments Multi-Path */}
              {segments.map((seg, i) => {
                const isRed = seg.color === "#EF4444";
                const isOrange = seg.color === "#F59E0B";
                
                // Set custom stroke dash style based on safety profile
                let strokeDash = "10, 5"; 
                if (isOrange) {
                  strokeDash = "6, 6"; // tight attention dashes
                } else if (isRed) {
                  strokeDash = "15, 6"; // thick hazard blocks
                }

                const segmentClass = isRed 
                  ? "route-line-animated-danger" 
                  : isOrange 
                  ? "route-line-animated-warning" 
                  : "route-line-animated-safe";

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
                      color={seg.color} 
                      weight={5} 
                      opacity={1}
                      lineJoin="round"
                      lineCap="round"
                      dashArray={strokeDash}
                      className={segmentClass}
                    />
                  </React.Fragment>
                );
              })}
            </>
          )}
          
          <MapController 
            stops={stops} 
            geometry={geometry} 
            carCoords={carCoords} 
            isDriving={isDriving} 
            is3DMode={is3DMode} 
            mapOrientation={mapOrientation}
          />
        </MapContainer>
      </div>

      {/* WAZE-LIKE TOP BANNER & SPEED HUD */}
      {isNavigationScreen && (
        <>
          {/* Top Instruction Banner */}
          <div className="absolute top-0 left-0 right-0 z-[1001] bg-slate-950/95 backdrop-blur-xl border-b border-tech/30 shadow-[0_15px_50px_rgba(0,212,170,0.15)] text-white pb-4 px-4 pt-4 md:pt-6 rounded-b-[32px]">
            <div className="max-w-2xl mx-auto flex items-center gap-4">
              <div className="flex flex-col items-center justify-center w-16 shrink-0">
                <Navigation className="w-8 h-8 text-tech mb-1" style={{ transform: `rotate(${heading}deg)` }} />
                <span className="text-xl font-bold font-mono tracking-tighter text-tech">
                  {instructionHUD.match(/\d+/) ? instructionHUD.match(/\d+/)?.[0] : "100"}<span className="text-xs ml-0.5 text-tech/70">m</span>
                </span>
              </div>
              <div className="flex-1 border-l border-slate-800 pl-4 py-1">
                <p className="text-[10px] uppercase font-black text-slate-500 mb-0.5 tracking-widest">A seguir</p>
                <p className="text-xl md:text-2xl font-black leading-none drop-shadow-md text-white">{instructionHUD.replace(/\d+m - /, '') || 'Siga em frente'}</p>
              </div>
            </div>
            {/* Progress Bar under instruction */}
            <div className="absolute bottom-0 left-0 right-0 h-1 bg-slate-900 rounded-b-[32px] overflow-hidden">
              <div className="h-full bg-tech w-[85%] transition-all duration-1000 ease-linear shadow-[0_0_10px_rgba(0,212,170,0.8)]"></div>
            </div>
          </div>

          {/* Speed Limit & Current Speed Bubble (Bottom Left) */}
          <div className="absolute bottom-40 md:bottom-32 left-4 z-[1001] flex flex-col items-center gap-2">
            {/* Speed Limit Sign */}
            <div className="w-12 h-12 bg-slate-900 rounded-full border-4 border-alert shadow-xl flex items-center justify-center">
              <span className="text-white font-extrabold text-lg tracking-tighter">60</span>
            </div>
            {/* Current SpeedBubble */}
            <div className={`w-14 h-14 rounded-full border-[3px] flex flex-col items-center justify-center shadow-2xl transition-colors ${speedHUD > 60 ? 'bg-alert/10 border-alert text-alert shadow-[0_0_20px_rgba(239,68,68,0.3)]' : 'bg-slate-900 border-tech/50 text-tech shadow-[0_0_20px_rgba(0,212,170,0.2)]'}`}>
              <span className="font-mono text-xl font-black leading-none tracking-tighter -mb-1">{speedHUD}</span>
              <span className="text-[8px] uppercase font-black tracking-widest opacity-80">km/h</span>
            </div>
          </div>
        </>
      )}

      {/* PERSISTENT MAP SYSTEM CONTROLS (Floating Overlays) */}
      {!isNavigationScreen && (
        <div className={`absolute ${stops.length > 0 ? 'bottom-[185px] md:bottom-24' : 'bottom-40 md:bottom-36'} right-4 z-[1001] flex flex-col gap-2.5`}>
          
          {/* Toggle Map Orientation Mode */}
          <button
            onClick={() => {
              setMapOrientation(prev => prev === 'north' ? 'track' : 'north');
            }}
            className={`px-3 py-2.5 rounded-2xl border flex items-center justify-center shadow-2xl hover:scale-105 active:scale-95 transition-all ${
              mapOrientation === 'north'
                ? 'bg-tech/20 text-tech border-tech/30'
                : 'bg-amber-500/20 text-amber-400 border-amber-500/30'
            }`}
            title={mapOrientation === 'north' ? "Orientação: Norte para Cima (Super Estável)" : "Orientação: Seguir Rota (Dinâmico)"}
          >
            <div className="flex flex-col items-center justify-center">
              <Navigation className={`w-4 h-4 mb-0.5 ${mapOrientation === 'track' ? 'animate-pulse text-amber-400' : 'text-tech'}`} style={{ transform: mapOrientation === 'track' ? `rotate(${heading}deg)` : 'rotate(0deg)', transition: 'transform 0.4s' }} />
              <span className="text-[7px] font-black uppercase tracking-tight select-none leading-none">
                {mapOrientation === 'north' ? 'Norte ↑' : 'Rota ↱'}
              </span>
            </div>
          </button>

          {/* Toggle 3D Perspective Mode */}
          <button
            onClick={() => {
              setIs3DMode(!is3DMode);
              if (!is3DMode && !carCoords && polyline.length > 0) {
                setCarCoords(polyline[0]);
              }
            }}
            className={`p-3 rounded-2xl border flex items-center justify-center shadow-2xl hover:scale-105 active:scale-95 transition-all ${
              is3DMode 
                ? 'bg-tech text-slate-950 border-tech shadow-tech/20 font-bold' 
                : 'glass text-slate-400 border-white/10 hover:text-white'
            }`}
            title="Alternar Modo de Cabine 3D (Waze/Uber/GPS)"
          >
            <Compass 
              className="w-5 h-5 transition-transform duration-500 ease-out" 
              style={{ transform: `rotate(${-smoothHeading}deg)` }} 
            />
          </button>

          {/* Start / Pause Interactive Auto-Pilot driving simulation */}
          {polyline.length >= 2 && (
            <button
              onClick={() => {
                if (isDriving) {
                  setIsDriving(false);
                } else {
                  setIsDriving(true);
                  setIs3DMode(true); // Forces 3D viewport for cinematic beauty
                }
              }}
              className={`p-3 rounded-2xl border flex items-center justify-center shadow-2xl hover:scale-105 active:scale-95 transition-all ${
                isDriving 
                  ? 'bg-red-500 text-white border-red-500 shadow-red-500/20' 
                  : 'glass text-tech border-tech/20'
              }`}
              title={isDriving ? "Mudar piloto para Manual" : "Ligar piloto automático GPS"}
            >
              {isDriving ? (
                <Square className="w-5 h-5 fill-current" />
              ) : (
                <Play className="w-5 h-5 fill-tech" />
              )}
            </button>
          )}
        </div>
      )}

      {/* FLUXO AO VIVO STATUS OVERLAY */}
      <div className="absolute top-4 right-4 z-[1000] flex flex-col gap-2">
        <div className="glass px-3 py-2 rounded-xl text-[10px] uppercase font-black tracking-widest flex items-center gap-2 border border-white/10 shadow-2xl select-none">
            <div className={`w-2 h-2 rounded-full ${isDriving ? 'bg-red-500 animate-ping' : 'bg-tech animate-pulse shadow-[0_0_8px_#00D4AA]'}`} />
            <span>{isDriving ? 'NAV SIMULAÇÃO' : 'FLUXO AO VIVO'}</span>
        </div>
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
            box-shadow: 0 0 25px rgba(0, 212, 170, 0.95);
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
            background: #0f172a;
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
            background: #0f172a;
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
