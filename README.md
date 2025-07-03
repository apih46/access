# 🔗 Shopee Chat Bridge Bot

Bot Telegram yang berfungsi sebagai **bridge** antara Shopee customer chat dengan admin Telegram menggunakan **web scraping** dan **browser automation**.

## 🔄 Flow Kerja

```
Customer Shopee → Bot (Auto-Monitor) → Admin Telegram → Reply → Bot → Customer Shopee
```

### Proses:
1. **Admin** login Shopee melalui bot (`/login`)
2. **Bot** auto-monitor Shopee chat menggunakan browser automation
3. **Customer** hantar message di Shopee store
4. **Bot** detect new message dan forward ke admin Telegram  
5. **Admin** reply message dalam Telegram
6. **Bot** hantar reply ke customer Shopee

## 🚀 Fungsi Utama

### 🔐 Auto-Login System
- Login Shopee account melalui bot
- Browser automation dengan Puppeteer
- Session management dan monitoring
- Auto re-login jika session expired

### 👀 Real-time Chat Monitoring  
- Auto-detect new customer messages
- Real-time scraping Shopee chat interface
- Background monitoring setiap 5 saat
- Smart message detection dan filtering

### 📨 Message Forwarding
- Forward semua customer messages dari Shopee ke admin
- Real-time notifications untuk admin
- Customer info dan context disertakan
- Message formatting dan timestamps

### 💬 Reply Management  
- Admin reply terus dalam Telegram
- Bot automatically send reply ke Shopee customer
- Confirmation untuk setiap reply yang dihantar
- Error handling dan retry mechanism

### ⚡ Quick Features
- **Quick Reply Buttons** - Reply cepat dengan 1 click
- **Message Templates** - Template jawapan standard
- **Customer Info** - Maklumat customer dan chat history
- **Chat Statistics** - Monitor performance dan activity

## 📋 Setup

### 1. Prerequisites

Pastikan anda ada:
- **Node.js 16+** installed
- **Telegram Bot Token** (dari @BotFather)
- **Shopee Seller Account** dengan chat access
- **Admin User ID** Telegram anda

### 2. Installation

```bash
# Clone atau download bot files
# Pastikan semua files ada: index.js, package.json, .env

# Install dependencies
npm install

# Edit environment file
cp .env.example .env
nano .env
```

### 3. Environment Configuration

Edit file `.env`:
```env
# Telegram Bot Configuration  
TELEGRAM_BOT_TOKEN=your_bot_token_here
ADMIN_USER_ID=74055761

# Shopee Store Configuration
SHOPEE_STORE_NAME=Kedai Anda  
SHOPEE_STORE_URL=https://shopee.com.my/your-store
SHOPEE_SELLER_CENTER=https://seller.shopee.com.my/

# Browser Configuration (optional)
HEADLESS_MODE=false
BROWSER_TIMEOUT=30000
MONITORING_INTERVAL=5000
DASHBOARD_PORT=3000
```

### 4. Dapatkan Telegram Bot Token

1. Chat dengan [@BotFather](https://t.me/BotFather)
2. Hantar `/newbot`
3. Ikut instructions untuk create bot
4. Copy **Bot Token** dan masukkan dalam `.env`

### 5. Dapatkan Admin User ID

1. Chat dengan [@userinfobot](https://t.me/userinfobot)
2. Bot akan reply dengan your User ID
3. Masukkan User ID dalam `.env`

### 6. Jalankan Bot

```bash
npm start
```

Bot akan start dan show message:
```
🚀 Shopee Chat Bridge Bot started successfully!
📊 Dashboard running on http://localhost:3000
```

## 🎛️ Admin Commands

### 🔧 Setup Commands
- `/start` - Initialize bot dan show intro
- `/login` - Login ke Shopee account
- `/monitor` - Start monitoring Shopee chat
- `/stop` - Stop monitoring

### 📊 Management Commands  
- `/status` - Show bot status dan Shopee connection
- `/dashboard` - Open admin control panel
- `/test` - Send test customer message
- `/help` - Show help dan instructions

## 💡 Cara Guna

### 1. Setup Awal
```
/start → /login → /monitor
```

### 2. Login Shopee
```
/login
Bot: "Please provide credentials: username:password"
You: "your_email@gmail.com:your_password"
Bot: "✅ Login Successful!"
```

### 3. Start Monitoring
```
/monitor
Bot: "✅ Monitoring Started! Now watching your Shopee chat"
```

### 4. Terima Customer Message
Bot akan forward customer message dengan format:
```
🔔 New Shopee Message

👤 Customer: Ahmad (ID: CUST123)
🏪 Store: Kedai Anda
💬 Message: "Hello, bila pesanan saya sampai?"
⏰ Time: 2:30 PM

💡 Reply to this message to respond to customer
```

### 5. Reply Customer
- **Reply** terus pada message yang di-forward
- Bot akan automatically hantar reply ke customer
- Dapat confirmation message

### 6. Quick Actions
Guna button untuk:
- ⚡ Quick replies
- 📋 Message templates  
- 👤 Customer info
- 📊 Chat history

## 🎯 Dashboard Features

Buka dashboard di: `http://localhost:3000`

### 📊 Status Monitoring
- Shopee login status
- Chat monitoring status  
- Browser automation status
- Bot uptime dan performance

### 📥 Chat Management
- **Active Chats** - Current customer conversations
- **Chat History** - Previous conversations
- **Real-time Statistics** - Messages count, response time

## 🔧 Technical Features

### 🌐 Browser Automation
- **Puppeteer** untuk browser control
- Headless Chrome automation
- Smart element detection
- Anti-detection measures

### 🕷️ Web Scraping
- Real-time chat monitoring
- Message content extraction
- Customer information parsing
- Timestamp dan metadata capture

### 🔄 Session Management
- Auto-login dengan credentials
- Session persistence
- Auto re-login on expiry
- Error recovery mechanisms

### 🛡️ Security Features
- **Admin-only access** - Hanya admin boleh guna
- **Credential security** - Credentials tidak disimpan permanently
- **Access logging** - Log semua activities
- **Error handling** - Robust error management

## 🧪 Testing

### Test Commands
```bash
/test          # Simulate customer message
/status        # Check all system status
/dashboard     # Open control panel
```

### Test Flow
1. `/test` - Bot simulate customer message
2. Reply pada test message
3. Check confirmation dari bot
4. Verify system working properly

## ⚠️ Important Notes

### 🔐 Security
- Bot guna credentials untuk login sahaja
- Credentials tidak disimpan dalam database
- Session auto-expire untuk security
- Admin-only access dengan user ID verification

### 🌐 Browser Requirements
- Bot require browser automation (Puppeteer)
- Memory usage untuk browser process
- Network connection untuk Shopee access
- May need to handle CAPTCHA manually

### 📱 Shopee Compatibility
- Compatible dengan Shopee Malaysia
- Support seller center chat interface
- May need updates jika Shopee change interface
- Works dengan standard Shopee seller accounts

## 🚀 Production Deployment

### Server Requirements
- Node.js 16+ 
- Minimum 1GB RAM (untuk browser)
- Stable internet connection
- Linux/Windows server support

### Deployment Steps
```bash
# On your server
git clone <your-repo>
cd shopee-chat-bridge
npm install
nano .env  # Configure environment
npm start
```

### Process Management
```bash
# Using PM2 for production
npm install -g pm2
pm2 start index.js --name "shopee-bot"
pm2 startup
pm2 save
```

### Monitoring
- Keep bot running 24/7 untuk monitoring
- Monitor memory usage (browser process)
- Check logs untuk errors
- Setup auto-restart jika crash

## 🛠️ Troubleshooting

### Common Issues

**Bot tidak respond to commands:**
- Check bot token dalam `.env`
- Check admin user ID betul ke tidak
- Check bot running dengan `npm start`

**Login failed:**
- Check Shopee credentials betul
- Disable 2FA pada Shopee account
- Check internet connection

**Monitoring tidak detect messages:**
- Check browser automation running
- Check Shopee chat page accessible
- Try restart monitoring dengan `/stop` then `/monitor`

**Browser automation issues:**
- Check memory available (minimum 1GB)
- Try restart bot completely
- Check network connection stable

### Logs
Check console output untuk error messages:
```bash
npm start
# Or check logs file jika configured
tail -f bot.log
```

## 📞 Support

Jika ada issues atau questions:
1. Check troubleshooting section
2. Check console logs untuk errors
3. Test dengan `/test` command dulu
4. Restart bot jika perlu

---

**Status**: ✅ Ready for production use

**Version**: 1.0.0

**Last Updated**: 2024

## 📝 License

MIT License - Free to use untuk personal dan commercial projects.