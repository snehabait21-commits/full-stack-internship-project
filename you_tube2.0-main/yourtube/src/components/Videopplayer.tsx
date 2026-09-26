"use client";

import { useRef, useState, useEffect } from "react";
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize,
  Minimize,
  RotateCcw,
  RotateCw,
  SkipForward,
  Loader2,
} from "lucide-react";

interface VideoPlayerProps {
  video: {
    _id: string;
    videotitle: string;
    filepath: string;
  };
  nextVideo?: {
    _id: string;
    videotitle: string;
  };
  onNext?: () => void;
  autoPlay?: boolean;
}

export default function VideoPlayer({ video, nextVideo, onNext, autoPlay }: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [showControls, setShowControls] = useState(true);
  const [showNextPrompt, setShowNextPrompt] = useState(false);

  const [gestureFeedback, setGestureFeedback] = useState<"forward" | "backward" | null>(null);

  const videoSrc = `${process.env.NEXT_PUBLIC_BACKEND_URL}/${video?.filepath?.replace(/\\/g, "/")}`;

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (videoRef.current.paused) {
      videoRef.current.play();
      setIsPlaying(true);
    } else {
      videoRef.current.pause();
      setIsPlaying(false);
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!videoRef.current) return;
    const newTime = Number(e.target.value);
    videoRef.current.currentTime = newTime;
    setCurrentTime(newTime);
  };

  const skip = (seconds: number) => {
    if (!videoRef.current) return;
    videoRef.current.currentTime = Math.min(
      Math.max(videoRef.current.currentTime + seconds, 0),
      duration
    );
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!videoRef.current) return;
    const newVolume = Number(e.target.value);
    videoRef.current.volume = newVolume;
    setVolume(newVolume);
    setIsMuted(newVolume === 0);
  };

  const toggleMute = () => {
    if (!videoRef.current) return;
    videoRef.current.muted = !videoRef.current.muted;
    setIsMuted(videoRef.current.muted);
  };

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  const formatTime = (time: number) => {
    if (isNaN(time)) return "0:00";
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  };

  const lastTapRef = useRef<{ time: number; side: "left" | "right" | null }>({
    time: 0,
    side: null,
  });

  const handleContainerTap = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const tapX = e.clientX - rect.left;
    const side = tapX < rect.width / 2 ? "left" : "right";
    const now = Date.now();

    if (
      now - lastTapRef.current.time < 300 &&
      lastTapRef.current.side === side
    ) {
      if (side === "right") {
        skip(10);
        setGestureFeedback("forward");
      } else {
        skip(-10);
        setGestureFeedback("backward");
      }
      setTimeout(() => setGestureFeedback(null), 500);
      lastTapRef.current = { time: 0, side: null };
    } else {
      lastTapRef.current = { time: now, side };
    }
  };

  useEffect(() => {
    const videoEl = videoRef.current;
    if (!videoEl) return;

    const handleLoadedMetadata = () => {
      setDuration(videoEl.duration);
      setIsLoading(false);
      if (autoPlay) {
        videoEl
          .play()
          .then(() => setIsPlaying(true))
          .catch(() => {
            console.log("Autoplay was blocked by the browser");
          });
      }
    };
    const handleTimeUpdate = () => setCurrentTime(videoEl.currentTime);
    const handleWaiting = () => setIsLoading(true);
    const handlePlaying = () => setIsLoading(false);
    const handleEnded = () => {
      setIsPlaying(false);
      if (nextVideo) setShowNextPrompt(true);
    };

    videoEl.addEventListener("loadedmetadata", handleLoadedMetadata);
    videoEl.addEventListener("timeupdate", handleTimeUpdate);
    videoEl.addEventListener("waiting", handleWaiting);
    videoEl.addEventListener("playing", handlePlaying);
    videoEl.addEventListener("ended", handleEnded);

    return () => {
      videoEl.removeEventListener("loadedmetadata", handleLoadedMetadata);
      videoEl.removeEventListener("timeupdate", handleTimeUpdate);
      videoEl.removeEventListener("waiting", handleWaiting);
      videoEl.removeEventListener("playing", handlePlaying);
      videoEl.removeEventListener("ended", handleEnded);
    };
  }, [video?._id, nextVideo, autoPlay]);

  // Task 4: force the video element to reload when switching to a new video,
  // otherwise the browser keeps playing the old buffered video
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.load();
    }
  }, [video?._id]);

  useEffect(() => {
    if (!isPlaying) {
      setShowControls(true);
      return;
    }
    const timer = setTimeout(() => setShowControls(false), 3000);
    return () => clearTimeout(timer);
  }, [isPlaying, showControls]);

  return (
    <div
      ref={containerRef}
      className="relative aspect-video bg-black rounded-lg overflow-hidden group select-none"
      onMouseMove={() => setShowControls(true)}
      onClick={handleContainerTap}
    >
      <video
        ref={videoRef}
        className="w-full h-full"
        poster={`/placeholder.svg?height=480&width=854`}
        onClick={(e) => {
          e.stopPropagation();
          togglePlay();
        }}
      >
        <source src={videoSrc} type="video/mp4" />
        Your browser does not support the video tag.
      </video>

      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/30 pointer-events-none">
          <Loader2 className="w-10 h-10 text-white animate-spin" />
        </div>
      )}

      {gestureFeedback && (
        <div
          className={`absolute top-1/2 -translate-y-1/2 ${
            gestureFeedback === "forward" ? "right-10" : "left-10"
          } bg-black/60 text-white rounded-full p-4 pointer-events-none animate-pulse`}
        >
          {gestureFeedback === "forward" ? (
            <RotateCw className="w-8 h-8" />
          ) : (
            <RotateCcw className="w-8 h-8" />
          )}
        </div>
      )}

      {showNextPrompt && nextVideo && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/70 text-white gap-3">
          <p className="text-sm text-gray-300">Up next</p>
          <p className="font-medium">{nextVideo.videotitle}</p>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowNextPrompt(false);
              onNext?.();
            }}
            className="flex items-center gap-2 bg-white text-black px-4 py-2 rounded-full text-sm font-medium hover:bg-gray-200"
          >
            <SkipForward className="w-4 h-4" /> Play now
          </button>
        </div>
      )}

      <div
        className={`absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent px-4 pb-3 pt-8 transition-opacity duration-300 ${
          showControls ? "opacity-100" : "opacity-0"
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        <input
          type="range"
          min={0}
          max={duration || 0}
          value={currentTime}
          onChange={handleSeek}
          className="w-full h-1 accent-red-600 cursor-pointer mb-2"
        />

        <div className="flex items-center justify-between text-white">
          <div className="flex items-center gap-3">
            <button onClick={togglePlay}>
              {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
            </button>

            <button onClick={() => skip(-10)} title="Rewind 10 seconds">
              <RotateCcw className="w-5 h-5" />
            </button>
            <button onClick={() => skip(10)} title="Forward 10 seconds">
              <RotateCw className="w-5 h-5" />
            </button>

            <button onClick={toggleMute}>
              {isMuted || volume === 0 ? (
                <VolumeX className="w-5 h-5" />
              ) : (
                <Volume2 className="w-5 h-5" />
              )}
            </button>
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={isMuted ? 0 : volume}
              onChange={handleVolumeChange}
              className="w-16 h-1 accent-white cursor-pointer"
            />

            <span className="text-xs text-gray-200">
              {formatTime(currentTime)} / {formatTime(duration)}
            </span>
          </div>

          <div className="flex items-center gap-3">
            {nextVideo && (
              <button onClick={() => onNext?.()} title="Next video">
                <SkipForward className="w-5 h-5" />
              </button>
            )}
            <button onClick={toggleFullscreen} title="Fullscreen">
              {isFullscreen ? (
                <Minimize className="w-5 h-5" />
              ) : (
                <Maximize className="w-5 h-5" />
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}