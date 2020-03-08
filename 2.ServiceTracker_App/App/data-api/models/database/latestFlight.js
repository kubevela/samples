const Sequelize = require('sequelize');
class LatestFlight extends Sequelize.Model {}

module.exports.init = (sequelize) => {
  LatestFlight.init({
    // attributes
    Timestamp: {
      type: Sequelize.STRING,
      allowNull: false,
      primaryKey: true
    },
  }, {
    sequelize,
    modelName: 'LatestFlight',
    freezeTableName: true
    // options
  });
}

module.exports.Model = LatestFlight;