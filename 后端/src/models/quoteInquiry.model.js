// 文件路径: src/models/quoteInquiry.model.js
'use strict';
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const QuoteInquiry = sequelize.define('QuoteInquiry', {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    userId: { type: DataTypes.UUID, allowNull: false },
    customerName: { type: DataTypes.STRING, allowNull: false },
    fileName: { type: DataTypes.STRING, allowNull: true },
    inquiryDate: { type: DataTypes.DATE, allowNull: false },
    totalParts: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    totalQuotesFound: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 }
  }, {
    tableName: 'QuoteInquiries'
  });
  return QuoteInquiry;
};