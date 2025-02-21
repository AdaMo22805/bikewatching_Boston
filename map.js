// Set your Mapbox access token here
mapboxgl.accessToken = 'pk.eyJ1IjoiYWRtbzI4IiwiYSI6ImNtN2F6bXJqeDAxZ2QyaXBzazBkN3F3YzUifQ.qMsVU1trunII_41HfGfe-Q';
let departuresByMinute = Array.from({ length: 1440 }, () => []);
let arrivalsByMinute = Array.from({ length: 1440 }, () => []);


// Initialize the map
const map = new mapboxgl.Map({
  container: 'map', // ID of the div where the map will render
  style: 'mapbox://styles/admo28/cm7chxcse006101so6hsm9zpd', // Map style
  center: [-71.09415, 42.36027], // [longitude, latitude]
  zoom: 12, // Initial zoom level
  minZoom: 5, // Minimum allowed zoom
  maxZoom: 18 // Maximum allowed zoom
});


let stations = []
let trips = []

map.on('load', () => { 
  //code 
  map.addSource('boston_route', {
    type: 'geojson',
    data: 'https://bostonopendata-boston.opendata.arcgis.com/datasets/boston::existing-bike-network-2022.geojson?...'
  });
  map.addLayer({
    id: 'bike-lanes-boston',
    type: 'line',
    source: 'boston_route',
    paint: {
      'line-color': 'green',
      'line-width': 3,
      'line-opacity': 0.4
    }
  });
  map.addSource('cambridge_route', {
    type: 'geojson',
    data: 'https://raw.githubusercontent.com/cambridgegis/cambridgegis_data/main/Recreation/Bike_Facilities/RECREATION_BikeFacilities.geojson'
  });
  map.addLayer({
    id: 'bike-lanes-cambridge',
    type: 'line',
    source: 'cambridge_route',
    paint: {
      'line-color': 'green',
      'line-width': 3,
      'line-opacity': 0.4
    }
  });
  
  const svg = d3.select('#map').select('svg');
  // let stations = [];

  const jsonurl = 'https://dsc106.com/labs/lab07/data/bluebikes-stations.json'
  d3.json(jsonurl).then(jsonData => {
    // console.log('Loaded JSON Data:', jsonData);  // Log to verify structure
    stations = jsonData.data.stations;

    function getCoords(station) {
      const point = new mapboxgl.LngLat(+station.lon, +station.lat);  // Convert lon/lat to Mapbox LngLat
      const { x, y } = map.project(point);  // Project to pixel coordinates
      return { cx: x, cy: y };  // Return as object for use in SVG attributes
    }

    const circles = svg.selectAll('circle')
    .data(stations)
    .enter()
    .append('circle')
    .attr('r', 5)               // Radius of the circle
    .attr('fill', 'steelblue')  // Circle fill color
    .attr('stroke', 'white')    // Circle border color
    .attr('stroke-width', 1)    // Circle border thickness
    .attr('opacity', 0.8)      // Circle opacity
    .style("--departure-ratio", d => stationFlow(isNaN(d.departures / d.totalTraffic) ? 0 : d.departures / d.totalTraffic));

    function updatePositions() {
      circles
        .attr('cx', d => getCoords(d).cx)  // Set the x-position using projected coordinates
        .attr('cy', d => getCoords(d).cy); // Set the y-position using projected coordinates
    }

    // Initial position update when map loads
    updatePositions();

    map.on('move', updatePositions);     // Update during map movement
    map.on('zoom', updatePositions);     // Update during zooming
    map.on('resize', updatePositions);   // Update on window resize
    map.on('moveend', updatePositions);  // Final adjustment after movement ends
  
      // let trips = [];
    const csvurl = 'https://dsc106.com/labs/lab07/data/bluebikes-traffic-2024-03.csv'
    d3.csv(csvurl).then(csvData => {
      // console.log('Loaded JSON Data:', jsonData);  // Log to verify structure
      trips = csvData;


      const departures = d3.rollup(
        trips,
        (v) => v.length,
        (d) => d.start_station_id,
      );

      const arrivals = d3.rollup(
        trips,
        (v) => v.length,
        (d) => d.end_station_id,
      );

      stations = stations.map((station) => {
      let id = station.short_name;
      station.arrivals = arrivals.get(id) ?? 0;
      station.departures = departures.get(id) ?? 0;
      station.totalTraffic = station.departures + station.arrivals;
      return station;
      });

      const radiusScale = d3
      .scaleSqrt()
      .domain([0, d3.max(stations, (d) => d.totalTraffic)])
      .range([0, 25]);

      d3.select('svg')
        .selectAll('circle')
        .data(stations)
        .attr('r', d => radiusScale(d.totalTraffic))
        .style("--departure-ratio", d => stationFlow(isNaN(d.departures / d.totalTraffic) ? 0 : d.departures / d.totalTraffic))
        .each(function(d) {
          // Add <title> for browser tooltips
          d3.select(this)
            .select('title')
            .remove();

          d3.select(this)
            .append('title')
            .text(`${d.totalTraffic} trips (${d.departures} departures, ${d.arrivals} arrivals)`);
        });

        for (let trip of trips) {
          trip.started_at = new Date(trip.started_at);
          trip.ended_at = new Date(trip.ended_at);
          let startedMinutes = minutesSinceMidnight(trip.started_at);
          departuresByMinute[startedMinutes].push(trip);
          let endedMinutes = minutesSinceMidnight(trip.ended_at);
          arrivalsByMinute[endedMinutes].push(trip);
        }

    });

  
  }).catch(error => {
    console.error('Error loading JSON:', error);  // Handle errors if JSON loading fails
  });

});

let timeFilter = -1;
const timeSlider = document.getElementById('time-slider');
const selectedTime = document.getElementById('selected-time');
const anyTimeLabel = document.getElementById('any-time');

function formatTime(minutes) {
  const date = new Date(0, 0, 0, 0, minutes);  // Set hours & minutes
  return date.toLocaleString('en-US', { timeStyle: 'short' }); // Format as HH:MM AM/PM
}

function updateTimeDisplay() {
  timeFilter = Number(timeSlider.value);  // Get slider value
  // console.log(timeFilter);
  if (timeFilter === -1) {
    selectedTime.textContent = '';  // Clear time display
    anyTimeLabel.style.display = 'block';  // Show "(any time)"
    // selectedTime.innerHTML = '<em id="any-time">(any time)</em>'; // Insert <em> tag
  } else {
    selectedTime.textContent = formatTime(timeFilter);  // Display formatted time
    anyTimeLabel.style.display = 'none';  // Hide "(any time)"
    // anyTimeLabel.style.display = 'none'; // Hide "(any time)"
    // selectedTime.textContent = formatTime(timeFilter); // Display formatted time
  }

  // Trigger filtering logic which will be implemented in the next step

}

updateTimeDisplay();
timeSlider.addEventListener('input', updateTimeDisplay);

// let filteredTrips = [];
let filteredArrivals = new Map();
let filteredDepartures = new Map();
let filteredStations = [];

function minutesSinceMidnight(date) {
  return date.getHours() * 60 + date.getMinutes();
}

function filterByMinute(tripsByMinute, minute) {
  // Normalize both to the [0, 1439] range
  let minMinute = (minute - 60 + 1440) % 1440;
  let maxMinute = (minute + 60) % 1440;

  if (minMinute > maxMinute) {
    let beforeMidnight = tripsByMinute.slice(minMinute);
    let afterMidnight = tripsByMinute.slice(0, maxMinute);
    return beforeMidnight.concat(afterMidnight).flat();
  } else {
    return tripsByMinute.slice(minMinute, maxMinute).flat();
  }
}

function filterTripsbyTime() {
  // console.log(trips);
  // filteredTrips = timeFilter === -1
  //     ? trips
  //     : trips.filter((trip) => {
  //         const startedMinutes = minutesSinceMidnight(trip.started_at);
  //         const endedMinutes = minutesSinceMidnight(trip.ended_at);
  //         return (
  //           Math.abs(startedMinutes - timeFilter) <= 60 ||
  //           Math.abs(endedMinutes - timeFilter) <= 60
  //         );
  //       });

      // we need to update the station data here explained in the next couple paragraphs
      filteredDepartures = d3.rollup(
        filterByMinute(departuresByMinute, timeFilter),
        (v) => v.length,
        (d) => d.start_station_id
      );
    
      filteredArrivals = d3.rollup(
        filterByMinute(arrivalsByMinute, timeFilter),
        (v) => v.length,
        (d) => d.end_station_id
      );
    
      // Clone stations and update their traffic data
      filteredStations = stations.map(station => {
        let id = station.short_name;
        station = { ...station }; // Clone the station object to avoid modifying the original
        station.arrivals = filteredArrivals.get(id) ?? 0;
        station.departures = filteredDepartures.get(id) ?? 0;
        station.totalTraffic = station.arrivals + station.departures;
        return station;
      });
    
      // Adjust circle size scale dynamically based on whether filtering is applied
      const radiusScale = d3
        .scaleSqrt()
        .domain([0, d3.max(filteredStations, d => d.totalTraffic)])
        .range(timeFilter === -1 ? [0, 25] : [1, 30]); // Adjust scale when filtered
    
      // Update circle sizes
      d3.select('svg')
        .selectAll('circle')
        .data(filteredStations)
        .attr('r', d => radiusScale(d.totalTraffic))
        .style("--departure-ratio", d => stationFlow(isNaN(d.departures / d.totalTraffic) ? 0 : d.departures / d.totalTraffic))
        .each(function(d) {
          d3.select(this).select('title').remove(); // Remove old tooltip
          d3.select(this)
            .append('title')
            .text(`${d.totalTraffic} trips (${d.departures} departures, ${d.arrivals} arrivals)`);
        });
}

updateTimeDisplay();
timeSlider.addEventListener('input', () => {
  updateTimeDisplay();
  filterTripsbyTime();
});

let stationFlow = d3.scaleQuantize().domain([0, 1]).range([0, 0.5, 1]);