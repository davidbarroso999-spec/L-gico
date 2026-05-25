const https = require('https');
const req = https.request('https://routes.googleapis.com/distanceMatrix/v2:computeRouteMatrix', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-Goog-Api-Key': process.env.GOOGLE_MAPS_API_KEY,
    'X-Goog-FieldMask': 'originIndex,destinationIndex,duration,distanceMeters,condition'
  }
}, (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => console.log(data));
});
req.write(JSON.stringify({
  origins: [{ waypoint: { location: { latLng: { latitude: 37.42, longitude: -122.08 } } } }],
  destinations: [{ waypoint: { location: { latLng: { latitude: 37.42, longitude: -122.08 } } } }],
  travelMode: 'DRIVE'
}));
req.end();
