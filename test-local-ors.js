import fetch from 'node-fetch';

async function test() {
  const payload = {
    endpoint: `v2/directions/driving-car/geojson`,
    method: 'POST',
    body: { 
      coordinates: [[-60.021, -3.119], [-60.03, -3.12]],
      preference: "fastest"
    }
  };

  const response = await fetch('http://127.0.0.1:3000/api/ors', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  const data = await response.json();
  console.log("Status:", response.status);
  console.log("Features geometry:", data?.features?.[0]?.geometry?.type);
}
test();
