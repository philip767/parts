// 数据库服务
const inventoryDbService = require('./database/inventoryDb.service');
const ljModel = require('./database/lj.model');

// 通知服务
const mailService = require('./notification/mail.service');

// 安全服务
const linuxUserService = require('./security/linuxUser.service');

// 业务服务
const stockSchedulerService = require('./stockScheduler.service');
const txtParserService = require('./txtParser.service');

module.exports = {
  // 数据库服务
  inventoryDbService,
  ljModel,
  
  // 通知服务
  mailService,
  
  // 安全服务
  linuxUserService,
  
  // 业务服务
  stockSchedulerService,
  txtParserService
}; 