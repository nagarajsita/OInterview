import { WebSocket, WebSocketServer } from "ws";

const wss = new WebSocketServer({ port: 8080 });

interface Room {
  senderSocket: WebSocket | null;
  receiverSocket: WebSocket | null;
}

const rooms: Record<string, Room> = {};

wss.on("connection", function connection(ws) {
  console.log("USER connected");
  ws.on("error", console.error);

  ws.on("message", function message(data: any) {
    const message = JSON.parse(data);

    if (message.type === "joinRoom") {
      const { roomId, role } = message;

      // Check if the room already exists
      let room = rooms[roomId];
      if (!room) {
        // Create a new room
        room = {
          senderSocket: null,
          receiverSocket: null,
        };
        rooms[roomId] = room;
      }

      if (role === "sender") {
        if (room.senderSocket) {
          // Sender already in the room
          ws.send(
            JSON.stringify({
              type: "error",
              message: "Room is occupied with Candidate",
            })
          );
        } else {
          room.senderSocket = ws;
          console.log(`Sender joined room: ${roomId}`);
        }
      } else if (role === "receiver") {       
          room.receiverSocket = ws;
          console.log(`Receiver joined room: ${roomId}`);
      }
    } else if (message.type === "createOffer") {
      const { roomId, sdp } = message;
      const room = rooms[roomId];
      if (room?.receiverSocket) {
        room?.receiverSocket?.send(
          JSON.stringify({ type: "createOffer", sdp: sdp })
        );
        console.log(`Offer sent to receiver in room: ${roomId}`);
      }
    } else if (message.type === "createAnswer") {
      const { roomId, sdp } = message;
      const room = rooms[roomId];
      if (room?.senderSocket) {
        room?.senderSocket?.send(
          JSON.stringify({ type: "createAnswer", sdp: sdp })
        );
      }
      console.log(`Answer sent to sender in room: ${roomId}`);
    } else if (message.type === "iceCandidate") {
      const { roomId, candidate } = message;
      const room = rooms[roomId];
      if (ws === room?.senderSocket && room?.receiverSocket) {
        room?.receiverSocket?.send(
          JSON.stringify({ type: "iceCandidate", candidate: candidate })
        );
      } else if (ws === room?.receiverSocket && room?.senderSocket) {
        room?.senderSocket?.send(
          JSON.stringify({ type: "iceCandidate", candidate: candidate })
        );
      }
    } else if (message.type === "chatMessage") {
      // Chat message handling
      const { roomId, text } = message;
      const room = rooms[roomId];
      if (ws === room?.senderSocket && room?.receiverSocket) {
        room.receiverSocket.send(
          JSON.stringify({ type: "chatMessage", text })
        );
      } else if (ws === room?.receiverSocket && room?.senderSocket) {
        room.senderSocket.send(
          JSON.stringify({ type: "chatMessage", text })
        );
      }
    } else if (message.type === "editorContent") {
      const { roomId, content } = message;
      const room = rooms[roomId];
      if (ws === room?.senderSocket && room?.receiverSocket) {
        room.receiverSocket.send(
          JSON.stringify({ type: "editorContent", content })
        );
      }
    }
  });

  ws.on("close", () => console.log("connection closed"));
});