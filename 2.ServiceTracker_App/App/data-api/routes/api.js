const applicationInsights = require('applicationinsights');
const async = require('async');
const dayjs = require('dayjs');
const express = require('express');
const jsonResponse = require('../models/express/jsonResponse');
const path = require('path');
const relativeTime = require('dayjs/plugin/relativeTime');
const router = express.Router();
const st = require('../models/util/status');
const site = require('../models/util/site');

dayjs.extend(relativeTime);

/* Models and Telemetry event info */
const flights = require('../models/database/flights');
const latestFlight = require('../models/database/latestFlight');
const quakes = require('../models/database/quakes');
const latestQuake = require('../models/database/latestQuake');
const weather = require('../models/database/weather');
const latestWeather = require('../models/database/latestWeather');

const Flights = flights.Model;
const LatestFlight = latestFlight.Model;
const Quakes = quakes.Model;
const LatestQuake = latestQuake.Model;
const Weather = weather.Model;
const LatestWeather = latestWeather.Model;

/**
 *
 * Incorporate telemetry with App Insights
 *
 **/
var telemetry = applicationInsights.defaultClient;

const routename = path
  .basename(__filename)
  .replace('.js', ' default endpoint for ' + site.name);

/* GET JSON :: Route Base Endpoint */
router.get('/', (req, res, next) => {
  jsonResponse.json(res, routename, st.OK.code, {});
});

router.get('/status', (req, res, next) => {
  jsonResponse.json(res, routename, st.OK.code, {
    uptime: dayjs(global.start).from(
      dayjs(Math.floor(process.uptime()) * 1000 + global.start),
      true
    )
  });
});

router.get('/get/flights/:timestamp', (req, res, next) => {
  getDataObjFromDb(Flights, req.params.timestamp, (err, result) => {
    jsonResponse.json(res, 'success', st.OK.code, result);
  });
});

router.get('/get/quakes/:timestamp', (req, res, next) => {
  getDataObjFromDb(Quakes, req.params.timestamp, (err, result) => {
    jsonResponse.json(res, 'success', st.OK.code, result);
  });
});

router.get('/get/weather/:timestamp', (req, res, next) => {
  getDataObjFromDb(Weather, req.params.timestamp, (err, data) => {
    if (err) {
      jsonResponse.json(res, st.ERR.msg, st.ERR.code, err);
    } else {
      if (data.length > 0) {
        jsonResponse.json(res, st.OK.msg, st.OK.code, data);
      } else {
        jsonResponse.json(res, st.EMPTY.msg, st.EMPTY.code, data);
      }
    }
  });
});

router.get('/get/latest/:datatype', (req, res, next) => {
  getLatestObjFromDb(determineObj(req.params.datatype), (err, data) => {
    if (err) {
      jsonResponse.json(res, st.ERR.msg, st.ERR.code, err);
    } else {
      if (data.length > 0) {
        jsonResponse.json(res, st.OK.msg, st.OK.code, data);
      } else {
        res.status(204).end();
      }
    }
  });
});

router.post('/save/flights/:timestamp', (req, res, next) => {
  var latest = { Timestamp: req.params.timestamp };
  var flights = {
    Timestamp: req.params.timestamp,
    FeatureCollection: req.body
  };

  async.waterfall(
    [
      cb => {
        saveDataObjToDb(Flights, flights, (e, r) => {
          if (r) {
            cb(null, {
              FlightCount: flights.FeatureCollection.length,
              Timestamp: flights.Timestamp
            });
          }
        });
      },
      (flightDetail, cb) => {
        saveDataObjToDb(LatestFlight, latest, (e, r) => {
          cb(e, flightDetail);
        });
      }
    ],
    (err, result) => {
      jsonResponse.json(res, 'success', st.OK.code, result);
    }
  );
});

router.post('/save/quakes/:timestamp', (req, res, next) => {
  var latest = { Timestamp: req.params.timestamp };
  var quakes = {
    Timestamp: req.params.timestamp,
    FeatureCollection: req.body
  };

  async.waterfall(
    [
      cb => {
        saveDataObjToDb(Quakes, quakes, (e, r) => {
          if (r) {
            cb(null, {
              QuakeCount: quakes.FeatureCollection.length,
              Timestamp: quakes.Timestamp
            });
          }
        });
      },
      (quakeDetail, cb) => {
        saveDataObjToDb(LatestQuake, latest, (e, r) => {
          cb(e, quakeDetail);
        });
      }
    ],
    (err, result) => {
      jsonResponse.json(res, 'success', st.OK.code, result);
    }
  );
});

router.post('/save/weather/:timestamp', (req, res, next) => {
  var latest = { Timestamp: req.params.timestamp };
  var weather = {
    Timestamp: req.params.timestamp,
    FeatureCollection: req.body
  };

  async.waterfall(
    [
      cb => {
        saveDataObjToDb(Weather, weather, (e, r) => {
          if (r) {
            cb(null, {
              WeatherLayerCount: weather.FeatureCollection.length,
              Timestamp: weather.Timestamp
            });
          }
        });
      },
      (weatherDetail, cb) => {
        saveDataObjToDb(LatestWeather, latest, (e, r) => {
          cb(e, weatherDetail);
        });
      }
    ],
    (err, result) => {
      jsonResponse.json(res, 'success', st.OK.code, result);
    }
  );
});

function saveDataObjToDb(model, data, cb) {
  model
    .upsert(data)
    .then(() => {
      cb(null, true);
    })
    .catch(err => {
      if (err)
        handleError(site.name + ' func - saveDataObjToDb :: error saving data');
      cb(err, false);
    });
}

function getDataObjFromDb(model, timestamp, cb) {
  model.findByPk(timestamp).then(r => cb(null, r)).catch(err => cb(err, null));
}

function determineObj(objName) {
  switch (objName) {
    case 'flights':
      return LatestFlight;
    case 'quakes':
      return LatestQuake;
    case 'weather':
      return LatestWeather;
    default:
      break;
  }
}

function getLatestObjFromDb(model, cb) {
  model.findAll({
    order: [['Timestamp', 'DESC']],
    limit: 1
  }).then(r => cb(null, r)).catch(err => cb(err, null));
}

function handleError(message) {
  console.log(message);
}

module.exports = router;
