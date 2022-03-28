const Sequelize = require('sequelize');
class Quakes extends Sequelize.Model {}


module.exports.init = (sequelize) => {
  Quakes.init({
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
    modelName: 'Quakes',
    freezeTableName: true
    // options
  });
}

module.exports.Model = Quakes;