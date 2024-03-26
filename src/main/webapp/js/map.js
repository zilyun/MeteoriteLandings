$(document).ready(function() {

// FCC: Map Data Across the Globe
// User Story: I can see where all meteorites landed on a world map.
// User Story: I can tell the relative size of the meteorite, just by looking at the way it's represented on the map.
// User Story: I can mouse over the meteorite's data point for additional data.


// Map tiles copyright OpenStreetMap, https://www.openstreetmap.org/copyright

/* d3.geo.tile.min.js */
d3.geo.tile=function(){function t(){var t=Math.max(Math.log(n)/Math.LN2-8,0),h=Math.round(t+e),o=Math.pow(2,t-h+8),u=[(r[0]-n/2)/o,(r[1]-n/2)/o],l=[],c=d3.range(Math.max(0,Math.floor(-u[0])),Math.max(0,Math.ceil(a[0]/o-u[0]))),M=d3.range(Math.max(0,Math.floor(-u[1])),Math.max(0,Math.ceil(a[1]/o-u[1])));return M.forEach(function(t){c.forEach(function(a){l.push([a,t,h])})}),l.translate=u,l.scale=o,l}var a=[960,500],n=256,r=[a[0]/2,a[1]/2],e=0;return t.size=function(n){return arguments.length?(a=n,t):a},t.scale=function(a){return arguments.length?(n=a,t):n},t.translate=function(a){return arguments.length?(r=a,t):r},t.zoomDelta=function(a){return arguments.length?(e=+a,t):e},t};
/* end d3.geo.tile.min.js */


var Chart = (function(window, d3) {
  var url = 'https://raw.githubusercontent.com/FreeCodeCamp/ProjectReferenceData/master/meteorite-strike-data.json';
  
  var data, width, height, prefix, tile, projection, zoom, svg, meteorite, meteorCircles, map, layer, coordinates, tooltip, title;
  var mean, standardDeviation;  // variables for calculating mass spread 
  var currentLocation, currentZoom; // variables to keep track of location/zoom on window resize
  
  d3.json(url, init);
  
  function init(json) {
    // 1. Filter out junk data in json file
    data = json.features.filter(function(d) {if (d.geometry == null || d.properties.mass == null || d.properties.mass === undefined || (d.geometry.coordinates[0] === 0 && d.geometry.coordinates[1] === 0)) return false; else return true; });

    // 2. Get statistical spread of radius size in order to present a good color spread of the data   
    var dataLength = data.length;
    var sum = 0, variance = 0, sumOfSquares = 0;
    mean = 0;
    standardDeviation = 0;
    
    // 3. In the meantime, append radius, fillColor, and colorClass to json so such attributes don't have to be recalculated each time.
    data.forEach(function(d) {
      d.geometry.radius = Math.pow(Math.log10(d.properties.mass) + 1, 2.3);      
      sum += d.geometry.radius;
    });
    
    mean = sum/dataLength;
    
    data.forEach(function(d) {
      variance = Math.pow(d.geometry.radius - mean, 2);
      sumOfSquares += variance;
    });
    
    standardDeviation = Math.sqrt(sumOfSquares/dataLength);
    
    data.forEach(function(d) {
      var fillColor = '';
      var colorClass = '';
      switch(true) {
          case (d.geometry.radius < mean - 2 * standardDeviation): fillColor = '#ffffe0'; colorClass = 'color-1'; break;
          case (d.geometry.radius < mean - standardDeviation): fillColor = '#ffd59b'; colorClass = 'color-2'; break;
          case (d.geometry.radius < mean): fillColor = '#ffa474'; colorClass = 'color-3'; break;
          case (d.geometry.radius < mean + standardDeviation): fillColor = '#f47461'; colorClass = 'color-4'; break;
          case (d.geometry.radius < mean + 2 * standardDeviation): fillColor = '#db4551'; colorClass = 'color-5'; break;
          case (d.geometry.radius < mean + 3 * standardDeviation): fillColor = '#b81b34'; colorClass = 'color-6'; break;
          case (d.geometry.radius >= mean + 3 * standardDeviation): fillColor = '#8b0000'; colorClass = 'color-7'; break;
        }
      
      d.properties.fillColor = fillColor;
      d.properties.colorClass = colorClass;
      
    });   
    
    // 4. Basic setup
    projection = d3.geo.mercator();
    
    tile = d3.geo.tile();
    zoom = d3.behavior.zoom();
    
    projection.scale(zoom.scale() / 2 / Math.PI)
      .translate(zoom.translate());
    
    zoom.scale(1 << 11) //starting zoom
      .scaleExtent([1 << 9, 1 << 23]);  // zoom limits

    
    svg = d3.select('.chart').append('svg')
      .call(zoom)
      .on('mousemove', function() {
        coordinates.text(formatCoordinates(projection.invert(d3.mouse(this)), zoom.scale()));
      })
      .on('mouseout', function() {
        coordinates.text('');
      });
    
    layer = svg.append('g')
      .attr('class', 'layer');
    
    meteorite = svg.append('g')
      .attr('class', 'meteorite');
    
    meteorCircles = meteorite.selectAll('meteorite--circle')
      .data(data).enter()
      .append('circle')
      .attr('transform', function(d) { return 'translate(' + projection(d.geometry.coordinates)  + ')scale(' + projection.scale() + ')'})
      .attr('r', function(d) { return d.geometry.radius/zoom.scale(); })
      .attr('stroke', 'black')
      .attr('stroke-width', '2px')
      .attr('vector-effect', 'non-scaling-stroke')
      .attr('fill', function(d) { return d.properties.fillColor; })
      .attr('class', 'meteorite--circle')
    
      .on('mousemove', function(d) {
          d3.select(this).attr('class', 'meteorite--circle-active');
          tooltip.transition()
            .duration(200)
            .style('opacity', 0.9);
      
          tooltip.html(
            '<div><span class="tooltip--name ' + d.properties.colorClass + '">' + d.properties.name + '</span><br>' +
            '<span class="tooltip--prop">Mass:</span> ' + String(parseFloat((d.properties.mass/1000).toFixed(3))).replace(/(\d)(?=(\d{3})+$)/, '$1,') + 'kg<br>' +
            '<span class="tooltip--prop">Longitude:</span> ' + Number(d.properties.reclong).toFixed(2) + '<br>' +
            '<span class="tooltip--prop">Latitude:</span> ' + Number(d.properties.reclat).toFixed(2) + '<br>' +
            '<span class="tooltip--prop">Year:</span> ' + d.properties.year.substring(0, 4) + '<br>' +
            '<span class="tooltip--prop">Group:</span> ' + d.properties.recclass + '</div>'
          )
            .style('left', (d3.event.pageX + 10) + 'px')
            .style('top', (d3.event.pageY < 130) ? 0 : d3.event.pageY - 130 + 'px');
        })
        .on('mouseout', function(d) {
          d3.select(this).attr('class', 'meteorite--circle');
            tooltip.transition()
              .duration(500)
              .style('opacity', 0);
        });
      
    coordinates = svg.append('g')
      .attr('class', 'coordinates')
      .append('text');
    
    tooltip = d3.select('body').append('div')
      .attr('class', 'tooltip')
      .style('opacity', 0);
    
    title = d3.select('body').append('div')
      .attr('class', 'title')
      .text('Meteorite Landings');
    
    
    // 5. Formats the coordinates text at the bottom left
    function formatCoordinates(p, k) {
      var format = d3.format('.' + Math.floor(Math.log(k) / 2 - 2) + 'f');
      return (p[1] < 0 ? format(-p[1]) + '°S' : format(p[1]) + '°N') + ' '
           + (p[0] < 0 ? format(-p[0]) + '°W' : format(p[0]) + '°E');
    }
        
    render();
  }
  
  function render() {
    updateDimensions();
    
    svg.attr('width', width)
      .attr('height', height);
    
    tile.size([width, height]);
    
    zoom.translate(currentLocation || [width/2, height/2])
      .on('zoom', zoomed);
      
    zoomed();
    
    function zoomed() {
      var tiles = tile
          .scale(currentZoom || zoom.scale())
          .translate(currentLocation || zoom.translate())
          ();

      // 6. Needed for proper coordinates on location
      projection.scale((currentZoom || zoom.scale()) / 2 / Math.PI)
          .translate(currentLocation || zoom.translate());
      
      
      var image = layer
          .attr('transform', 'scale(' + tiles.scale + ')translate(' + tiles.translate + ')')
        .selectAll('image')
          .data(tiles, function(d) { return d; });

      // 7. Destroy old image tiles when re-rendering
      image.exit()
          .remove();

      image.enter().append('image')
          .attr('xlink:href', function(d) { return 'http://' + ['a', 'b', 'c'][Math.random() * 3 | 0] + '.tile.openstreetmap.org/' + d[2] + '/' + d[0] + '/' + d[1] + '.png'; })
          .attr('width', 1)
          .attr('height', 1)
          .attr('x', function(d) { return d[0]; })
          .attr('y', function(d) { return d[1]; })
          .on('error', function(d) { d3.select(this).style('visibility', 'hidden')});
      
      d3.selectAll('.meteorite')
        .attr('transform', 'translate(' + (currentLocation || zoom.translate()) + ')scale(' + (currentZoom || zoom.scale()) + ')');
      
      // 8. Keeps the circles the same size between zooms
      d3.selectAll('.meteorite--circle')
        .attr('r', function(d) { return d.geometry.radius/(currentZoom || zoom.scale()); });
      
      d3.select('.coordinates')
        .attr('transform', 'translate(10,' + (height - 10) + ')');
      
      currentZoom = zoom.scale();
      currentLocation = zoom.translate();
    }
  }
  
  
  function updateDimensions() {
    width = window.innerWidth * 0.8;
    height = window.innerHeight * 0.8; 
  }
  
  return {
    render: render
  }
  
})(window, d3);


window.addEventListener('resize', Chart.render);
});