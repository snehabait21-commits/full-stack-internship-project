import { io } from "socket.io-client";

const socket = io(process.env.NEXT_PUBLIC_BACKEND_URL, {
  autoConnect: false, // we'll manually connect only when entering a watch party
});

export default socket;