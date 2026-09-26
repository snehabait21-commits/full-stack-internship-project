// Task 1: in-memory store of active watch party rooms
const rooms = {};

export const setupWatchPartySocket = (io) => {
  io.on("connection", (socket) => {
    console.log("Socket connected:", socket.id);

    socket.on("join-room", ({ roomId, user, videoId }) => {
      socket.join(roomId);

      if (!rooms[roomId]) {
        rooms[roomId] = {
          hostId: socket.id,
          participants: [],
          videoId: videoId || null,
          playbackState: { action: "pause", currentTime: 0 },
        };
      }

      if (videoId && !rooms[roomId].videoId) {
        rooms[roomId].videoId = videoId;
      }

      const participant = {
        socketId: socket.id,
        userId: user._id,
        name: user.name,
        image: user.image,
      };

      rooms[roomId].participants.push(participant);

      socket.to(roomId).emit("user-joined", participant);

      socket.emit("room-state", {
        participants: rooms[roomId].participants,
        hostId: rooms[roomId].hostId,
        isHost: rooms[roomId].hostId === socket.id,
        videoId: rooms[roomId].videoId,
        playbackState: rooms[roomId].playbackState,
      });
    });

    socket.on("video-sync", ({ roomId, action, currentTime }) => {
      if (rooms[roomId]) {
        rooms[roomId].playbackState = { action, currentTime };
      }
      socket.to(roomId).emit("video-sync", { action, currentTime });
    });

    socket.on("send-message", ({ roomId, message, user }) => {
      io.to(roomId).emit("receive-message", {
        message,
        user: { name: user.name, image: user.image },
        timestamp: new Date().toISOString(),
      });
    });

    // Task 1: WebRTC signaling - relay these messages to a specific participant only
    socket.on("webrtc-offer", ({ targetSocketId, offer, fromSocketId }) => {
      io.to(targetSocketId).emit("webrtc-offer", { offer, fromSocketId });
    });

    socket.on("webrtc-answer", ({ targetSocketId, answer, fromSocketId }) => {
      io.to(targetSocketId).emit("webrtc-answer", { answer, fromSocketId });
    });

    socket.on("webrtc-ice-candidate", ({ targetSocketId, candidate, fromSocketId }) => {
      io.to(targetSocketId).emit("webrtc-ice-candidate", { candidate, fromSocketId });
    });

    socket.on("leave-room", ({ roomId }) => {
      handleLeave(socket, roomId, io);
    });

    socket.on("disconnecting", () => {
      const joinedRooms = Array.from(socket.rooms).filter((r) => r !== socket.id);
      joinedRooms.forEach((roomId) => handleLeave(socket, roomId, io));
    });
  });
};

const handleLeave = (socket, roomId, io) => {
  if (!rooms[roomId]) return;

  rooms[roomId].participants = rooms[roomId].participants.filter(
    (p) => p.socketId !== socket.id
  );

  socket.to(roomId).emit("user-left", { socketId: socket.id });

  if (rooms[roomId].hostId === socket.id) {
    if (rooms[roomId].participants.length > 0) {
      rooms[roomId].hostId = rooms[roomId].participants[0].socketId;
      io.to(rooms[roomId].hostId).emit("promoted-to-host");
    }
  }

  if (rooms[roomId].participants.length === 0) {
    delete rooms[roomId];
  }
};