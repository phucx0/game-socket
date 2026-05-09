import {
  WebSocketGateway,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  WebSocketServer,
} from '@nestjs/websockets';

import { Server, Socket } from 'socket.io';
type PlayerState = {
  id: string;
  name: string;
  x: number;
  y: number;
  z: number;
  rotY: number;
  anim: string;
};

@WebSocketGateway({ cors: true })
export class GameGateway {
  @WebSocketServer() server!: Server;

  // Lưu state tất cả players
  private players = new Map<string, PlayerState>();

  @SubscribeMessage('player:join')
  handleJoin(client: Socket, data: { name: string }) {
    console.log(client.id);
    this.players.set(client.id, {
      id: client.id,
      name: data.name,
      x: 0, y: 0, z: 0,
      rotY: 0,
      anim: 'Idle',
    });
    // Gửi danh sách players hiện tại cho người mới
    const others = Array.from(this.players.values()).filter(
      (p) => p.id !== client.id,
    );
    client.emit('players:init', others);
    // Báo cho tất cả người khác có người mới vào
    client.broadcast.emit('player:joined', this.players.get(client.id));
  }

  @SubscribeMessage('player:move')
  handleMove(client: Socket, data: { x: number; y: number; z: number; rotY: number; anim: string }) {
    const player = this.players.get(client.id);
    if (!player) return;
    Object.assign(player, data);
    // Broadcast cho tất cả trừ người gửi
    client.broadcast.emit('player:moved', { id: client.id, ...data });
  }

  handleDisconnect(client: Socket) {
    this.players.delete(client.id);
    this.server.emit('player:left', client.id);
  }
}