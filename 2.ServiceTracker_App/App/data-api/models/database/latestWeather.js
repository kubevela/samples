const Sequelize = require('sequelize');
class LatestWeather extends Sequelize.Model {}

module.exports.init = (sequelize) => {
  LatestWeather.init({
    // attributes
    Timestamp: {
      type: Sequelize.STRING,
      allowNull: false,
      primaryKey: true
    },
  }, {
    sequelize,
    modelName: 'LatestWeather',
    freezeTableName: true
    // options
  });
}

module.exports.Model = LatestWeather;