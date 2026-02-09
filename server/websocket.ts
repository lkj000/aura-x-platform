import { WebSocketServer, WebSocket } from 'ws';
import { IncomingMessage } from 'http';
import { parse } from 'cookie';
import { sdk } from './_core/sdk';
import { COOKIE_NAME } from '@shared/const';

interface AuthenticatedWebSocket extends WebSocket {
  userId?: number;
  isAlive?: boolean;
}

export function setupWebSocket(server: any) {
  const wss = new WebSocketServer({ 
    server,
    path: '/api/ws'
  });

  // Heartbeat interval to detect disconnected clients
  const heartbeatInterval = setInterval(() => {
    wss.clients.forEach((ws: AuthenticatedWebSocket) => {
      if (ws.isAlive === false) {
        console.log('[WebSocket] Terminating inactive connection');
        return ws.terminate();
      }
      
      ws.isAlive = false;
      ws.ping();
    });
  }, 30000); // 30 seconds

  wss.on('close', () => {
    clearInterval(heartbeatInterval);
  });

  wss.on('connection', async (ws: AuthenticatedWebSocket, req: IncomingMessage) => {
    console.log('[WebSocket] New connection attempt');
    
    // Authenticate WebSocket connection
    try {
      const cookies = parse(req.headers.cookie || '');
      const token = cookies[COOKIE_NAME];
      
      if (!token) {
        console.log('[WebSocket] No auth token, closing connection');
        ws.close(4001, 'Unauthorized');
        return;
      }

      // For now, just verify cookie exists
      // Full authentication will be done on each message
      ws.userId = 0; // Placeholder, will be set on first message
      ws.isAlive = true;
      
      console.log(`[WebSocket] Authenticated connection for user ${ws.userId}`);

      // Send initial connection success message
      ws.send(JSON.stringify({
        type: 'connected',
        userId: ws.userId,
        timestamp: new Date().toISOString()
      }));

    } catch (error) {
      console.error('[WebSocket] Authentication error:', error);
      ws.close(4001, 'Unauthorized');
      return;
    }

    // Handle pong responses
    ws.on('pong', () => {
      ws.isAlive = true;
    });

    // Handle incoming messages
    ws.on('message', (data: Buffer) => {
      try {
        const message = JSON.parse(data.toString());
        console.log(`[WebSocket] Received message from user ${ws.userId}:`, message);

        // Handle different message types
        switch (message.type) {
          case 'ping':
            ws.send(JSON.stringify({ type: 'pong', timestamp: new Date().toISOString() }));
            break;
          
          case 'subscribe':
            // Subscribe to specific generation updates
            console.log(`[WebSocket] User ${ws.userId} subscribed to generation ${message.generationId}`);
            ws.send(JSON.stringify({ 
              type: 'subscribed', 
              generationId: message.generationId 
            }));
            break;

          default:
            console.log(`[WebSocket] Unknown message type: ${message.type}`);
        }
      } catch (error) {
        console.error('[WebSocket] Error processing message:', error);
      }
    });

    ws.on('close', () => {
      console.log(`[WebSocket] Connection closed for user ${ws.userId}`);
    });

    ws.on('error', (error) => {
      console.error(`[WebSocket] Error for user ${ws.userId}:`, error);
    });
  });

  console.log('[WebSocket] Server initialized on /api/ws');

  return wss;
}

// Broadcast generation update to all connected clients for a specific user
export function broadcastGenerationUpdate(
  wss: WebSocketServer,
  userId: number,
  generationId: number,
  status: string,
  data?: any
) {
  const message = JSON.stringify({
    type: 'generation_update',
    generationId,
    status,
    data,
    timestamp: new Date().toISOString()
  });

  wss.clients.forEach((client: AuthenticatedWebSocket) => {
    if (client.userId === userId && client.readyState === WebSocket.OPEN) {
      console.log(`[WebSocket] Broadcasting generation update to user ${userId}`);
      client.send(message);
    }
  });
}
