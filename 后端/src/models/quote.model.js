// 文件路径: src/models/quote.model.js (最终完整版)
'use strict';
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Quote = sequelize.define('Quote', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: false
    },
    customerName: {
      type: DataTypes.STRING,
      allowNull: false
    },
    partNumber: {
      type: DataTypes.STRING,
      allowNull: false
    },
    priceRMB: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    quoteDate: {
      type: DataTypes.DATE,
      allowNull: false
    }
  }, {
    tableName: 'Quotes' // 明确告诉 Sequelize 表名
  });
  return Quote;
};
