const Sequelize = require('sequelize');
class LatestQuake extends Sequelize.Model {}

module.exports.init = (sequelize) => {
  LatestQuake.init({
    // attributes
    Timestamp: {
      type: Sequelize.STRING,
      allowNull: false,
      primaryKey: true
    },
  }, {
    sequelize,
    modelName: 'LatestQuake',
    freezeTableName: true
    // options
  });
}

module.exports.Model = LatestQuake;