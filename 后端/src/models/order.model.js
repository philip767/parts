const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Order = sequelize.define('Order', {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    name: { type: DataTypes.STRING, allowNull: false },
    uploadDate: { type: DataTypes.DATE, allowNull: false },
    fileName: { type: DataTypes.STRING, allowNull: false },
    deletedDate: { type: DataTypes.DATE },
  });
  return Order;
};
