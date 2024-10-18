"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const ws_1 = require("ws");
const wss = new ws_1.WebSocketServer({ port: 8080 });
const rooms = {};
wss.on("connection", function connection(ws) {
    /* a connection established using the websocket server
       will have the websocket parameter which will be passed*/
    console.log("USER connected");
    ws.on("error", console.error);
    ws.on("message", function message(data) {
        var _a, _b, _c, _d;
        const message = JSON.parse(data);
        if (message.type === "joinRoom") {
            const { roomId, role } = message;
            if (!rooms[roomId]) {
                rooms[roomId] = { senderSocket: null, receiverSocket: null };
            }
            if (role === "sender") {
                rooms[roomId].senderSocket = ws;
                console.log(`Sender joined room: ${roomId}`);
            }
            else if (role === "receiver") {
                rooms[roomId].receiverSocket = ws;
                console.log(`Receiver joined room: ${roomId}`);
            }
            ws.send(JSON.stringify({ type: "roomJoined", roomId }));
        }
        else if (message.type === "createOffer") {
            const { roomId, sdp } = message;
            const room = rooms[roomId];
            if (room === null || room === void 0 ? void 0 : room.receiverSocket) {
                (_a = room === null || room === void 0 ? void 0 : room.receiverSocket) === null || _a === void 0 ? void 0 : _a.send(JSON.stringify({ type: "createOffer", sdp: sdp }));
                console.log(`Offer sent to receiver in room: ${roomId}`);
            }
        }
        else if (message.type === "createAnswer") {
            const { roomId, sdp } = message;
            const room = rooms[roomId];
            if (room === null || room === void 0 ? void 0 : room.senderSocket) {
                (_b = room === null || room === void 0 ? void 0 : room.senderSocket) === null || _b === void 0 ? void 0 : _b.send(JSON.stringify({ type: "createAnswer", sdp: sdp }));
            }
            console.log(`Answer sent to sender in room: ${roomId}`);
        }
        else if (message.type === "iceCandidate") {
            const { roomId, candidate } = message;
            const room = rooms[roomId];
            if (ws === (room === null || room === void 0 ? void 0 : room.senderSocket) && (room === null || room === void 0 ? void 0 : room.receiverSocket)) {
                (_c = room === null || room === void 0 ? void 0 : room.receiverSocket) === null || _c === void 0 ? void 0 : _c.send(JSON.stringify({ type: "iceCandidate", candidate: candidate }));
            }
            else if (ws === (room === null || room === void 0 ? void 0 : room.receiverSocket) && (room === null || room === void 0 ? void 0 : room.senderSocket)) {
                (_d = room === null || room === void 0 ? void 0 : room.senderSocket) === null || _d === void 0 ? void 0 : _d.send(JSON.stringify({ type: "iceCandidate", candidate: candidate }));
            }
        }
        else if (message.type === "chatMessage") {
            // Chat message handling
            const { roomId, text } = message;
            const room = rooms[roomId];
            if (ws === (room === null || room === void 0 ? void 0 : room.senderSocket) && (room === null || room === void 0 ? void 0 : room.receiverSocket)) {
                room.receiverSocket.send(JSON.stringify({ type: "chatMessage", text }));
            }
            else if (ws === (room === null || room === void 0 ? void 0 : room.receiverSocket) && (room === null || room === void 0 ? void 0 : room.senderSocket)) {
                room.senderSocket.send(JSON.stringify({ type: "chatMessage", text }));
            }
        }
    });
    ws.on("close", () => console.log("connection closed"));
});
