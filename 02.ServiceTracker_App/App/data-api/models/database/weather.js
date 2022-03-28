const Sequelize = require('sequelize');
class Weather extends Sequelize.Model {}


module.exports.init = (sequelize) => {
  Weather.init({
    // attributes
    Timestamp: {
      type: Sequelize.STRING,
      allowNull: false,
      primaryKey: true
    },
    FeatureCollection: {
      type: Sequelize.JSON
      // allowNull defaults to true
    }
  }, {
    sequelize,
    modelName: 'Weather',
    freezeTableName: true
    // options
  });
}

module.exports.Model = Weather;