const fs = require('fs');
let code = fs.readFileSync('lib/route-engine.ts', 'utf8');

// Find the line:
// const baseResult = {
//     sequence,

// Let's modify the final geometry step (step 6).
const targetStr = `  // 6. Final geometry
  let directions: any = null;
  if (options.vehicle === 'boat') {`;

const replaceStr = `  // 6. Final geometry
  let directions: any = null;
  if (options.isHybrid && sequence.length >= 2) {
    const origin = sequence[0];
    const dest = sequence[sequence.length - 1];
    
    let portOri = FLUVIAL_PORTS[0]; let minD1 = Infinity;
    for (const p of FLUVIAL_PORTS) {
      const d = calculateDistance(origin.lat, origin.lon, p.lat, p.lon);
      if (d < minD1) { minD1 = d; portOri = p; }
    }
    
    let portDes = FLUVIAL_PORTS[0]; let minD2 = Infinity;
    for (const p of FLUVIAL_PORTS) {
      const d = calculateDistance(dest.lat, dest.lon, p.lat, p.lon);
      if (d < minD2) { minD2 = d; portDes = p; }
    }
    
    // Create new sequence
    const p1 = { ...origin, id: 'port1', address: 'Porto de Embarque: ' + portOri.name, lat: portOri.lat, lon: portOri.lon, sequence: 1.5, stopType: 'pickup' };
    const p2 = { ...dest, id: 'port2', address: 'Porto de Desembarque: ' + portDes.name, lat: portDes.lat, lon: portDes.lon, sequence: sequence.length - 0.5, stopType: 'delivery' };
    
    const newSeq = [origin, p1, p2, dest];
    sequence.splice(0, sequence.length, ...newSeq); // replace sequence inplace
    
    // Calculate 3 legs
    try {
      const leg1 = await getDirections([[origin.lat, origin.lon], [p1.lat, p1.lon]], profile, preference, options.engine);
      const fluvialStats = getFluvialPathStats(portOri.nodeId, portDes.nodeId, options.priority, options.vesselType);
      const leg3 = await getDirections([[p2.lat, p2.lon], [dest.lat, dest.lon]], profile, preference, options.engine);
      
      const c1 = leg1?.features?.[0]?.geometry?.coordinates || [[origin.lon, origin.lat], [p1.lon, p1.lat]];
      const c2 = [[p1.lon, p1.lat], [p2.lon, p2.lat]]; // straight line for fluvial
      const c3 = leg3?.features?.[0]?.geometry?.coordinates || [[p2.lon, p2.lat], [dest.lon, dest.lat]];
      
      const dist1 = leg1?.features?.[0]?.properties?.summary?.distance || 0;
      const dur1 = leg1?.features?.[0]?.properties?.summary?.duration || 0;
      const dist2 = fluvialStats.distance * 1000;
      const dur2 = fluvialStats.duration * 60;
      const dist3 = leg3?.features?.[0]?.properties?.summary?.distance || 0;
      const dur3 = leg3?.features?.[0]?.properties?.summary?.duration || 0;
      
      directions = {
        features: [{
          geometry: { type: 'LineString', coordinates: [...c1, ...c2, ...c3] },
          properties: {
            summary: { distance: dist1 + dist2 + dist3, duration: dur1 + dur2 + dur3 },
            segments: [
              { distance: dist1, duration: dur1, instruction: 'Etapa 1: Terrestre até Porto' },
              { distance: dist2, duration: dur2, instruction: 'Etapa 2: Travessia Fluvial' },
              { distance: dist3, duration: dur3, instruction: 'Etapa 3: Terrestre até Destino' }
            ],
            hybridAnalysis: 'Rota Multimodal Híbrida Gerada com Sucesso (Terrestre -> Fluvial -> Terrestre)'
          }
        }]
      };
    } catch(e) {
      console.error('Hybrid routing failed', e);
    }
  } else if (options.vehicle === 'boat') {`;

code = code.replace(targetStr, replaceStr);
fs.writeFileSync('lib/route-engine.ts', code);
