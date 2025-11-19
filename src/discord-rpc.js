const { DiscordRPCClient } = require('@ryuziii/discord-rpc');
require('dotenv').config();

let rpcClient;
let reconnectTimer;

function initDiscordRPC() {
  const clientId = process.env.DISCORD_CLIENT_ID;

  if (!clientId) {
    console.warn('Discord RPC: Invalid or missing Client ID. Check your .env file.');
    return;
  }

  console.log(`Discord RPC: Initializing with Client ID ending in ...${clientId.slice(-4)}`);

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

  rpcClient.on('disconnected', () => {
    console.log('Discord RPC: Disconnected. Attempting to reconnect in 10s...');
    if (!reconnectTimer) {
        reconnectTimer = setTimeout(() => {
            initDiscordRPC();
        }, 10000);
    }
  });

  try {
    rpcClient.connect().catch(err => {
        console.error('Discord RPC: Connection failed', err.message);
    });
  } catch (err) {
    console.error('Discord RPC: Error initializing', err);
  }
}

function setActivity() {
  if (!rpcClient) return;

  try {
      const activity = {
        details: 'Browsing',
        state: 'In App',
        startTimestamp: new Date(),
        largeImageKey: 'bigpicture',
        instance: false,
      };
      rpcClient.setActivity(activity);
      console.log('Discord RPC: Activity set successfully');
  } catch (error) {
      console.error("Discord RPC: Failed to set activity", error);
  }
}

module.exports = { initDiscordRPC };