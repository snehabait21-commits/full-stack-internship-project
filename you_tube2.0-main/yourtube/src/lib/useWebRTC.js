import { useEffect, useRef, useState, useCallback } from "react";
import socket from "./socket";

const ICE_SERVERS = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
  ],
};

export function useWebRTC(roomId) {
  const [localStream, setLocalStream] = useState(null);
  const [remoteStreams, setRemoteStreams] = useState({});
  const [isMuted, setIsMuted] = useState(false);
  const [isCameraOff, setIsCameraOff] = useState(false);

  const peerConnections = useRef({});
  const localStreamRef = useRef(null);

  const startLocalStream = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });
      localStreamRef.current = stream;
      setLocalStream(stream);
      console.log("Local stream ready with tracks:", stream.getTracks().length);
      return stream;
    } catch (error) {
      console.error("Could not access camera/mic:", error);
      return null;
    }
  }, []);

  const createPeerConnection = useCallback((targetSocketId) => {
    console.log("Creating peer connection with:", targetSocketId);
    const pc = new RTCPeerConnection(ICE_SERVERS);

    if (localStreamRef.current) {
      console.log("Adding local tracks:", localStreamRef.current.getTracks().length);
      localStreamRef.current.getTracks().forEach((track) => {
        pc.addTrack(track, localStreamRef.current);
      });
    } else {
      console.log("WARNING: no local stream available yet when creating peer connection for", targetSocketId);
    }

    pc.ontrack = (event) => {
      console.log("ontrack fired! Received remote stream from:", targetSocketId);
      setRemoteStreams((prev) => ({
        ...prev,
        [targetSocketId]: event.streams[0],
      }));
    };

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        socket.emit("webrtc-ice-candidate", {
          targetSocketId,
          candidate: event.candidate,
          fromSocketId: socket.id,
        });
      }
    };

    pc.onconnectionstatechange = () => {
      console.log("Connection state with", targetSocketId, ":", pc.connectionState);
    };

    peerConnections.current[targetSocketId] = pc;
    return pc;
  }, []);

  const callParticipant = useCallback(
    async (targetSocketId) => {
      const pc = createPeerConnection(targetSocketId);
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      socket.emit("webrtc-offer", {
        targetSocketId,
        offer,
        fromSocketId: socket.id,
      });
    },
    [createPeerConnection]
  );

  useEffect(() => {
    const handleOffer = async ({ offer, fromSocketId }) => {
      const pc = createPeerConnection(fromSocketId);
      await pc.setRemoteDescription(new RTCSessionDescription(offer));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      socket.emit("webrtc-answer", {
        targetSocketId: fromSocketId,
        answer,
        fromSocketId: socket.id,
      });
    };

    const handleAnswer = async ({ answer, fromSocketId }) => {
      const pc = peerConnections.current[fromSocketId];
      if (pc) {
        await pc.setRemoteDescription(new RTCSessionDescription(answer));
      }
    };

    const handleIceCandidate = async ({ candidate, fromSocketId }) => {
      const pc = peerConnections.current[fromSocketId];
      if (pc) {
        try {
          await pc.addIceCandidate(new RTCIceCandidate(candidate));
        } catch (error) {
          console.error("Error adding ICE candidate:", error);
        }
      }
    };

    socket.on("webrtc-offer", handleOffer);
    socket.on("webrtc-answer", handleAnswer);
    socket.on("webrtc-ice-candidate", handleIceCandidate);

    return () => {
      socket.off("webrtc-offer", handleOffer);
      socket.off("webrtc-answer", handleAnswer);
      socket.off("webrtc-ice-candidate", handleIceCandidate);
    };
  }, [createPeerConnection]);

  const removePeer = useCallback((socketId) => {
    if (peerConnections.current[socketId]) {
      peerConnections.current[socketId].close();
      delete peerConnections.current[socketId];
    }
    setRemoteStreams((prev) => {
      const updated = { ...prev };
      delete updated[socketId];
      return updated;
    });
  }, []);

  const toggleMute = useCallback(() => {
    if (!localStreamRef.current) return;
    const audioTrack = localStreamRef.current.getAudioTracks()[0];
    if (audioTrack) {
      audioTrack.enabled = !audioTrack.enabled;
      setIsMuted(!audioTrack.enabled);
    }
  }, []);

  const toggleCamera = useCallback(() => {
    if (!localStreamRef.current) return;
    const videoTrack = localStreamRef.current.getVideoTracks()[0];
    if (videoTrack) {
      videoTrack.enabled = !videoTrack.enabled;
      setIsCameraOff(!videoTrack.enabled);
    }
  }, []);

  const cleanup = useCallback(() => {
    Object.values(peerConnections.current).forEach((pc) => pc.close());
    peerConnections.current = {};
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => track.stop());
    }
    setLocalStream(null);
    setRemoteStreams({});
  }, []);

  return {
    localStream,
    remoteStreams,
    isMuted,
    isCameraOff,
    startLocalStream,
    callParticipant,
    removePeer,
    toggleMute,
    toggleCamera,
    cleanup,
  };
}