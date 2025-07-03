// 文件路径: src/models/quoteInquiryItem.model.js
'use strict';
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const QuoteInquiryItem = sequelize.define('QuoteInquiryItem', {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    quoteInquiryId: { type: DataTypes.UUID, allowNull: false },
    partNumber: { type: DataTypes.STRING, allowNull: false },
    quotesJson: { type: DataTypes.JSON, allowNull: true }, // 存储历史报价
    selectedQuoteId: { type: DataTypes.UUID, allowNull: true } // 存储用户选择
  }, {
    tableName: 'QuoteInquiryItems'
  });
  return QuoteInquiryItem;
};