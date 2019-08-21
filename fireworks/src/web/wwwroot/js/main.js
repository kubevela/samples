var samples = 20;
var speed = 250;
let timeout = samples * speed;
var values1 = [];
var values2 = [];
var values3 = [];
var labels = [];
var charts = [];
var value = 0;
var scale = 1;
var yAxes = [{
  ticks: {
    max: 500,
    min: 0,
    stepSize: 100,
    fontSize: 15,
    fontColor: '#fff'
  },
  scaleLabel: {
    display: false,
    labelString: "Instance Count",
    fontColor: '#fff'
  }
}]

var fworks = new Fireworks();

addEmptyValues(values1, samples);
addEmptyValues(values2, samples);
addEmptyValues(values3, samples);

var countData = [0, 0, 0];
var dataHues = [0, 151, 191];
var fwXStartPositions = ['left', 'middle', 'right']

var originalCalculateXLabelRotation = Chart.Scale.prototype.calculateXLabelRotation
var websocket;

function initWebSocket() {
  websocket = new WebSocket("ws://" + window.location.host + "/data");

  websocket.onopen = function () { };

  websocket.onmessage = function (args) {
    onNewDataReceived(args.data);
  };

  websocket.onclose = function (args) {
    setTimeout(initWebSocket, 100);
  };

  websocket.onerror = function (error) {
    websocket.close();
  }
}

function initialize() {
  charts.push(new Chart(document.getElementById("chart0"), {
    type: 'line',
    data: {
      //labels: labels,
      datasets: [{
        data: values1,
        backgroundColor: 'rgba(255, 99, 132, 0.1)',
        borderColor: 'rgb(255, 50, 50)',
        borderWidth: 2,
        lineTension: 0.25,
        pointRadius: 0
      }]
    },
    options: {
      responsive: true,
      animation: {
        duration: speed * 1.5,
        easing: 'linear'
      },
      legend: false,
      scales: {
        xAxes: [{
          type: "time",
          display: false,
          ticks: {
            fontColor: "#CCC"
          }
        }],
        yAxes: yAxes
      },
      title: {
        display: false,
        text: 'Service 1',
        fontSize: 17,
        fontColor: '#fff'
      }
    }
  }), new Chart(document.getElementById("chart1"), {
    type: 'line',
    data: {
      //labels: labels,
      datasets: [{
        data: values2,
        backgroundColor: 'rgba(255, 99, 132, 0.1)',
        borderColor: 'rgb(103, 213, 159)',
        borderWidth: 2,
        lineTension: 0.25,
        pointRadius: 0
      }]
    },
    options: {
      responsive: true,
      animation: {
        duration: speed * 1.5,
        easing: 'linear'
      },
      legend: false,
      scales: {
        xAxes: [{
          type: "time",
          display: false,
          ticks: {
            fontColor: "#CCC"
          }
        }],
        yAxes: yAxes
      },
      title: {
        display: false,
        text: 'Service 2',
        fontSize: 17,
        fontColor: '#fff'
      }
    }
  }), new Chart(document.getElementById("chart2"), {
    type: 'line',
    data: {
      //labels: labels,
      datasets: [{
        data: values3,
        backgroundColor: 'rgba(255, 99, 132, 0.1)',
        borderColor: 'rgb(103, 223, 249)',
        borderWidth: 2,
        lineTension: 0.25,
        pointRadius: 0
      }]
    },
    options: {
      responsive: true,
      animation: {
        duration: speed * 1.5,
        easing: 'linear'
      },
      legend: false,
      scales: {
        xAxes: [{
          type: "time",
          display: false,
          ticks: {
            fontColor: "#CCC"
          }
        }],
        yAxes: yAxes
      },
      title: {
        display: false,
        text: 'Service 3',
        fontSize: 17,
        fontColor: '#fff'
      }
    }
  }));

  initWebSocket();
}

function addEmptyValues(arr, n) {
  for (var i = 0; i < n; i++) {
    arr.push({
      x: moment().subtract((n - i) * speed, 'milliseconds').toDate(),
      y: null
    });
  }
}

function updateCharts() {
  charts.forEach(function (chart) {
    chart.update();
  });
}

function progress() {
  if (countData[0] <= 500) {
    values1.push({
      x: new Date(),
      y: countData[0]
    });
    values1.shift();
  }

  if (countData[1] <= 500) {
    values2.push({
      x: new Date(),
      y: countData[1]
    });
    values2.shift();
  }

  if (countData[2] <= 500) {
    values3.push({
      x: new Date(),
      y: countData[2]
    });
    values3.shift();
  }
}

function advance() {
  progress();
  updateCharts();

  setTimeout(function () {
    requestAnimationFrame(advance);
  }, speed);
}

function drawFireworks() {
  for (i in countData) {
    var count = countData[i];
    fworks.start(count, dataHues[i], fwXStartPositions[i]);
  }
}

function shootFireworks() {
  setInterval(drawFireworks, 3000);
}

function updateChartsTitle() {
  for (var i in countData) {
    var text = "Service " + (parseInt(i) + 1) + ":   " + countData[i];
    $("#title" + i.toString()).text(text);
  }
}

function onNewDataReceived(json) {
  data = JSON.parse(json);
  for (var i in data) {
    var id = data[i].type;
    if (id == "red") {
      countData[0] = data[i].counts;
    }
    else if (id == "green") {
      countData[1] = data[i].counts;
    }
    else if (id == "blue") {
      countData[2] = data[i].counts;
    }

    updateChartsTitle();
  }
}

$(document).ready(function () {
  initialize();
  advance();
  shootFireworks();
})
