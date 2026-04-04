const { Server } = require('socket.io');

class WebSocketServer {
  constructor(httpServer) {
    this.io = new Server(httpServer, {
      cors: {
        origin: process.env.DASHBOARD_URL || 'http://localhost:3000',
        methods: ['GET', 'POST']
      }
    });

    this.setupHandlers();
  }

  setupHandlers() {
    this.io.on('connection', (socket) => {
      console.log(`[WebSocket] Client connected: ${socket.id}`);

      socket.on('disconnect', () => {
        console.log(`[WebSocket] Client disconnected: ${socket.id}`);
      });
    });
  }

  // Emit API call event to all connected clients
  emitApiCall(callData) {
    this.io.emit('api_call', callData);
  }

  // Emit budget update event
  emitBudgetUpdate(budgetData) {
    this.io.emit('budget_update', budgetData);
  }

  // Emit vault update event
  emitVaultUpdate(action, data) {
    this.io.emit('vault_update', { action, ...data });
  }
}

module.exports = WebSocketServer;
