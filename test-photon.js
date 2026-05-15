import fetch from 'node-fetch';

async function test() {
  const q = 'Centro, Manaus';
  const res = await fetch(`https://photon.komoot.io/api/?q=${encodeURIComponent(q)}&lat=-3.119&lon=-60.021&limit=1`);
  const data = await res.json();
  const f = data.features[0];
  console.log(JSON.stringify({
    lat: f.geometry.coordinates[1],
    lon: f.geometry.coordinates[0],
    label: `${f.properties.name}, ${f.properties.city}`
  }));
}
test();
