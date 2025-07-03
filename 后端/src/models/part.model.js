// 文件路径: src/models/part.model.js

const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Part = sequelize.define('Part', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    partNumber: {
      type: DataTypes.STRING,
      allowNull: false
    },
    partName: {
      type: DataTypes.STRING,
      allowNull: false
    },
    quantity: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0
    },
    notesText: {
      type: DataTypes.TEXT
    },
    supplier: {
      type: DataTypes.STRING
    },
    purchaser: {
      type: DataTypes.STRING
    },
    estimatedShippingDate: {
      type: DataTypes.DATEONLY
    },
    isArrived: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false
    },
    isOrderComplete: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false
    },
    deletedDate: {
      type: DataTypes.DATE
    },
    initialStock: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    latestStock: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    lastStockCheck: {
      type: DataTypes.DATE,
      allowNull: true
    },
    stockCheckInterval: {
      type: DataTypes.INTEGER,
      defaultValue: 900
    },
    isMonitored: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    },
    
    // --- 新增的字段定义 ---
    sortOrder: {
      type: DataTypes.INTEGER,
      allowNull: true // 允许为空，以兼容在此功能上线前创建的旧数据
    }
  }, {
    tableName: 'Parts',
    indexes: [
      // 零件号索引 - 用于库存查询和零件搜索
      {
        name: 'idx_part_number',
        fields: ['partNumber']
      },
      // 订单ID索引 - 用于查询订单下的零件
      {
        name: 'idx_order_id',
        fields: ['orderId']
      },
      // 软删除索引 - 用于过滤已删除的零件
      {
        name: 'idx_deleted_date',
        fields: ['deletedDate']
      },
      // 监控状态索引 - 用于库存监控查询
      {
        name: 'idx_monitoring',
        fields: ['isMonitored', 'lastStockCheck']
      },
      // 复合索引 - 用于订单详情查询
      {
        name: 'idx_order_parts',
        fields: ['orderId', 'deletedDate', 'sortOrder']
      },
      // 到货状态索引 - 用于筛选到货零件
      {
        name: 'idx_arrival_status',
        fields: ['isArrived', 'isOrderComplete']
      }
    ]
  });
  return Part;
};