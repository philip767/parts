// 文件路径: src/models/index.js
'use strict';
const { Sequelize } = require('sequelize');
const dbConfig = require('../config/db.config.js');

const sequelize = new Sequelize(dbConfig.DB, dbConfig.USER, dbConfig.PASSWORD, {
  host: dbConfig.HOST, port: dbConfig.PORT, dialect: dbConfig.dialect,
  pool: dbConfig.pool, logging: false,
});

const db = {};
db.Sequelize = Sequelize;
db.sequelize = sequelize;

// 引入所有模型
db.User = require('./user.model.js')(sequelize, Sequelize);
db.Order = require('./order.model.js')(sequelize, Sequelize);
db.Part = require('./part.model.js')(sequelize, Sequelize);
db.NoteImage = require('./noteImage.model.js')(sequelize, Sequelize);
db.Memo = require('./memo.model.js')(sequelize, Sequelize);
db.Quote = require('./quote.model.js')(sequelize, Sequelize);
db.QuoteInquiry = require('./quoteInquiry.model.js')(sequelize, Sequelize);
db.QuoteInquiryItem = require('./quoteInquiryItem.model.js')(sequelize, Sequelize);

// --- 定义所有模型关联关系 ---
db.User.hasMany(db.Order, { foreignKey: 'userId', onDelete: 'CASCADE' });
db.Order.belongsTo(db.User, { foreignKey: 'userId' });

db.Order.hasMany(db.Part, { as: 'parts', foreignKey: 'orderId', onDelete: 'CASCADE' });
db.Part.belongsTo(db.Order, { foreignKey: 'orderId' });

db.Part.hasMany(db.NoteImage, { as: 'images', foreignKey: 'partId', onDelete: 'CASCADE' });
db.NoteImage.belongsTo(db.Part, { foreignKey: 'partId' });

db.User.hasMany(db.Memo, { foreignKey: 'userId', onDelete: 'CASCADE' });
db.Memo.belongsTo(db.User, { foreignKey: 'userId' });

db.User.hasMany(db.Quote, { foreignKey: 'userId', onDelete: 'CASCADE' });
db.Quote.belongsTo(db.User, { foreignKey: 'userId' });

// 报价单与用户的关联
db.User.hasMany(db.QuoteInquiry, { foreignKey: 'userId', onDelete: 'CASCADE' });
db.QuoteInquiry.belongsTo(db.User, { foreignKey: 'userId' });

// 报价单与报价单明细的关联
db.QuoteInquiry.hasMany(db.QuoteInquiryItem, { as: 'items', foreignKey: 'quoteInquiryId', onDelete: 'CASCADE' });
db.QuoteInquiryItem.belongsTo(db.QuoteInquiry, { foreignKey: 'quoteInquiryId' });

module.exports = db;