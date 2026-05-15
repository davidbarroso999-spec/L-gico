import fetch from 'node-fetch';

async function test() {
  const ORS_KEY = 'eyJvcmciOiI1YjNjZTM1OTc4NTExMTAwMDFjZjYyNDgiLCJpZCI6ImE2MGFmMzA2YmQ5NzQ4MjQ4ODljOGNhMTgzM2Y3YjAwIiwiaCI6Im11cm11cjY0In0=';
  const url = `https://api.openrouteservice.org/v2/directions/driving-car/geojson`;
  const body = { 
    coordinates: [[-60.021, -3.119], [-60.03, -3.12]],
    preference: "fastest",
    instructions: true
  };

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': ORS_KEY
    },
    body: JSON.stringify(body)
  });

  const txt = await response.text();
  console.log("Status:", response.status);
  console.log("Response:", txt.substring(0, 500));
}
test();
