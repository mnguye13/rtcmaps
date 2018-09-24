/*global $ Meny d3 */

$(document).ready(function() {
  $('#floor').select2();
  $('#building').select2();
  customStyles();
  const searchContent = populateSearch((newBeacons) => {
      $('.ui.search')
          .search({
              type: 'category',
              source: newBeacons
          });
  });

  var meny = Meny.create({
  	menuElement: document.querySelector( '.meny' ),
  	contentsElement: document.querySelector( '.contents' ),
  	position: 'left',
  	height: 100,
  	width: 260,
  	angle: 30,
  	threshold: 40,
  	overlap: 6,
  	transitionDuration: '0.5s',
  	transitionEasing: 'ease',
  	gradient: 'rgba(0,0,0,0.20) 0%, rgba(0,0,0,0.65) 100%)',
  	mouse: true,
  	touch: true,
  });

  const mobile = $(window).width() <= 500;
  renderSVG(mobile, $('#floor').select2('data')[0].text, true);

  //
  $('#showBeacons').change(function () {
    if ($(this).is(':checked')) {
      renderBeacons(mobile);
    } else {
      d3.selectAll('circle').remove();
    }
  });

  $('#showGateways').change(function () {
    if ($(this).is(':checked')) {
      console.log('Showing gateways');
    } else {
      d3.selectAll('circle').remove();
    }
  });

  $('#addbeacon').change(function () {
    $('#addgateway').prop('checked', false);
    if ($('#addbeacon').prop('checked') == true) {
      d3.select('svg').on("click", function () {
        // This function will run when someone clicks on map when add mode is activated
          let coordinates = d3.mouse(this);
          let position = realPosition(coordinates[0], coordinates[1], mobile);
          renderTemporaryBeacon(coordinates[0], coordinates[1]);
          $('#beaconForm').modal('show');
          $('#beaconForm #xValue').val(position.x);
          $('#beaconForm #yValue').val(position.y);
          $('#beaconForm #building_id').val($('#building').val());
          $('#beaconForm #floor_id').val($('#floor').val());
      });
    } else {
      d3.select('svg').on('click', null);
    }
  });

  $('#addgateway').change(function () {
    $('#addbeacon').prop('checked', false);
    if ($('#addgateway').prop('checked') == true) {
      d3.select('svg').on("click", function () {
        // This function will run when someone clicks on map when add mode is activated
        let coordinates = d3.mouse(this);
        let position = realPosition(coordinates[0], coordinates[1], mobile);
        renderGateway(coordinates[0], coordinates[1], position.x, position.y);
        $('#gatewayForm').modal('show');
        $('#gatewayForm #xValue').val(position.x);
        $('#gatewayForm #yValue').val(position.y);
      });
    } else {
        d3.select('svg').on('click', null);
    }
  });

  $('#floor').on('select2:select', function (e) {
    $('#addbeacon').prop('checked', false);
    $('#addgateway').prop('checked', false);
    var data = e.params.data;
    renderSVG(mobile, data.text, false);
  });

  $('#building').on('select2:select', function (e) {
    $('#addbeacon').prop('checked', false);
    $('#addgateway').prop('checked', false);
    //alert($('#addgateway').val());
    var data2 = e.params.data;
    if (data2.text === 'Stuart') {
      window.location.href = '/stuart';
    } else if (data2.text === 'Alumini') {
      window.location.href = '/alumini';
    }
    renderSVG(mobile, data2.text, false);
  });

  $( "#registerBeacon" ).submit(function( event ) {
    console.log($( this ).serializeArray());
    var formData = parseToJSON($( this ).serializeArray());
    console.log(formData);

    event.preventDefault();
  });
});

function parseToJSON(serializeArray){
  var jsonObj = {};
  jQuery.map( serializeArray, function( n, i ) {
     jsonObj[n.name] = n.value;
   });
  return jsonObj;
}

function populateSearch(callback) {
  $.get('https://api.iitrtclab.com/beacons/', (beacons) => {
    const newBeacons = beacons.map((beacon) => {
      return {category: beacon.building_id, title: beacon.beacon_id}
    });
    callback(newBeacons);
  });
}

//returns real life x and y from locked origin in meters
function realPosition(svgX, svgY, mobile) {
  let positionObject = {};
  if (mobile) {
    positionObject.x = inverseMapX(svgX);
    positionObject.y = inverseMapY(svgY);
  } else {
    positionObject.x = parseFloat(d3.select('svg').attr('data-width'), 10) - inverseMapX(svgY);
    positionObject.y = inverseMapY(svgX);
  }
  return positionObject;
}

// Should figure out a way to do this in css
function customStyles() {
  // Custom styles for stuart maps
  if (window.location.pathname === '/stuart') {
    $('body').height('100vh');
  }
}

function getRandomNumber(min, max) {
  return Math.random() * (max - min) + min;
}

function renderBeacons(mobile) {
  let buildingFloor = $('#floor').select2('data')[0].text.split('-');
  $.get(`https://api.iitrtclab.com/beacons/${buildingFloor[0]}/${buildingFloor[1]}`, (beacons) => {
    beacons.forEach((beacon) => {
      setBeacon(beacon, mobile);
    });

    const dragHandler = d3.drag()
        .on("drag", function () {
          d3.select(this)
              .selectAll('circle')
              .attr("cx", d3.event.x)
              .attr("cy", d3.event.y);
          })
        .on('end', function() {
          // this function runs after the user drops the beacon to its new position
            const position = realPosition(d3.event.x, d3.event.y, mobile);
            d3.select(this).select('.mainCircle')
                .attr('fill', 'red')
                .attr('data-original-title', `x: ${Number((position.x).toFixed(2))} y: ${Number((position.y).toFixed(2))}`);
          });

      dragHandler(d3.selectAll(".beacons"));
  });
}

function renderBeacon (x, y, beacon) {

  var group = d3.select('svg').append('g').attr('class', 'beacons');

  group.append('circle')
          .attr("cx", x)
          .attr("cy", y)
          .attr("r", 15);

  group.append('circle')
          .attr('class', 'mainCircle')
          .attr("cx", x)
          .attr("cy", y)
          .attr("r", 0)
          .attr('data-toggle', 'popover')
          .attr('data-html', true)
          .attr('data-content', `<div class="row"><div class="col-md-12 text-center"><strong>MAC Address:</strong> ${beacon.beacon_id}</div></div>
            <div style="margin-top: 2px" class="row"><div class="col-md-6 text-center"><strong>x</strong>: ${Number((beacon.x).toFixed(2))}</div><div class="col-md-6 text-center"><strong>y:</strong> ${Number((beacon.y).toFixed(2))}</div></div>
            <div style="margin-top: 4px" class="row"><div class="col-md-6 text-center"><button style="width:100%" type="button" class="btn btn-warning btn-sm">Edit</button></div><div class="col-md-6 text-center"><button style="width:100%" type="button" class="btn btn-danger btn-sm">Delete</button></div></div>
            <div style="margin-top: 4px" class="row"><div class="col-md-12 text-center"><button style="width:70%" type="button" id="closePopover" class="btn btn-secondary btn-sm">Close</button></div></div>`)
          .attr('data-trigger', 'manual')
          .attr('data-placement', 'top')
          .attr('title', `Major: ${beacon.major} Minor: ${beacon.minor}`)
          .on('mouseover', function() {
            d3.select(this).transition()
                           .duration(300)
                           .attr("r", "100");

          })
          .on('mouseout', function () {
            d3.select(this).transition()
                           .duration(300)
                           .attr("r", "50");
          })
          .on('click', function() {
            $(this).popover('show');
            $('#closePopover').click(() => {
              $('[data-toggle="popover"]').popover('hide');
            });
          })
          .style("fill", 'rgb(88, 91, 96)')
          .style("fill-opacity", "0.6")
          .style("stroke", "black")
          .style("stroke-dasharray", "80, 50")
          .style("stroke-width", "8")
          .transition()
          .duration(300)
          .attr("r", 50)
          .attr("transform", "rotate(180deg)")
  }

function renderTemporaryBeacon (x, y) {

    var group = d3.select('svg').append('g').attr('class', 'beacons');

    group.append('circle')
        .attr("cx", x)
        .attr("cy", y)
        .attr("r", 15);

    group.append('circle')
        .attr('class', 'mainCircle')
        .attr("cx", x)
        .attr("cy", y)
        .attr("r", 0)
        .on('mouseover', function () {
            d3.select(this).transition()
                .duration(300)
                .attr("r", "100");


        })
        .on('mouseout', function () {
            d3.select(this).transition()
                .duration(300)
                .attr("r", "50");
        })
        .style("fill", 'rgb(88, 91, 96)')
        .style("fill-opacity", "0.6")
        .style("stroke", "black")
        .style("stroke-dasharray", "80, 50")
        .style("stroke-width", "8")
        .transition()
        .duration(300)
        .attr("r", 50)
        .attr("transform", "rotate(180deg)")
    }

  function renderGateway (x, y, realX, realY) {
    var group = d3.select('svg').append('g').attr('class', 'beacons');

    group.append('circle')
            .attr("cx", x)
            .attr("cy", y)
            .attr("r", 15);

    group.append('circle')
            .attr('class', 'mainCircle')
            .attr("cx", x)
            .attr("cy", y)
            .attr("r", 0)
            .attr("data-toggle", "tooltip")
            .attr("title", `x: ${Number((realX).toFixed(2))} y: ${Number((realY).toFixed(2))}`)

            .on('mouseover', function() {
              d3.select(this).transition()
                             .duration(300)
                             .attr("r", "100")

              $(this).tooltip();
              $(this).tooltip('show');
            })

            .on('mouseout', function () {
              d3.select(this).transition()
                             .duration(300)
                             .attr("r", "50");
            })
            .style("fill", 'rgb(255, 0, 0)')
            .style("fill-opacity", "0.6")
            .style("stroke", "black")
            .style("stroke-dasharray", "80, 50")
            .style("stroke-width", "8")
            .transition()
            .duration(300)
            .attr("r", 50)
            .attr("transform", "rotate(180deg)");
    }


function renderSVG (mobile, svgName, initialRender) {
  const currentPath = window.location.pathname;
  const svgPath = !mobile ? `/svg/${svgName}-R.svg` : `/svg/${svgName}.svg`;

  d3.xml(svgPath, function(xml) {
    $('[data-toggle="tooltip"]').tooltip('hide');
    try {
      $('.svgContainer').empty();
      $('.svgContainer').append(xml.documentElement);
      const svg = d3.select('svg');
      svg.attr('width', '100%');
      svg.attr('height', !mobile ? '87vh' : '100%');

      if (!initialRender) {
        $('.alert').remove();
      }
    } catch (e) {
      $('.alert').remove();
      $('nav').after(`<div class="alert alert-danger container" style="margin-top: 25px;" role="alert">
        Sorry the map for this floor doesn't exist.
      </div>`);
    }
  });
}

// Functions for mapping real life becons on Map
function setLocation(x, y, radius) {
    d3.select('svg').append("circle")
                    .attr("cx", x)
                    .attr("cy", y)
                    .attr("r", 15);

    d3.select('svg').append("circle")
                    .attr("cx", x)
                    .attr("cy", y)
                    .style("fill", "#5e8fd1")
                    .style("fill-opacity", "0.59")
                    .attr("r", 10)
                    .transition()
                    .duration(750)
                    .attr("r", radius);
}

// Gets aspect ratio for SVG Map. Should be same as real aspect ration of building floor.
function getAspectRatio() {
  const origin = d3.select('.origin').filter('path').node().getBBox();
  const originTop = d3.select('.originTop').filter('path').node().getBBox();
  return ((origin.y + origin.height) - originTop.y)/((originTop.x + originTop.width)- origin.x)
}

// Gets aspect ratio for real building floor from meta-data embedded in SVG maps
function getRealAspectRatio() {
  return parseFloat(d3.select('svg').attr('data-height'), 10)/parseFloat(d3.select('svg').attr('data-width'), 10)
}

function mapX (x) {
  const origin = d3.select('.origin').filter('path').node().getBBox();
  const originTop = d3.select('.originTop').filter('path').node().getBBox();
  const in_min = 0;
  const in_max = parseFloat(d3.select('svg').attr('data-width'), 10);
  const out_min = origin.x;
  const out_max = originTop.x + originTop.width;
  return (x - in_min) * (out_max - out_min) / (in_max - in_min) + out_min;
}

function inverseMapX(svgX) {
  const origin = d3.select('.origin').filter('path').node().getBBox();
  const originTop = d3.select('.originTop').filter('path').node().getBBox();
  const in_min = origin.x;
  const in_max = originTop.x + originTop.width;
  const out_min = 0;
  const out_max = parseFloat(d3.select('svg').attr('data-width'), 10);
  return (svgX - in_min) * (out_max - out_min) / (in_max - in_min) + out_min;
}


function mapY (y) {
  const origin = d3.select('.origin').filter('path').node().getBBox();
  const originTop = d3.select('.originTop').filter('path').node().getBBox();
  const in_min = 0;
  const in_max = parseFloat(d3.select('svg').attr('data-height'), 10);
  const out_min = origin.y + origin.height;
  const out_max = originTop.y;
  return (y - in_min) * (out_max - out_min) / (in_max - in_min) + out_min;
}

function inverseMapY(svgY) {
  const origin = d3.select('.origin').filter('path').node().getBBox();
  const originTop = d3.select('.originTop').filter('path').node().getBBox();
  const in_min = origin.y + origin.height;
  const in_max = originTop.y;
  const out_min = 0;
  const out_max = parseFloat(d3.select('svg').attr('data-height'), 10);
  return (svgY - in_min) * (out_max - out_min) / (in_max - in_min) + out_min;
}

function setBeacon(beacon, mobile) {
  if (mobile) {
    renderBeacon(mapX(beacon.x), mapY(beacon.y), beacon);
  } else {
    const newX = mapX(parseFloat(d3.select('svg').attr('data-width'), 10)) - mapX(beacon.x);
    renderBeacon(mapY(beacon.y), newX, beacon);
  }
}
