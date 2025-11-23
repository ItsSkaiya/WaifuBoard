const { app } = require('electron');
const path = require('path');
const fs = require('fs');
const { DiscordRPCClient } = require('@ryuziii/discord-rpc');

const envPath = app.isPackaged 
    ? path.join(process.resourcesPath, '.env')
    : path.join(__dirname, '../.env');

if (fs.existsSync(envPath)) {
    require('dotenv').config({ path: envPath });
} else {
    console.warn(`Discord RPC: Could not find .env file at ${envPath}`);
}

let rpcClient;
let reconnectTimer;

function initDiscordRPC() {
  const clientId = process.env.DISCORD_CLIENT_ID;

  if (!clientId) {
    console.warn('Discord RPC: No Client ID found. Make sure .env is copied to resources.');
    return;
  }

  console.log(`Discord RPC: Initializing with Client ID ...${clientId.slice(-4)}`);

  if (rpcClient) {
    try { rpcClient.destroy(); } catch (e) {}
    rpcClient = null;
  }

  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }

  try {
    rpcClient = new DiscordRPCClient({ 
      clientId: clientId, 
      transport: 'ipc' 
    });
  } catch (err) {
    console.error('Discord RPC: Failed to instantiate Client.', err);
    return;
  }

  rpcClient.on('ready', () => {
    const user = rpcClient.user ? rpcClient.user.username : 'User';
    console.log(`Discord RPC: Authed for user ${user}`);
    
    setTimeout(() => {
        setActivity();
    }, 1000);
  });

  rpcClient.on('error', (err) => {
      console.log('[Discord RPC] Background warning:', err.message);
  });

  rpcClient.on('disconnected', () => {
    if (!app.isPackaged) {
        console.log('Discord RPC: Disconnected. Attempting to reconnect in 10s...');
    }
    if (!reconnectTimer) {
        reconnectTimer = setTimeout(() => {
            initDiscordRPC();
        }, 10000);
    }
  });

  try {
    rpcClient.connect().catch(err => {
        console.error('Discord RPC: Connection failed', err.message);
      return;
    });
  } catch (err) {
    console.error('Discord RPC: Error initializing', err);
  }
}

function setActivity() {
  if (!rpcClient) return;

  const versionString = `v${app.getVersion()}`;

  try {
      rpcClient.setActivity({
        details: 'Browsing',
        state: 'In App',
        startTimestamp: new Date(),
        largeImageKey: 'bigpicture', 
        largeImageText: versionString,
        instance: false,
      });
  } catch (error) {
      console.error("Discord RPC: Failed to set activity", error);
  }
}

module.exports = { initDiscordRPC };