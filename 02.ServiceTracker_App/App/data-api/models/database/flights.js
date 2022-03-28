const Sequelize = require('sequelize');
class Flights extends Sequelize.Model {}


module.exports.init = (sequelize) => {
  Flights.init({
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
    modelName: 'Flights',
    freezeTableName: true
    // options
  });
}

module.exports.Model = Flights;