import { WebSocket, WebSocketServer } from 'ws';
import { Server } from 'http';

interface ClientRoom {
  ws: WebSocket;
  assignmentId: string;
}

class SocketManager {
  private wss: WebSocketServer | null = null;
  private clients: Map<string, WebSocket[]> = new Map(); // assignmentId -> ws[]

  public init(server: Server): void {
    this.wss = new WebSocketServer({ noServer: true });

    server.on('upgrade', (request, socket, head) => {
      this.wss?.handleUpgrade(request, socket, head, (ws) => {
        this.wss?.emit('connection', ws, request);
      });
    });

    this.wss.on('connection', (ws: WebSocket) => {
      console.log('New WebSocket connection established.');

      ws.on('message', (message: string) => {
        try {
          const data = JSON.parse(message);
          
          if (data.type === 'JOIN') {
            const assignmentId = data.assignmentId;
            if (!assignmentId) return;

            console.log(`WebSocket client subscribed to assignment: ${assignmentId}`);
            
            // Add client to assignment room
            const currentClients = this.clients.get(assignmentId) || [];
            currentClients.push(ws);
            this.clients.set(assignmentId, currentClients);

            // Send instant confirmation
            ws.send(JSON.stringify({
              type: 'SUBSCRIBED',
              assignmentId,
              message: 'Successfully subscribed to real-time generation updates.'
            }));
          }
        } catch (err) {
          console.error('Error handling WebSocket message:', err);
        }
      });

      ws.on('close', () => {
        console.log('WebSocket connection closed. Cleaning up client rooms...');
        this.removeClient(ws);
      });

      ws.on('error', (err) => {
        console.error('WebSocket connection error:', err);
        this.removeClient(ws);
      });
    });
  }

  /**
   * Cleans up client connections when they close.
   */
  private removeClient(ws: WebSocket): void {
    for (const [assignmentId, clientList] of this.clients.entries()) {
      const filtered = clientList.filter(client => client !== ws);
      if (filtered.length === 0) {
        this.clients.delete(assignmentId);
      } else {
        this.clients.set(assignmentId, filtered);
      }
    }
  }

  /**
   * Broadcasts a payload to all clients listening to a specific assignment.
   */
  public broadcast(assignmentId: string, payload: any): void {
    const clients = this.clients.get(assignmentId);
    if (!clients || clients.length === 0) {
      console.log(`No active WebSocket subscribers for assignment: ${assignmentId}`);
      return;
    }

    console.log(`Broadcasting WebSocket event "${payload.type || 'UPDATE'}" to ${clients.length} clients for assignment: ${assignmentId}`);
    const messageStr = JSON.stringify(payload);

    clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(messageStr);
      }
    });
  }
}

export const socketManager = new SocketManager();
