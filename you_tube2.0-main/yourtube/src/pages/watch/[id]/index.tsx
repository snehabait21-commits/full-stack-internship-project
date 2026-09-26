import Comments from "@/components/Comments";
import RelatedVideos from "@/components/RelatedVideos";
import VideoInfo from "@/components/VideoInfo";
import Videopplayer from "@/components/Videopplayer";
import axiosInstance from "@/lib/axiosinstance";
import { notFound } from "next/navigation";
import { useRouter } from "next/router";
import React, { useEffect, useMemo, useState } from "react";

const index = () => {
  const router = useRouter();
  const { id } = router.query;
  const shouldAutoplay = router.query.autoplay === "1";
  const [videos, setvideo] = useState<any>(null);
  const [video, setvide] = useState<any>(null);
  const [loading, setloading] = useState(true);
  useEffect(() => {
    const fetchvideo = async () => {
      if (!id || typeof id !== "string") return;
      try {
        const res = await axiosInstance.get("/video/getall");
        const video = res.data?.filter((vid: any) => vid._id === id);
        setvideo(video[0]);
        setvide(res.data);
      } catch (error) {
        console.log(error);
      } finally {
        setloading(false);
      }
    };
    fetchvideo();
  }, [id]);

  // Task 4: figure out which video should play next
  // video (confusingly named) holds ALL videos, videos holds the CURRENT one
  const nextVideo = useMemo(() => {
    if (!video || !videos) return null;
    const currentIndex = video.findIndex((v: any) => v._id === videos._id);
    if (currentIndex === -1) return null;
    // if current video is last in the list, loop back to the first one
    const nextIndex = currentIndex + 1 < video.length ? currentIndex + 1 : 0;
    return video[nextIndex]?._id === videos._id ? null : video[nextIndex];
  }, [video, videos]);

  const handleNext = () => {
    if (nextVideo) {
      router.push(`/watch/${nextVideo._id}?autoplay=1`);
    }
  };

  if (loading) {
    return <div>Loading..</div>;
  }

  if (!videos) {
    return <div>Video not found</div>;
  }
  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-7xl mx-auto p-4">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            <Videopplayer
              video={videos}
              nextVideo={nextVideo}
              onNext={handleNext}
              autoPlay={shouldAutoplay}
            />
            <VideoInfo video={videos} />
            <Comments videoId={id} />
          </div>
          <div className="space-y-4">
            <RelatedVideos videos={video} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default index;