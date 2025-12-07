const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
app.use(cors());

const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*", // Allow all origins for simplicity in this demo
        methods: ["GET", "POST"]
    }
});

// Map<socketId, { room: string, name: string }>
const users = new Map();

io.on('connection', (socket) => {
    console.log('User connected:', socket.id);

    socket.on('join-room', ({ room, name, publicKey }) => {
        socket.join(room);
        users.set(socket.id, { room, name, publicKey });
        console.log(`User ${name} (${socket.id}) joined room ${room} with key`);

        // Broadcast list of users in the room to everyone in the room
        const roomUsers = getRoomUsers(room);
        io.to(room).emit('room-users', roomUsers);
    });

    socket.on('offer', ({ target, offer }) => {
        io.to(target).emit('offer', { sender: socket.id, offer });
    });

    socket.on('answer', ({ target, answer }) => {
        io.to(target).emit('answer', { sender: socket.id, answer });
    });

    socket.on('ice-candidate', ({ target, candidate }) => {
        io.to(target).emit('ice-candidate', { sender: socket.id, candidate });
    });

    socket.on('disconnect', () => {
        const user = users.get(socket.id);
        if (user) {
            console.log(`User ${user.name} (${socket.id}) left room ${user.room}`);
            users.delete(socket.id);

            // Update others in the room
            const roomUsers = getRoomUsers(user.room);
            io.to(user.room).emit('room-users', roomUsers);
        }
    });
});

function getRoomUsers(room) {
    const roomUsers = [];
    users.forEach((user, id) => {
        if (user.room === room) {
            roomUsers.push({ id, name: user.name, publicKey: user.publicKey });
        }
    });
    return roomUsers;
}

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Signaling server running on port ${PORT}`);
});
