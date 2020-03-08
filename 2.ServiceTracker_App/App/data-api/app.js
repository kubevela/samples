const bodyParser = require('body-parser');
const createError = require('http-errors');
const dayjs = require('dayjs');
const express = require('express');
const logger = require('morgan');
const path = require('path');
const relativeTime = require('dayjs/plugin/relativeTime');

dayjs.extend(relativeTime);
global.start = dayjs().valueOf();

if (process.env.NODE_ENV != 'container') {
  require('dotenv').config({ path: path.join(__dirname, '.env.local') });
}

const flights = require('./models/database/flights');
const latestFlight = require('./models/database/latestFlight');
const quakes = require('./models/database/quakes');
const latestQuake = require('./models/database/latestQuake');
const weather = require('./models/database/weather');
const latestWeather = require('./models/database/latestWeather');

var dbOptions = {}
if (process.env.DATABASE_OPTIONS) {
  dbOptions = JSON.parse(process.env.DATABASE_OPTIONS); // JSON Example: '{ "options": { "encrypt": true } }'
}

const Sequelize = require('sequelize');
const sequelize = new Sequelize(process.env.DATABASE_NAME, process.env.DATABASE_USER, process.env.DATABASE_PASSWORD, {
  host: process.env.DATABASE_HOSTNAME,
  port: process.env.DATABASE_PORT,
  dialect: process.env.DATABASE_DRIVER,
  dialectOptions: dbOptions,
  pool: {
    max: 5,
    min: 0,
    acquire: 30000,
    idle: 10000
  }
});

sequelize
  .authenticate()
  .then(() => {
    console.log('Connection has been established successfully.');
  })
  .catch(err => {
    console.error('Unable to connect to the database:', err);
    process.exit(1);
  });

flights.init(sequelize);
latestFlight.init(sequelize);
quakes.init(sequelize);
latestQuake.init(sequelize);
weather.init(sequelize);
latestWeather.init(sequelize);

// Automatically create tables or update if needed.
sequelize.sync();

const app = express();

const apiRouter = require('./routes/api');

app.set('etag', 'strong');
app.use(logger('dev'));
app.use(bodyParser.json({ limit: '2mb' }));
app.use('/', apiRouter);

app.use(function(req, res, next) {
  next(createError(404));
});

app.use(function(req, res, next) {

  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader(
    'Access-Control-Allow-Methods',
    'GET, POST, OPTIONS, PUT, PATCH, DELETE'
  );
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-Requested-With,content-type'
  );

  res.append('Last-Modified', new Date().toUTCString());

  next();
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.send(err);
});

module.exports = app;