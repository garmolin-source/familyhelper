require('dotenv').config();
const { connectToWhatsApp } = require('./src/whatsapp');
const { startServer } = require('./src/server');
const { startScheduler } = require('./src/scheduler');

startServer();
startScheduler();
connectToWhatsApp();
