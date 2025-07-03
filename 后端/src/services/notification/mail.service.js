// 文件路径: src/services/mail.service.js

const nodemailer = require('nodemailer');

// 1. 创建一个可重用的 "邮件发送器" (transporter) 对象
// Nodemailer 会读取 process.env 中的环境变量来配置它
const transporter = nodemailer.createTransport({
    host: process.env.MAIL_HOST,
    port: process.env.MAIL_PORT,
    // 对于大多数 SMTP 服务，如果端口是 465，secure 应为 true，否则为 false
    // 对于自建服务器的 25 端口，通常 secure 为 false
    secure: true, 
    auth: {
        user: process.env.MAIL_USER, // 你的邮箱用户名, e.g., notifier@chengzichat.cn
        pass: process.env.MAIL_PASS, // 你的邮箱密码或授权码
    },
      tls: {
      rejectUnauthorized: false
    },
    // 为连接添加超时设置，防止服务卡住
    connectionTimeout: 10000, // 10秒
    greetingTimeout: 10000,
    socketTimeout: 10000,
});

/**
 * 发送库存增加提醒邮件的函数
 * @param {object} user - 包含 { username, email } 的用户对象
 * @param {object} part - 包含 { Order.name, partNumber, partName, latestStock, notesText } 的零件对象
 * @param {number} newStock - 最新的库存数量
 */
exports.sendStockAlertEmail = async (user, part, newStock) => {
    // 验证传入的数据是否有效
    if (!user || !user.email) {
        console.warn(`[Mail Service] User object is invalid or has no email. Cannot send stock alert for part ${part.partNumber}.`);
        return;
    }
    if (!part || !part.Order) {
        console.warn(`[Mail Service] Part object is invalid or missing Order details. Cannot send stock alert for part ${part.partNumber}.`);
        return;
    }

    const mailOptions = {
        from: process.env.MAIL_FROM,
        to: user.email,
        subject: `【库存增加提醒】零件 ${part.partName || part.partNumber} 已到货！`,
        html: `
            <div style="font-family: Arial, 'Helvetica Neue', Helvetica, sans-serif; line-height: 1.6; color: #333;">
                <h3>您好，${user.username}！</h3>
                <p>您在订单 “<strong>${part.Order.name}</strong>” 中关注的零件库存已增加：</p>
                <ul style="list-style-type: none; padding-left: 0; border: 1px solid #eee; padding: 15px; border-radius: 5px;">
                    <li style="margin-bottom: 10px;"><strong>零件号:</strong> ${part.partNumber}</li>
                    <li style="margin-bottom: 10px;"><strong>零件名称:</strong> ${part.partName}</li>
                    <li style="margin-bottom: 10px;"><strong>原记录库存:</strong> ${part.latestStock !== null ? part.latestStock : 'N/A'}</li>
                    <li style="margin-bottom: 10px;"><strong>最新库存数:</strong> <strong style="color: #28a745; font-size: 1.1em;">${newStock}</strong></li>
                    <li style="margin-bottom: 10px;">
                        <strong>零件备注:</strong> 
                        <pre style="background-color: #f5f5f5; padding: 10px; border-radius: 4px; white-space: pre-wrap; word-wrap: break-word;">${part.notesText || '无'}</pre>
                    </li>
                </ul>
                <p>请及时处理。</p>
                <br>
                <p style="color: #888; font-size: 12px;">-- 零件缺货订货管理系统 (此为系统自动发送，请勿回复)</p>
            </div>
        `,
    };

    try {
        let info = await transporter.sendMail(mailOptions);
        console.log(`[Mail Service] Stock alert email sent to ${user.email}. Message ID: ${info.messageId}`);
    } catch (error) {
        console.error(`[Mail Service] Failed to send stock alert email to ${user.email}.`, error);
    }
};


// ==================== 新增的函数 ====================
/**
 * 发送到期备忘录提醒邮件的函数
 * @param {object} user - 包含 { username, email } 的用户对象
 * @param {object} memo - 备忘录对象
 */
exports.sendMemoReminderEmail = async (user, memo) => {
    if (!user || !user.email) {
        console.warn(`[Mail Service] User for memo ${memo.id} is invalid or has no email.`);
        return;
    }

    // 将日期格式化为更友好的中文格式
    const formattedDueDate = new Date(memo.dueDateTime).toLocaleString('zh-CN', {
        year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false
    });

    const mailOptions = {
        from: process.env.MAIL_FROM,
        to: user.email,
        subject: `【备忘录到期提醒】: ${memo.task}`,
        html: `
            <div style="font-family: Arial, 'Helvetica Neue', Helvetica, sans-serif; line-height: 1.6; color: #333;">
                <h3>您好，${user.username}！</h3>
                <p>您设置的一条备忘录已经到期：</p>
                <div style="background-color: #f5f5f5; border-left: 4px solid #0ea5e9; padding: 15px; margin: 15px 0; border-radius: 4px;">
                    <p style="font-weight: bold; font-size: 1.1em; margin-top: 0; margin-bottom: 10px;">${memo.task}</p>
                    <p style="color: #555; font-size: 0.9em; margin: 0;"><strong>截止时间:</strong> ${formattedDueDate}</p>
                    ${memo.partNumber ? `<p style="color: #555; font-size: 0.9em; margin: 5px 0 0 0;"><strong>关联零件:</strong> ${memo.partNumber}</p>` : ''}
                    ${memo.orderName ? `<p style="color: #555; font-size: 0.9em; margin: 5px 0 0 0;"><strong>关联订单:</strong> ${memo.orderName}</p>` : ''}
                </div>
                <p>请记得到应用中将其标记为“已完成”。</p>
                <br>
                <p style="color: #888; font-size: 12px;">-- 零件缺货订货管理系统 (此为系统自动发送，请勿回复)</p>
            </div>
        `,
    };

    try {
        let info = await transporter.sendMail(mailOptions);
        console.log(`[Mail Service] Memo reminder email sent to ${user.email}. Message ID: ${info.messageId}`);
    } catch (error) {
        console.error(`[Mail Service] Failed to send memo reminder email to ${user.email}:`, error);
    }
};