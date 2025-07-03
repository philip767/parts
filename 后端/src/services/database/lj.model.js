// 文件路径: src/services/lj.model.js
const { DataTypes } = require('sequelize');
const inventoryDb = require('./inventoryDb.service.js'); // 引入我们的 MSSQL 连接实例

// 使用 inventoryDb (MSSQL连接) 来定义 lj 模型
// 重要：这是一个只读模型，用于查询远程库存数据库，不允许任何修改操作
const Lj = inventoryDb.define('lj', {
    // 我们只定义需要用到的列，特别是主键和库存数
    // Sequelize 会在查询时根据这些定义来映射
    
    partNumber: {
        type: DataTypes.STRING,
        field: '零件号',       // 将模型的 partNumber 属性映射到数据库的"零件号"列
        primaryKey: true,      // 告诉 Sequelize 这是主键，对于 findByPk 至关重要
        allowNull: false       // 零件号不能为空
    },
    
    stockQuantity: {
        type: DataTypes.INTEGER,
        field: '库存数',       // 将 stockQuantity 映射到"库存数"列
        allowNull: true        // 库存数可以为空（可能没有库存）
    },
    
    // 添加其他常用字段的定义，避免使用 SELECT *
    partNameCn: {
        type: DataTypes.STRING,
        field: '零件中文名',
        allowNull: true
    },
    
    vehicleModel: {
        type: DataTypes.STRING,
        field: '车型号',
        allowNull: true
    },
    
    origin: {
        type: DataTypes.STRING,
        field: '产地',
        allowNull: true
    },
    
    unit: {
        type: DataTypes.STRING,
        field: '单位',
        allowNull: true
    },
    
    notes: {
        type: DataTypes.TEXT,
        field: '备注',
        allowNull: true
    }
    
}, {
    // Sequelize 的额外配置，非常重要！
    tableName: 'lj',          // 明确告诉 Sequelize 表的真实名称是 'lj'
    timestamps: false,        // 告诉 Sequelize 这个表没有 createdAt 和 updatedAt 字段
    freezeTableName: true,    // 防止 Sequelize 将表名自动变为复数 'ljs'
    
    // 安全配置：禁用所有修改操作
    hooks: {
        beforeCreate: () => {
            throw new Error('不允许在库存数据库中创建记录');
        },
        beforeUpdate: () => {
            throw new Error('不允许修改库存数据库中的记录');
        },
        beforeDestroy: () => {
            throw new Error('不允许删除库存数据库中的记录');
        },
        beforeBulkCreate: () => {
            throw new Error('不允许在库存数据库中批量创建记录');
        },
        beforeBulkUpdate: () => {
            throw new Error('不允许在库存数据库中批量更新记录');
        },
        beforeBulkDestroy: () => {
            throw new Error('不允许在库存数据库中批量删除记录');
        }
    }
});

// 重写模型方法，确保只允许查询操作
const originalFindAll = Lj.findAll;
Lj.findAll = function(options) {
    // 确保只进行SELECT操作
    if (options && options.attributes) {
        // 如果指定了attributes，确保不包含任何修改操作
        console.log('[Lj Model] 执行查询操作:', JSON.stringify(options));
    }
    return originalFindAll.call(this, options);
};

const originalFindByPk = Lj.findByPk;
Lj.findByPk = function(primaryKey, options) {
    console.log('[Lj Model] 执行主键查询:', primaryKey);
    return originalFindByPk.call(this, primaryKey, options);
};

const originalFindOne = Lj.findOne;
Lj.findOne = function(options) {
    console.log('[Lj Model] 执行单条查询');
    return originalFindOne.call(this, options);
};

// 导出这个模型，以便在其他地方使用
module.exports = Lj;
