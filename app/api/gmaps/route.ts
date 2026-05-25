import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, payload } = body;

    const API_KEY = process.env.GOOGLE_MAPS_API_KEY;
    if (!API_KEY) {
      return NextResponse.json({ error: 'Missing GOOGLE_MAPS_API_KEY config' }, { status: 500 });
    }

    if (action === 'matrix') {
      // payload.locations is an array of [lat, lon]
      const origins = payload.locations.map((l: number[]) => ({
        waypoint: { location: { latLng: { latitude: l[0], longitude: l[1] } } }
      }));
      // Using Routes API (Compute Route Matrix)
      const gmapsRes = await fetch('https://routes.googleapis.com/distanceMatrix/v2:computeRouteMatrix', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': API_KEY,
          'X-Goog-FieldMask': 'originIndex,destinationIndex,duration,distanceMeters,status'
        },
        body: JSON.stringify({
          origins: origins,
          destinations: origins,
          travelMode: 'DRIVE',
          routingPreference: 'TRAFFIC_AWARE_OPTIMAL'
        })
      });

      if (!gmapsRes.ok) {
        const text = await gmapsRes.text();
        return NextResponse.json({ error: `Google Maps API error: ${text}` }, { status: gmapsRes.status });
      }
      
      const data = await gmapsRes.json();
      
      const size = origins.length;
      const distances = Array(size).fill(0).map(() => Array(size).fill(0));
      const durations = Array(size).fill(0).map(() => Array(size).fill(0));
      
      // Google Routes API returns an flat array of elements
      if (Array.isArray(data)) {
        data.forEach((elm: any) => {
          const originIdx = elm.originIndex ?? 0;
          const destIdx = elm.destinationIndex ?? 0;
          const dist = elm.distanceMeters ?? 0;
          let dur = 0;
          if (elm.duration) {
             dur = parseFloat(elm.duration.replace('s', ''));
          }
          distances[originIdx][destIdx] = dist;
          durations[originIdx][destIdx] = dur;
        });
      }

      return NextResponse.json({ distances, durations });
    } 
    
    if (action === 'directions') {
      const { points } = payload;
      // points is array of [lat, lon]
      const origin = { location: { latLng: { latitude: points[0][0], longitude: points[0][1] } } };
      const destination = { location: { latLng: { latitude: points[points.length - 1][0], longitude: points[points.length - 1][1] } } };
      const intermediates = points.slice(1, -1).map((p: number[]) => ({
        location: { latLng: { latitude: p[0], longitude: p[1] } }
      }));

      const gmapsRes = await fetch('https://routes.googleapis.com/directions/v2:computeRoutes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': API_KEY,
          'X-Goog-FieldMask': 'routes.duration,routes.distanceMeters,routes.polyline.encodedPolyline,routes.legs'
        },
        body: JSON.stringify({
          origin,
          destination,
          ...(intermediates.length > 0 ? { intermediates } : {}),
          travelMode: 'DRIVE',
          routingPreference: 'TRAFFIC_AWARE_OPTIMAL',
          computeAlternativeRoutes: false,
          languageCode: 'pt-BR',
          units: 'METRIC'
        })
      });

      if (!gmapsRes.ok) {
        const text = await gmapsRes.text();
        return NextResponse.json({ error: `Google Maps Directions error: ${text}` }, { status: gmapsRes.status });
      }
      const data = await gmapsRes.json();

      let features: any[] = [];
      if (data.routes && data.routes.length > 0) {
        const route = data.routes[0];
        
        // Decode polyline to [lat, lon] then format to [lon, lat] for geojson
        const polylineLib = require('@mapbox/polyline');
        let coordinates: number[][] = [];
        const polylineStr = route.polyline?.encodedPolyline || route.polyline?.encodedPath;
        if (polylineStr) {
          const latLons = polylineLib.decode(polylineStr);
          coordinates = latLons.map((p: number[]) => [p[1], p[0]]); // [lon, lat]
        }

        let totalDuration = 0;
        if (route.duration) {
           totalDuration = parseFloat(route.duration.replace('s', ''));
        }

        // Map legs to segments
        const segments = route.legs?.map((leg: any) => ({
          distance: leg.distanceMeters || 0,
          duration: parseFloat((leg.duration || '0s').replace('s', '')),
          steps: [] // We skip detailed steps mapping for brevity unless needed
        })) || [];

        features.push({
          geometry: {
            coordinates: coordinates,
            type: "LineString"
          },
          properties: {
            summary: {
              distance: route.distanceMeters || 0,
              duration: totalDuration
            },
            segments: segments
          }
        });
      }

      return NextResponse.json({ features });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });

  } catch (error: any) {
    console.error('Google Maps integration error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
