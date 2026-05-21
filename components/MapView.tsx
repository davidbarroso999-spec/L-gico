'use client';

import React, { useEffect, useState, useRef, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Compass, Navigation, Eye, Play, Square, AlertTriangle, CloudRain, Shield, AlertOctagon } from 'lucide-react';

// Fix Leaflet icons in Next.js
const defaultIcon = L.icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

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

// Highly optimized continuous rotation tracking with mathematical damping (low-pass filter) to prevent structural wrapping-spin bugs
function calculateSmoothAngle(currentSmooth: number, target: number) {
  let diff = (target - currentSmooth) % 360;
  if (diff < -180) {
    diff += 360;
  } else if (diff > 180) {
    diff -= 360;
  }
  // Low-pass filter damping coefficient (0.12) to create smooth, cinematic rotation over time
  return currentSmooth + diff * 0.12;
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
        map.fitBounds(bounds, { padding: [55, 55] });
      } else if (stops.length > 0) {
        const bounds = L.latLngBounds(stops.map(s => [s.lat, s.lon]));
        map.fitBounds(bounds, { padding: [55, 55] });
      }
    }

    // Force recalculate map size to prevent gray box issues
    const timer = setTimeout(() => {
      map.invalidateSize();
    }, 400);
    return () => clearTimeout(timer);
  }, [stops, map, geometry, carCoords, isDriving, is3DMode]);

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
        transition: transform 0.35s cubic-bezier(0.16, 1, 0.3, 1);
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
        transition: transform 0.35s cubic-bezier(0.16, 1, 0.3, 1);
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
      setSmoothHeading(prev => calculateSmoothAngle(prev, 0));
      setHeading(0);
    }
  }

  // Driver agent simulation loop
  useEffect(() => {
    let timer: any;
    if (isDriving && polyline.length >= 2) {
      const stepSim = () => {
        setSimulatedIndex(prevIdx => {
          const nextIdx = prevIdx + 1;
          if (nextIdx >= polyline.length) {
            setIsDriving(false);
            setInstructionHUD("Sua rota foi simulada com sucesso! Bem-vindo ao destino!");
            setSpeedHUD(0);
            return 0; // Reset index for subsequent run
          }

          const currentPoint = polyline[prevIdx];
          
          // Look-ahead 5 steps (~30-80 meters) to calculate a highly stable, non-jittery road bearing vector
          const lookAheadIdx = Math.min(prevIdx + 5, polyline.length - 1);
          const nextPoint = polyline[lookAheadIdx] || polyline[nextIdx];
          
          setCarCoords(currentPoint);

          // Calculate direct bearing/heading direction
          const currentBearing = getBearing(currentPoint[0], currentPoint[1], nextPoint[0], nextPoint[1]);
          setHeading(currentBearing);
          setSmoothHeading(prev => calculateSmoothAngle(prev, currentBearing));

          // Simulate organic speed behavior
          const randSpeed = Math.floor(40 + Math.random() * 25);
          setSpeedHUD(randSpeed);

          // Update navigation step instructions based on route progress
          if (nextIdx === 1) {
            setInstructionHUD("Inicie a navegação. Siga em frente.");
          } else if (nextIdx === Math.floor(polyline.length * 0.2)) {
            setInstructionHUD("A 300 metros, vire à direita.");
          } else if (nextIdx === Math.floor(polyline.length * 0.25)) {
            setInstructionHUD("Vire à direita na próxima via e siga pelas faixas exclusivas.");
          } else if (nextIdx === Math.floor(polyline.length * 0.5)) {
            setInstructionHUD("Tudo livre. Prossiga sem desvios na via rápida por 1.5 km.");
          } else if (nextIdx === Math.floor(polyline.length * 0.75)) {
            setInstructionHUD("Prepare-se para fazer o contorno à esquerda logo adiante.");
          } else if (nextIdx === Math.floor(polyline.length * 0.82)) {
            setInstructionHUD("Faça o retorno à esquerda e entre com cuidado.");
          } else if (nextIdx === polyline.length - 2) {
            setInstructionHUD("Seu ponto de parada está se aproximando. Reduza a velocidade.");
          }

          // Evaluate proxemics of critical security or terrain risks
          const dangerousStopIdx = stops.findIndex(s => {
            const distance = Math.sqrt(Math.pow(s.lat - currentPoint[0], 2) + Math.pow(s.lon - currentPoint[1], 2));
            return distance < 0.005; // ~500 meters
          });
          if (dangerousStopIdx !== -1 && stops[dangerousStopIdx].riskScore > 35) {
            setInstructionHUD(`Alerta de Risco: Zona crítica à frente com ${Math.round(stops[dangerousStopIdx].riskScore)}% de risco.`);
          }

          timer = setTimeout(stepSim, 300); // 300ms step updates for butter smooth animations
          return nextIdx;
        });
      };
      timer = setTimeout(stepSim, 300);
    } else {
      timer = setTimeout(() => {
        setSpeedHUD(0);
      }, 0);
    }

    return () => clearTimeout(timer);
  }, [isDriving, polyline, stops]);

  // Handle segment analysis colored visual lines
  const segments: { coords: [number, number][], color: string }[] = [];
  if (polyline.length > 2) {
      const splitPoint = Math.floor(polyline.length * 0.7);
      segments.push({ coords: polyline.slice(0, splitPoint + 1), color: "#00D4AA" });
      segments.push({ coords: polyline.slice(splitPoint), color: "#FFA500" }); // Risk alert color lane
  } else {
      segments.push({ coords: polyline, color: "#00D4AA" });
  }

  const criticalPoints = stops.filter(s => s.riskScore > 40);

  // Computed transform configuration based on 3D View and active Pilot navigation heading (Track Up or North Up)
  const mapTransformStyles = is3DMode ? {
    transform: `perspective(1000px) rotateX(${isDriving ? '50deg' : '40deg'}) rotateZ(${isDriving && mapOrientation === 'track' ? -smoothHeading : 0}deg)`,
    transformOrigin: '50% 50%',
    transition: isDriving ? 'transform 0.4s cubic-bezier(0.16, 1, 0.3, 1)' : 'transform 1s cubic-bezier(0.16, 1, 0.3, 1)',
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
              {segments.map((seg, i) => (
                  <Polyline 
                      key={i}
                      positions={seg.coords} 
                      color={seg.color} 
                      weight={4} 
                      opacity={1}
                      lineJoin="round"
                      lineCap="round"
                      dashArray={seg.color === "#FFA500" ? "4, 4" : "10, 5"}
                      className="route-line-animated"
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
          />
        </MapContainer>
      </div>

      {/* FLOAT PILOT NAV HUD (Overlay) - Show if active route and map in navigation/navigationScreen */}
      {isNavigationScreen && (
        <div className="absolute top-24 left-1/2 -translate-x-1/2 w-full max-w-md z-[1001] px-4">
          <div className="glass p-3 rounded-2xl border border-tech/20 bg-slate-950/85 shadow-2xl flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-slate-900 border border-slate-800 flex flex-col items-center justify-center shrink-0">
              <span className="font-mono text-lg font-black text-tech tracking-tighter leading-none">{speedHUD}</span>
              <span className="text-[7px] uppercase font-bold text-slate-500 leading-none">km/h</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[8px] uppercase tracking-widest font-black text-tech flex items-center gap-1.5">
                <Navigation className="w-3 h-3 text-tech" style={{ transform: `rotate(${heading}deg)` }} />
                Navegação Assistida Waze
              </p>
              <p className="text-xs font-bold leading-tight truncate text-slate-100 mt-0.5">{instructionHUD}</p>
            </div>
          </div>
        </div>
      )}

      {/* PERSISTENT MAP SYSTEM CONTROLS (Floating Overlays) */}
      <div className="absolute bottom-28 md:bottom-24 right-4 z-[1001] flex flex-col gap-2.5">
        
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

        .route-line-animated {
            stroke-dashoffset: 0;
            animation: dash 35s linear infinite;
        }
        @keyframes dash {
            from { stroke-dashoffset: 1000; }
            to { stroke-dashoffset: 0; }
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
