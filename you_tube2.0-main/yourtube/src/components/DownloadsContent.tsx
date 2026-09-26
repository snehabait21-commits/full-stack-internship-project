"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { Download } from "lucide-react";
import axiosInstance from "@/lib/axiosinstance";
import { useUser } from "@/lib/AuthContext";

export default function DownloadsContent() {
  const [downloads, setDownloads] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useUser();

  useEffect(() => {
    if (user) {
      loadDownloads();
    } else {
      setLoading(true);
    }
  }, [user]);

  const loadDownloads = async () => {
    if (!user) return;
    try {
      const res = await axiosInstance.get(`/download/history/${user._id}`);
      setDownloads(res.data);
    } catch (error) {
      console.error("Error loading downloads:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div>Loading downloads...</div>;
  }

  if (!user) {
    return (
      <div className="text-center py-12">
        <Download className="w-16 h-16 mx-auto text-gray-400 mb-4" />
        <h2 className="text-xl font-semibold mb-2">Keep track of your downloads</h2>
        <p className="text-gray-600">Downloads aren't viewable when signed out.</p>
      </div>
    );
  }

  if (downloads.length === 0) {
    return (
      <div className="text-center py-12">
        <Download className="w-16 h-16 mx-auto text-gray-400 mb-4" />
        <h2 className="text-xl font-semibold mb-2">No downloads yet</h2>
        <p className="text-gray-600">Videos you download will appear here.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-sm text-gray-600">{downloads.length} downloads</p>
      </div>

      <div className="space-y-4">
        {downloads.map((item) => (
          <div key={item._id} className="flex gap-4 group">
            {item.videoid ? (
              <Link href={`/watch/${item.videoid._id}`} className="flex-shrink-0">
                <div className="relative w-40 aspect-video bg-gray-100 rounded overflow-hidden">
                  <video
                    src={`${process.env.NEXT_PUBLIC_BACKEND_URL}/${item.videoid?.filepath?.replace(/\\/g, "/")}`}
                    className="object-cover group-hover:scale-105 transition-transform duration-200"
                  />
                </div>
              </Link>
            ) : (
              <div className="w-40 aspect-video bg-gray-100 rounded flex items-center justify-center text-xs text-gray-400">
                Video removed
              </div>
            )}

            <div className="flex-1 min-w-0">
              {item.videoid ? (
                <Link href={`/watch/${item.videoid._id}`}>
                  <h3 className="font-medium text-sm line-clamp-2 group-hover:text-blue-600 mb-1">
                    {item.videotitle || item.videoid.videotitle}
                  </h3>
                </Link>
              ) : (
                <h3 className="font-medium text-sm line-clamp-2 mb-1">
                  {item.videotitle}
                </h3>
              )}
              <p className="text-xs text-gray-500 capitalize">
                {item.userplan} plan
              </p>
              <p className="text-xs text-gray-500 mt-1">
                Downloaded {formatDistanceToNow(new Date(item.downloadedon))} ago
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}