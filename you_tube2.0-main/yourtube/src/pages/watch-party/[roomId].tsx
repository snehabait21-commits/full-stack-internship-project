import React, { useEffect, useState, useRef } from "react";
import { useRouter } from "next/router";
import { useUser } from "@/lib/AuthContext";
import socket from "@/lib/socket";
import { useWebRTC } from "@/lib/useWebRTC";
import axiosInstance from "@/lib/axiosinstance";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Send,
  Users,
  Mic,
  MicOff,
  Video,
  VideoOff,
  PhoneOff,
} from "lucide-react";

interface Participant {
  socketId: string;
  userId: string;
  name: string;
  image: string;
}

interface ChatMessage {
  message: string;
  user: { name: string; image: string };
  timestamp: string;
}

const WatchPartyRoom = () => {
  const router = useRouter();
  const { roomId, videoId } = router.query;
  const { user } = useUser();

  const [participants, setParticipants] = useState<Participant[]>([]);
  const [isHost, setIsHost] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [connected, setConnected] = useState(false);
  const [currentVideo, setCurrentVideo] = useState<any>(null);

  const chatEndRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const isRemoteAction = useRef(false);

  const {
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
  } = useWebRTC(roomId);

  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream]);

  useEffect(() => {
    const loadVideo = async (id: string) => {
      try {
        const res = await axiosInstance.get("/video/getall");
        const found = res.data.find((v: any) => v._id === id);
        setCurrentVideo(found || null);
      } catch (error) {
        console.log(error);
      }
    };

    if (videoId && typeof videoId === "string") {
      loadVideo(videoId);
    }
  }, [videoId]);

  // Task 1: wait for camera/mic to be ready BEFORE joining the room or calling anyone -
  // this fixes remote video not appearing, caused by a race condition between
  // getting the camera stream and initiating peer connections
  useEffect(() => {
    if (!roomId || !user) return;

    let isMounted = true;

    const initAndJoin = async () => {
      await startLocalStream();
      if (!isMounted) return;

      socket.connect();

      socket.on("connect", () => {
        setConnected(true);
        socket.emit("join-room", { roomId, user, videoId });
      });

      socket.on("room-state", ({ participants, isHost, videoId: roomVideoId }) => {
        setParticipants(participants);
        setIsHost(isHost);
        if (roomVideoId && !currentVideo) {
          axiosInstance.get("/video/getall").then((res) => {
            const found = res.data.find((v: any) => v._id === roomVideoId);
            setCurrentVideo(found || null);
          });
        }
        participants.forEach((p: Participant) => {
          if (p.socketId !== socket.id) {
            callParticipant(p.socketId);
          }
        });
      });

      socket.on("user-joined", (participant: Participant) => {
        setParticipants((prev) => [...prev, participant]);
      });

      socket.on("user-left", ({ socketId }: { socketId: string }) => {
        setParticipants((prev) => prev.filter((p) => p.socketId !== socketId));
        removePeer(socketId);
      });

      socket.on("promoted-to-host", () => {
        setIsHost(true);
      });

      socket.on("receive-message", (msg: ChatMessage) => {
        setMessages((prev) => [...prev, msg]);
      });

      socket.on("video-sync", ({ action, currentTime }: { action: string; currentTime: number }) => {
        if (!videoRef.current) return;
        isRemoteAction.current = true;

        if (Math.abs(videoRef.current.currentTime - currentTime) > 1.5) {
          videoRef.current.currentTime = currentTime;
        }
        if (action === "play") {
          videoRef.current.play();
        } else if (action === "pause") {
          videoRef.current.pause();
        }

        setTimeout(() => {
          isRemoteAction.current = false;
        }, 300);
      });
    };

    initAndJoin();

    return () => {
      isMounted = false;
      socket.emit("leave-room", { roomId });
      socket.off("connect");
      socket.off("room-state");
      socket.off("user-joined");
      socket.off("user-left");
      socket.off("promoted-to-host");
      socket.off("receive-message");
      socket.off("video-sync");
      socket.disconnect();
      cleanup();
    };
  }, [roomId, user]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSendMessage = () => {
    if (!newMessage.trim() || !user) return;
    socket.emit("send-message", { roomId, message: newMessage, user });
    setNewMessage("");
  };

  const emitVideoAction = (action: string) => {
    if (isRemoteAction.current || !videoRef.current) return;
    socket.emit("video-sync", {
      roomId,
      action,
      currentTime: videoRef.current.currentTime,
    });
  };

  const handleLeaveCall = () => {
    cleanup();
    router.push("/");
  };

  if (!user) {
    return (
      <div className="p-8 text-center">
        <p>Please sign in to join a watch party.</p>
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-64px)]">
      <div className="flex-1 flex flex-col">
        <div className="flex-1 bg-black flex items-center justify-center relative">
          {currentVideo ? (
            <video
              ref={videoRef}
              className="w-full h-full"
              controls
              onPlay={() => emitVideoAction("play")}
              onPause={() => emitVideoAction("pause")}
              onSeeked={() => emitVideoAction("seek")}
            >
              <source
                src={`${process.env.NEXT_PUBLIC_BACKEND_URL}/${currentVideo.filepath?.replace(/\\/g, "/")}`}
                type="video/mp4"
              />
            </video>
          ) : (
            <div className="text-center space-y-2 text-white">
              <p className="text-lg">
                {connected ? "Connected to room" : "Connecting..."}
              </p>
              <p className="text-sm text-gray-400">Room ID: {roomId}</p>
              <p className="text-sm text-gray-400">No video selected for this room yet</p>
              {isHost && (
                <p className="text-sm text-amber-400">You are the host</p>
              )}
            </div>
          )}
        </div>

        <div className="bg-gray-900 p-3 flex gap-3 overflow-x-auto">
          <div className="relative w-40 aspect-video bg-black rounded overflow-hidden flex-shrink-0">
            <video
              ref={localVideoRef}
              autoPlay
              muted
              playsInline
              className="w-full h-full object-cover"
            />
            <span className="absolute bottom-1 left-1 text-xs text-white bg-black/50 px-1.5 py-0.5 rounded">
              You
            </span>
          </div>

          {Object.entries(remoteStreams).map(([socketId, stream]) => {
            const participant = participants.find((p) => p.socketId === socketId);
            return (
              <RemoteVideo
                key={socketId}
                stream={stream as MediaStream}
                name={participant?.name || "Participant"}
              />
            );
          })}
        </div>

        <div className="bg-gray-900 p-3 flex items-center justify-center gap-3 border-t border-gray-800">
          <Button
            variant={isMuted ? "destructive" : "secondary"}
            size="icon"
            onClick={toggleMute}
            title={isMuted ? "Unmute" : "Mute"}
          >
            {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
          </Button>
          <Button
            variant={isCameraOff ? "destructive" : "secondary"}
            size="icon"
            onClick={toggleCamera}
            title={isCameraOff ? "Turn camera on" : "Turn camera off"}
          >
            {isCameraOff ? <VideoOff className="w-5 h-5" /> : <Video className="w-5 h-5" />}
          </Button>
          <Button variant="destructive" size="icon" onClick={handleLeaveCall} title="Leave call">
            <PhoneOff className="w-5 h-5" />
          </Button>
        </div>
      </div>

      <div className="w-80 border-l dark:border-gray-800 flex flex-col">
        <div className="p-4 border-b dark:border-gray-800">
          <div className="flex items-center gap-2 font-medium">
            <Users className="w-4 h-4" />
            Participants ({participants.length})
          </div>
          <div className="mt-2 space-y-2 max-h-32 overflow-y-auto">
            {participants.map((p) => (
              <div key={p.socketId} className="flex items-center gap-2 text-sm">
                <Avatar className="w-6 h-6">
                  <AvatarImage src={p.image} />
                  <AvatarFallback>{p.name?.[0] || "U"}</AvatarFallback>
                </Avatar>
                <span>{p.name}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {messages.map((msg, idx) => (
            <div key={idx} className="text-sm">
              <span className="font-medium">{msg.user.name}: </span>
              <span>{msg.message}</span>
            </div>
          ))}
          <div ref={chatEndRef} />
        </div>

        <div className="p-3 border-t dark:border-gray-800 flex gap-2">
          <Textarea
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSendMessage();
              }
            }}
            placeholder="Type a message..."
            className="min-h-[40px] max-h-[80px] resize-none"
          />
          <Button size="icon" onClick={handleSendMessage}>
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
};

const RemoteVideo = ({ stream, name }: { stream: MediaStream; name: string }) => {
  const ref = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (ref.current) {
      ref.current.srcObject = stream;
    }
  }, [stream]);

  return (
    <div className="relative w-40 aspect-video bg-black rounded overflow-hidden flex-shrink-0">
      <video ref={ref} autoPlay playsInline className="w-full h-full object-cover" />
      <span className="absolute bottom-1 left-1 text-xs text-white bg-black/50 px-1.5 py-0.5 rounded">
        {name}
      </span>
    </div>
  );
};

export default WatchPartyRoom;