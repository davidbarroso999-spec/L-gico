'use client';

import React, { useEffect } from 'react';
import Image from 'next/image';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix Leaflet icons in Next.js
const icon = L.icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

interface MapProps {
  stops: any[];
  geometry?: any;
}

function RecenterMap({ stops, geometry }: { stops: any[], geometry?: any }) {
  const map = useMap();
  useEffect(() => {
    if (geometry?.coordinates?.length > 0) {
      const bounds = L.latLngBounds(geometry.coordinates.map((c: any) => [c[1], c[0]]));
      map.fitBounds(bounds, { padding: [50, 50] });
    } else if (stops.length > 0) {
      const bounds = L.latLngBounds(stops.map(s => [s.lat, s.lon]));
      map.fitBounds(bounds, { padding: [50, 50] });
    }
    // Force recalculate map size (fixes common React-Leaflet grey box issues)
    setTimeout(() => {
        map.invalidateSize();
    }, 400);
  }, [stops, map, geometry]);
  return null;
}

// Custom icon function for numbered markers
const createNumberedIcon = (number: number, isLast: boolean, isFirst: boolean) => {
  const color = isFirst ? '#00D4AA' : isLast ? '#F43F5E' : '#3B82F6';
  return L.divIcon({
    html: `
      <div style="
        background-color: ${color};
        color: #0F172A;
        width: 30px;
        height: 30px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-weight: 900;
        font-size: 14px;
        border: 3px solid #0F172A;
        box-shadow: 0 0 10px ${color}80;
      ">
        ${number}
      </div>
    `,
    className: '',
    iconSize: [30, 30],
    iconAnchor: [15, 15],
  });
};

export default function MapView({ stops, geometry }: MapProps) {
  const polyline = geometry?.coordinates?.map((c: number[]) => [c[1], c[0]]) || [];

  // Simulate segment analysis for visualization (in a real app this would come from the API)
  // We split the polyline into segments to show colors like the image
  const segments: { coords: [number, number][], color: string }[] = [];
  if (polyline.length > 2) {
      const splitPoint = Math.floor(polyline.length * 0.7);
      segments.push({ coords: polyline.slice(0, splitPoint + 1), color: "#00D4AA" });
      segments.push({ coords: polyline.slice(splitPoint), color: "#FFA500" }); // Orange alert segment
  } else {
      segments.push({ coords: polyline, color: "#00D4AA" });
  }

  const criticalPoints = stops.filter(s => s.riskScore > 40);

  return (
    <div className="h-full w-full relative overflow-hidden">
      <MapContainer
        center={[-3.119, -60.021]}
        zoom={12}
        style={{ height: '100%', width: '100%', background: '#020617' }}
        zoomControl={false}
      >
        <TileLayer
          attribution='&copy; CARTO'
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        />
        
        {stops.map((stop, idx) => (
          <Marker 
            key={stop.id} 
            position={[stop.lat, stop.lon]} 
            icon={createNumberedIcon(idx + 1, idx === stops.length - 1, idx === 0)}
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
                        <span className={`text-xs font-black ${stop.riskScore > 30 ? 'text-alert' : 'text-tech'}`}>{Math.round(stop.riskScore)}%</span>
                    </div>
                    <div className="flex flex-col items-end">
                        <span className="text-[8px] uppercase text-slate-400">Clima</span>
                        <div className="flex items-center gap-1">
                          {stop.weather && (
                            <img 
                              src={`https://openweathermap.org/img/wn/${stop.weather.weather[0].icon}.png`}
                              alt={stop.weather.weather[0].description}
                              className="w-6 h-6 invert opacity-80"
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

        {/* Hazard/Critical Markers */}
        {criticalPoints.map((cp, idx) => (
           <Marker 
            key={`risk-${idx}`} 
            position={[cp.lat + 0.001, cp.lon + 0.001]} 
            icon={L.divIcon({
                html: `<div class="animate-ping w-4 h-4 bg-alert rounded-full opacity-75"></div>`,
                className: ''
            })}
           />
        ))}

        {polyline.length >= 2 && (
          <>
            {/* Glow effect for entire line */}
            <Polyline 
              positions={polyline} 
              color="#00D4AA" 
              weight={8} 
              opacity={0.1}
            />
            {/* Multi-color Segments */}
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
        
        <RecenterMap stops={stops} geometry={geometry} />
      </MapContainer>

      {/* Map Overlays */}
      <div className="absolute top-4 right-4 z-[1000] flex flex-col gap-2">
        <div className="glass px-3 py-2 rounded-xl text-[10px] uppercase font-black tracking-widest flex items-center gap-2 border border-white/10 shadow-2xl">
            <div className="w-2 h-2 rounded-full bg-tech animate-pulse shadow-[0_0_8px_#00D4AA]" />
            <span>LIVE FLOWING</span>
        </div>
      </div>

      <style jsx global>{`
        .route-line-animated {
            stroke-dashoffset: 0;
            animation: dash 30s linear infinite;
        }
        @keyframes dash {
            from { stroke-dashoffset: 1000; }
            to { stroke-dashoffset: 0; }
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
