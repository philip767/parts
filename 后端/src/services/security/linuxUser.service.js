// 文件路径: src/services/linuxUser.service.js (最终路径修正版)
const { spawn } = require('child_process');

const isValidUsername = (username) => {
    return /^[a-z_][a-z0-9_-]{0,31}$/.test(username);
};

const executeCommand = (command, args) => {
    return new Promise((resolve, reject) => {
        const process = spawn(command, args);
        let stderr = '';
        process.stderr.on('data', (data) => { stderr += data.toString(); });
        process.on('close', (code) => {
            if (code === 0) resolve();
            else reject(new Error(`Command "${command} ${args.join(' ')}" failed with code ${code}: ${stderr.trim()}`));
        });
        process.on('error', (err) => reject(err));
    });
};

exports.createEmailAccount = async (username, password) => {
    const lowerCaseUsername = username.toLowerCase();
    if (!isValidUsername(lowerCaseUsername)) {
        throw new Error('Invalid username format.');
    }
    
    try {
        console.log(`[Linux User] Attempting to create user: ${lowerCaseUsername}`);
        await executeCommand('sudo', ['/usr/sbin/useradd', '-m', '-s', '/sbin/nologin', lowerCaseUsername]);
        console.log(`[Linux User] Successfully created user: ${lowerCaseUsername}`);

        console.log(`[Linux User] Attempting to set password for: ${lowerCaseUsername}`);
        // --- 核心修改在这里，使用了正确的 passwd 路径 ---
        const passwdProcess = spawn('sudo', ['/usr/bin/passwd', '--stdin', lowerCaseUsername], { stdio: ['pipe', 'inherit', 'inherit'] });
        
        await new Promise((resolve, reject) => {
            passwdProcess.on('close', (code) => {
                if (code === 0) {
                    console.log(`[Linux User] Successfully set password for: ${lowerCaseUsername}`);
                    resolve();
                } else {
                    reject(new Error(`passwd command failed with exit code ${code}.`));
                }
            });
            passwdProcess.on('error', reject);
            passwdProcess.stdin.write(password + '\n');
            passwdProcess.stdin.end();
        });

        return { success: true };

    } catch (error) {
        console.error(`[Linux User] Failed to create email account for ${lowerCaseUsername}:`, error.message);
        await exports.deleteEmailAccount(lowerCaseUsername).catch(e => console.error(`[Linux User] Cleanup failed for user ${lowerCaseUsername}:`, e.message));
        throw error;
    }
};

exports.deleteEmailAccount = async (username) => {
    const lowerCaseUsername = username.toLowerCase();
    if (!isValidUsername(lowerCaseUsername)) return;
    try {
        await executeCommand('sudo', ['/usr/sbin/userdel', '-r', lowerCaseUsername]);
        console.log(`[Linux User] Successfully deleted user: ${lowerCaseUsername}`);
    } catch (error) {
        console.warn(`[Linux User] Could not delete user ${lowerCaseUsername} (it might not exist).`);
    }
};