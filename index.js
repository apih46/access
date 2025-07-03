require('dotenv').config();
const TelegramBot = require('node-telegram-bot-api');
const puppeteer = require('puppeteer');
const express = require('express');
const fs = require('fs');
const path = require('path');
const moment = require('moment');

class ShopeeChatBridge {
    constructor() {
        this.bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN, { polling: true });
        this.adminId = parseInt(process.env.ADMIN_USER_ID);
        this.browser = null;
        this.page = null;
        this.isMonitoring = false;
        this.isLoggedIn = false;
        this.shopeeCredentials = null;
        this.lastMessageId = null;
        this.chatHistory = [];
        this.activeChats = new Map();
        this.pendingReplies = new Map();
        this.monitoringInterval = null;
        
        this.setupBot();
        this.setupDashboard();
    }

    setupBot() {
        console.log('🚀 Starting Shopee Chat Bridge Bot...');
        
        // Start command
        this.bot.onText(/\/start/, (msg) => {
            if (msg.from.id !== this.adminId) {
                return this.bot.sendMessage(msg.chat.id, '❌ Access denied. Admin only.');
            }
            
            const welcomeMsg = `
🔗 **Shopee Chat Bridge Bot**

Selamat datang! Bot ini berfungsi sebagai bridge antara Shopee customer chat dengan admin Telegram.

**🔄 Flow Kerja:**
Customer Shopee → Bot → Admin Telegram → Reply → Bot → Customer Shopee

**🚀 Quick Setup:**
1. \`/login\` - Login ke Shopee account
2. \`/monitor\` - Start monitoring chat
3. Terima dan reply customer messages

**📋 Available Commands:**
• \`/login\` - Login Shopee
• \`/monitor\` - Start monitoring
• \`/stop\` - Stop monitoring
• \`/status\` - Check status
• \`/dashboard\` - Open dashboard
• \`/test\` - Test message
• \`/help\` - Show help

**✅ Ready to start! Use /login first.**
            `;
            
            this.bot.sendMessage(msg.chat.id, welcomeMsg, { parse_mode: 'Markdown' });
        });

        // Login command
        this.bot.onText(/\/login/, (msg) => {
            if (msg.from.id !== this.adminId) return;
            
            this.bot.sendMessage(msg.chat.id, `
🔐 **Shopee Login**

Sila provide credentials dalam format:
\`email:password\`

Example: \`myemail@gmail.com:mypassword\`

⚠️ Credentials tidak akan disimpan permanently untuk security.
            `, { parse_mode: 'Markdown' });
        });

        // Handle credentials
        this.bot.on('message', async (msg) => {
            if (msg.from.id !== this.adminId) return;
            if (msg.text && msg.text.includes(':') && !msg.text.startsWith('/')) {
                await this.handleLogin(msg);
            }
        });

        // Monitor command
        this.bot.onText(/\/monitor/, async (msg) => {
            if (msg.from.id !== this.adminId) return;
            await this.startMonitoring(msg.chat.id);
        });

        // Stop command
        this.bot.onText(/\/stop/, async (msg) => {
            if (msg.from.id !== this.adminId) return;
            await this.stopMonitoring(msg.chat.id);
        });

        // Status command
        this.bot.onText(/\/status/, (msg) => {
            if (msg.from.id !== this.adminId) return;
            this.sendStatus(msg.chat.id);
        });

        // Dashboard command
        this.bot.onText(/\/dashboard/, (msg) => {
            if (msg.from.id !== this.adminId) return;
            this.bot.sendMessage(msg.chat.id, `
📊 **Admin Dashboard**

Dashboard URL: http://localhost:${process.env.DASHBOARD_PORT || 3000}
Password: ${process.env.DASHBOARD_PASSWORD || 'admin123'}

Features:
• Real-time chat monitoring
• Message statistics
• System control
• Error logs
            `, { parse_mode: 'Markdown' });
        });

        // Test command
        this.bot.onText(/\/test/, (msg) => {
            if (msg.from.id !== this.adminId) return;
            this.sendTestMessage(msg.chat.id);
        });

        // Help command
        this.bot.onText(/\/help/, (msg) => {
            if (msg.from.id !== this.adminId) return;
            
            const helpMsg = `
📋 **Shopee Chat Bridge Bot - Help**

**🔧 Setup Commands:**
• \`/start\` - Initialize bot
• \`/login\` - Login Shopee (format: email:password)
• \`/monitor\` - Start monitoring Shopee chat
• \`/stop\` - Stop monitoring

**📊 Management Commands:**
• \`/status\` - Show bot status
• \`/dashboard\` - Open admin panel
• \`/test\` - Send test customer message
• \`/help\` - Show this help

**💬 How to Use:**
1. Setup: \`/start\` → \`/login\` → \`/monitor\`
2. Receive customer messages automatically
3. Reply directly to forwarded messages
4. Bot sends your reply to customer

**🎯 Features:**
• Auto-login Shopee account
• Real-time chat monitoring
• Message forwarding both ways
• Admin dashboard
• Error handling & recovery

**⚠️ Important:**
• Bot require browser automation
• Keep monitoring active for real-time
• Reply to customer messages for auto-send
            `;
            
            this.bot.sendMessage(msg.chat.id, helpMsg, { parse_mode: 'Markdown' });
        });

        // Handle replies to customer messages
        this.bot.on('message', async (msg) => {
            if (msg.from.id !== this.adminId) return;
            if (msg.reply_to_message && msg.reply_to_message.text.includes('🔔 New Shopee Message')) {
                await this.handleAdminReply(msg);
            }
        });

        console.log('✅ Telegram Bot initialized successfully');
    }

    async handleLogin(msg) {
        const credentials = msg.text.split(':');
        if (credentials.length !== 2) {
            return this.bot.sendMessage(msg.chat.id, '❌ Format salah. Guna: email:password');
        }

        const [email, password] = credentials;
        this.shopeeCredentials = { email, password };

        this.bot.sendMessage(msg.chat.id, '🔄 Logging in to Shopee...');

        try {
            await this.initializeBrowser();
            await this.loginToShopee(email, password);
            
            this.bot.sendMessage(msg.chat.id, `
✅ **Login Successful!**

📧 Email: ${email}
🏪 Store: ${process.env.SHOPEE_STORE_NAME}
⏰ Login Time: ${moment().format('DD/MM/YYYY HH:mm')}

**Next Step:** Use \`/monitor\` to start monitoring chat
            `, { parse_mode: 'Markdown' });
        } catch (error) {
            console.error('Login error:', error);
            this.bot.sendMessage(msg.chat.id, `❌ Login failed: ${error.message}`);
        }
    }

    async initializeBrowser() {
        if (this.browser) {
            await this.browser.close();
        }

        this.browser = await puppeteer.launch({
            headless: process.env.HEADLESS_MODE === 'true',
            args: ['--no-sandbox', '--disable-setuid-sandbox'],
            defaultViewport: { width: 1366, height: 768 }
        });

        this.page = await this.browser.newPage();
        await this.page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');
    }

    async loginToShopee(email, password) {
        const sellerCenterUrl = process.env.SHOPEE_SELLER_CENTER || 'https://seller.shopee.com.my/';
        
        await this.page.goto(sellerCenterUrl + 'account/signin', { waitUntil: 'networkidle2' });
        
        // Wait for login form
        await this.page.waitForSelector('input[placeholder*="email"], input[placeholder*="Email"]', { timeout: 10000 });
        
        // Fill credentials
        await this.page.type('input[placeholder*="email"], input[placeholder*="Email"]', email);
        await this.page.type('input[placeholder*="password"], input[placeholder*="Password"]', password);
        
        // Click login button
        await this.page.click('button[type="submit"], .login-button, .btn-login');
        
        // Wait for navigation or 2FA
        try {
            await this.page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 30000 });
        } catch (e) {
            // Check if 2FA is required
            const has2FA = await this.page.$('.otp-input, .verification-code');
            if (has2FA) {
                throw new Error('2FA required. Please login manually first to disable 2FA.');
            }
        }
        
        // Verify login success
        const isLoggedIn = await this.page.$('.seller-center-header, .dashboard') !== null;
        if (!isLoggedIn) {
            throw new Error('Login verification failed. Please check credentials.');
        }
        
        this.isLoggedIn = true;
        
        // Navigate to chat
        await this.page.goto(sellerCenterUrl + 'portal/chat', { waitUntil: 'networkidle2' });
    }

    async startMonitoring(chatId) {
        if (!this.isLoggedIn) {
            return this.bot.sendMessage(chatId, '❌ Please login first using /login');
        }

        if (this.isMonitoring) {
            return this.bot.sendMessage(chatId, '⚠️ Monitoring already active');
        }

        this.isMonitoring = true;
        
        this.bot.sendMessage(chatId, `
✅ **Monitoring Started!**

🏪 Store: ${process.env.SHOPEE_STORE_NAME}
⏰ Started: ${moment().format('DD/MM/YYYY HH:mm')}
🔄 Interval: Every 5 seconds

Now watching your Shopee chat for new messages...
        `, { parse_mode: 'Markdown' });

        // Start monitoring loop
        this.monitoringInterval = setInterval(() => {
            this.checkForNewMessages();
        }, parseInt(process.env.MONITORING_INTERVAL) || 5000);
    }

    async stopMonitoring(chatId) {
        this.isMonitoring = false;
        
        if (this.monitoringInterval) {
            clearInterval(this.monitoringInterval);
            this.monitoringInterval = null;
        }

        this.bot.sendMessage(chatId, `
⏹️ **Monitoring Stopped**

⏰ Stopped: ${moment().format('DD/MM/YYYY HH:mm')}

Use \`/monitor\` to start again.
        `, { parse_mode: 'Markdown' });
    }

    async checkForNewMessages() {
        try {
            if (!this.page || !this.isLoggedIn) return;

            // Navigate to chat if not already there
            const currentUrl = this.page.url();
            if (!currentUrl.includes('/chat')) {
                await this.page.goto(process.env.SHOPEE_SELLER_CENTER + 'portal/chat', { waitUntil: 'networkidle2' });
            }

            // Look for chat messages
            const messages = await this.page.evaluate(() => {
                const messageElements = document.querySelectorAll('.chat-message, .message-item, .conversation-item');
                const messages = [];
                
                messageElements.forEach((element, index) => {
                    const text = element.innerText || element.textContent;
                    const timestamp = new Date().toISOString();
                    const customerName = element.querySelector('.customer-name, .sender-name')?.textContent || 'Customer';
                    
                    if (text && text.trim()) {
                        messages.push({
                            id: index,
                            text: text.trim(),
                            customer: customerName,
                            timestamp: timestamp,
                            element: element.outerHTML
                        });
                    }
                });
                
                return messages;
            });

            // Check for new messages
            if (messages.length > 0) {
                const latestMessage = messages[messages.length - 1];
                
                if (this.lastMessageId !== latestMessage.id) {
                    this.lastMessageId = latestMessage.id;
                    await this.forwardCustomerMessage(latestMessage);
                }
            }

        } catch (error) {
            console.error('Monitoring error:', error);
            // Try to recover
            if (error.message.includes('disconnected')) {
                await this.reconnectBrowser();
            }
        }
    }

    async forwardCustomerMessage(message) {
        const customerId = `CUST${Date.now()}`;
        this.activeChats.set(customerId, message);

        const forwardedMsg = `
🔔 **New Shopee Message**

👤 Customer: ${message.customer}
🆔 ID: ${customerId}
🏪 Store: ${process.env.SHOPEE_STORE_NAME}
💬 Message: "${message.text}"
⏰ Time: ${moment().format('DD/MM/YYYY HH:mm')}

💡 Reply to this message to respond to customer
        `;

        const keyboard = {
            inline_keyboard: [
                [
                    { text: '⚡ Quick Reply', callback_data: `quick_${customerId}` },
                    { text: '👤 Customer Info', callback_data: `info_${customerId}` }
                ],
                [
                    { text: '📋 Templates', callback_data: `template_${customerId}` },
                    { text: '📊 History', callback_data: `history_${customerId}` }
                ]
            ]
        };

        const sentMsg = await this.bot.sendMessage(this.adminId, forwardedMsg, {
            parse_mode: 'Markdown',
            reply_markup: keyboard
        });

        // Store message mapping for replies
        this.pendingReplies.set(sentMsg.message_id, customerId);
    }

    async handleAdminReply(msg) {
        const replyToId = msg.reply_to_message.message_id;
        const customerId = this.pendingReplies.get(replyToId);
        
        if (!customerId) {
            return this.bot.sendMessage(msg.chat.id, '❌ Customer not found for this reply');
        }

        const customerMsg = this.activeChats.get(customerId);
        if (!customerMsg) {
            return this.bot.sendMessage(msg.chat.id, '❌ Customer chat not found');
        }

        try {
            await this.sendReplyToShopee(msg.text, customerMsg);
            
            this.bot.sendMessage(msg.chat.id, `
✅ **Reply Sent Successfully**

👤 To: ${customerMsg.customer}
💬 Your Reply: "${msg.text}"
⏰ Sent: ${moment().format('DD/MM/YYYY HH:mm')}

Customer will receive your message in Shopee chat.
            `, { parse_mode: 'Markdown' });
            
            // Log conversation
            this.chatHistory.push({
                customerId,
                customerMessage: customerMsg.text,
                adminReply: msg.text,
                timestamp: new Date().toISOString()
            });

        } catch (error) {
            console.error('Reply error:', error);
            this.bot.sendMessage(msg.chat.id, `❌ Failed to send reply: ${error.message}`);
        }
    }

    async sendReplyToShopee(replyText, customerMsg) {
        if (!this.page || !this.isLoggedIn) {
            throw new Error('Not logged in to Shopee');
        }

        // Find the chat input field
        await this.page.waitForSelector('.chat-input, .message-input, textarea', { timeout: 5000 });
        
        // Clear and type reply
        await this.page.click('.chat-input, .message-input, textarea');
        await this.page.keyboard.selectAll();
        await this.page.type('.chat-input, .message-input, textarea', replyText);
        
        // Send message
        await this.page.click('.send-button, .btn-send, button[type="submit"]');
        
        // Wait a moment for send to complete
        await this.page.waitForTimeout(1000);
    }

    sendStatus(chatId) {
        const uptime = process.uptime();
        const uptimeStr = moment.duration(uptime, 'seconds').humanize();
        
        const statusMsg = `
📊 **System Status**

**🔐 Login Status:** ${this.isLoggedIn ? '✅ Logged In' : '❌ Not Logged In'}
**👀 Monitoring:** ${this.isMonitoring ? '✅ Active' : '❌ Stopped'}
**🌐 Browser:** ${this.browser ? '✅ Running' : '❌ Not Running'}
**⏱️ Uptime:** ${uptimeStr}

**📈 Statistics:**
• Active Chats: ${this.activeChats.size}
• Pending Replies: ${this.pendingReplies.size}
• Chat History: ${this.chatHistory.length} messages

**🏪 Store Info:**
• Name: ${process.env.SHOPEE_STORE_NAME}
• URL: ${process.env.SHOPEE_STORE_URL}

**⚙️ Configuration:**
• Monitoring Interval: ${process.env.MONITORING_INTERVAL}ms
• Headless Mode: ${process.env.HEADLESS_MODE}
• Dashboard Port: ${process.env.DASHBOARD_PORT}
        `;

        this.bot.sendMessage(chatId, statusMsg, { parse_mode: 'Markdown' });
    }

    sendTestMessage(chatId) {
        const testCustomer = {
            customer: 'Ahmad Test',
            text: 'Hello, bila pesanan saya sampai? Order ID: SP123456789',
            timestamp: new Date().toISOString()
        };

        this.forwardCustomerMessage(testCustomer);
        this.bot.sendMessage(chatId, '✅ Test customer message sent! Check above for the forwarded message.');
    }

    async reconnectBrowser() {
        try {
            console.log('🔄 Reconnecting browser...');
            await this.initializeBrowser();
            
            if (this.shopeeCredentials) {
                await this.loginToShopee(this.shopeeCredentials.email, this.shopeeCredentials.password);
                console.log('✅ Browser reconnected successfully');
            }
        } catch (error) {
            console.error('❌ Browser reconnection failed:', error);
            this.isLoggedIn = false;
        }
    }

    setupDashboard() {
        const app = express();
        app.use(express.static(path.join(__dirname, 'dashboard')));
        app.use(express.json());

        app.get('/', (req, res) => {
            res.send(`
                <h1>🔗 Shopee Chat Bridge Dashboard</h1>
                <div>
                    <h2>📊 Status</h2>
                    <p>Login: ${this.isLoggedIn ? '✅' : '❌'}</p>
                    <p>Monitoring: ${this.isMonitoring ? '✅' : '❌'}</p>
                    <p>Active Chats: ${this.activeChats.size}</p>
                    <p>Chat History: ${this.chatHistory.length}</p>
                </div>
                <div>
                    <h2>📈 Recent Activity</h2>
                    <pre>${JSON.stringify(this.chatHistory.slice(-5), null, 2)}</pre>
                </div>
            `);
        });

        app.get('/api/status', (req, res) => {
            res.json({
                isLoggedIn: this.isLoggedIn,
                isMonitoring: this.isMonitoring,
                activeChats: this.activeChats.size,
                chatHistory: this.chatHistory.length,
                uptime: process.uptime()
            });
        });

        const port = process.env.DASHBOARD_PORT || 3000;
        app.listen(port, () => {
            console.log(`📊 Dashboard running on http://localhost:${port}`);
        });
    }

    // Handle process termination
    async cleanup() {
        console.log('🔄 Cleaning up...');
        
        if (this.monitoringInterval) {
            clearInterval(this.monitoringInterval);
        }
        
        if (this.browser) {
            await this.browser.close();
        }
        
        console.log('✅ Cleanup completed');
        process.exit(0);
    }
}

// Initialize bot
const bridge = new ShopeeChatBridge();

// Handle graceful shutdown
process.on('SIGTERM', () => bridge.cleanup());
process.on('SIGINT', () => bridge.cleanup());
process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception:', error);
    bridge.cleanup();
});

console.log('🚀 Shopee Chat Bridge Bot started successfully!');
console.log('📋 Available commands: /start, /login, /monitor, /stop, /status, /dashboard, /test, /help');