// Set your Mapbox access token here
mapboxgl.accessToken = 'pk.eyJ1IjoiYWRtbzI4IiwiYSI6ImNtN2F6bXJqeDAxZ2QyaXBzazBkN3F3YzUifQ.qMsVU1trunII_41HfGfe-Q';

// Initialize the map
const map = new mapboxgl.Map({
  container: 'map', // ID of the div where the map will render
  style: 'mapbox://styles/admo28/cm7chxcse006101so6hsm9zpd', // Map style
  center: [-71.09415, 42.36027], // [longitude, latitude]
  zoom: 12, // Initial zoom level
  minZoom: 5, // Minimum allowed zoom
  maxZoom: 18 // Maximum allowed zoom
});