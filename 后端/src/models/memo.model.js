// 文件路径: src/models/memo.model.js
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Memo = sequelize.define('Memo', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    task: {
      type: DataTypes.STRING,
      allowNull: false
    },
    dueDateTime: {
      type: DataTypes.DATE,
      allowNull: false
    },
    partNumber: {
      type: DataTypes.STRING,
      allowNull: true
    },
    isCompleted: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false
    },
    orderName: {
      type: DataTypes.STRING,
      allowNull: true
    },
    taskType: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: 'reminder'
    },
    // --- 新增的字段定义 ---
    isReminderSent: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false // 默认为未发送提醒
    }
  }, {
    tableName: 'Memos'
  });
  return Memo;
};