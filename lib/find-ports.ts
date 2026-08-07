export function getClosestPort(lat: number, lon: number, ports: any[]) {
  // simple euclidean distance approximation for finding the closest port
  let min = Infinity;
  let closest = ports[0];
  for (const p of ports) {
    const d = Math.pow(p.lat - lat, 2) + Math.pow(p.lon - lon, 2);
    if (d < min) {
      min = d;
      closest = p;
    }
  }
  return closest;
}
