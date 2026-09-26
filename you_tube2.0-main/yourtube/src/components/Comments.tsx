import React, { useEffect, useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { Textarea } from "./ui/textarea";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
} from "./ui/dialog";
import { formatDistanceToNow } from "date-fns";
import { useUser } from "@/lib/AuthContext";
import axiosInstance from "@/lib/axiosinstance";
import { toast } from "sonner";
import { ThumbsUp, ThumbsDown, Flag, Languages, MapPin } from "lucide-react";

interface Comment {
  _id: string;
  videoid: string;
  userid: string;
  commentbody: string;
  usercommented: string;
  commentedon: string;
  language?: string;
  showLocation?: boolean;
  location?: string;
  likes?: string[];
  dislikes?: string[];
  status?: string;
}

const LANGUAGES = [
  { code: "en", label: "English" },
  { code: "hi", label: "Hindi" },
  { code: "mr", label: "Marathi" },
  { code: "es", label: "Spanish" },
  { code: "fr", label: "French" },
];

const Comments = ({ videoId }: any) => {
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [commentLanguage, setCommentLanguage] = useState("en");
  const [showLocation, setShowLocation] = useState(false);
  const [location, setLocation] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const { user } = useUser();
  const [loading, setLoading] = useState(true);

  const [translations, setTranslations] = useState<Record<string, string>>({});
  const [translating, setTranslating] = useState<Record<string, boolean>>({});

  const [reportDialogOpen, setReportDialogOpen] = useState<string | null>(null);
  const [reportReason, setReportReason] = useState("");

  useEffect(() => {
    loadComments();
  }, [videoId]);

  const loadComments = async () => {
    try {
      const res = await axiosInstance.get(`/comment/${videoId}`);
      setComments(res.data);
    } catch (error) {
      console.log(error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div>Loading history...</div>;
  }

  const handleSubmitComment = async () => {
    if (!user || !newComment.trim()) return;

    setIsSubmitting(true);
    try {
      const res = await axiosInstance.post("/comment/postcomment", {
        videoid: videoId,
        userid: user._id,
        commentbody: newComment,
        usercommented: user.name,
        language: commentLanguage,
        showLocation: showLocation,
        location: showLocation ? location : "",
      });
      if (res.data.comment) {
        const newCommentObj: Comment = {
          _id: res.data.data?._id || Date.now().toString(),
          videoid: videoId,
          userid: user._id,
          commentbody: newComment,
          usercommented: user.name || "Anonymous",
          commentedon: new Date().toISOString(),
          language: commentLanguage,
          showLocation: showLocation,
          location: showLocation ? location : "",
          likes: [],
          dislikes: [],
          status: "active",
        };
        setComments([newCommentObj, ...comments]);
      }
      setNewComment("");
    } catch (error: any) {
      const message = error?.response?.data?.message || "Could not post comment";
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = (comment: Comment) => {
    setEditingCommentId(comment._id);
    setEditText(comment.commentbody);
  };

  const handleUpdateComment = async () => {
    if (!editText.trim()) return;
    try {
      const res = await axiosInstance.post(
        `/comment/editcomment/${editingCommentId}`,
        { commentbody: editText }
      );
      if (res.data) {
        setComments((prev) =>
          prev.map((c) =>
            c._id === editingCommentId ? { ...c, commentbody: editText } : c
          )
        );
        setEditingCommentId(null);
        setEditText("");
      }
    } catch (error) {
      console.log(error);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const res = await axiosInstance.delete(`/comment/deletecomment/${id}`);
      if (res.data.comment) {
        setComments((prev) => prev.filter((c) => c._id !== id));
      }
    } catch (error) {
      console.log(error);
    }
  };

  const handleLike = async (id: string) => {
    if (!user) return;
    try {
      await axiosInstance.post(`/comment/like/${id}`, { userid: user._id });
      setComments((prev) =>
        prev.map((c) => {
          if (c._id !== id) return c;
          const alreadyLiked = c.likes?.includes(user._id);
          const alreadyDisliked = c.dislikes?.includes(user._id);
          return {
            ...c,
            likes: alreadyLiked
              ? c.likes?.filter((u) => u !== user._id)
              : [...(c.likes || []), user._id],
            dislikes: alreadyDisliked
              ? c.dislikes?.filter((u) => u !== user._id)
              : c.dislikes,
          };
        })
      );
    } catch (error) {
      console.log(error);
    }
  };

  const handleDislike = async (id: string) => {
    if (!user) return;
    try {
      await axiosInstance.post(`/comment/dislike/${id}`, { userid: user._id });
      setComments((prev) =>
        prev.map((c) => {
          if (c._id !== id) return c;
          const alreadyDisliked = c.dislikes?.includes(user._id);
          const alreadyLiked = c.likes?.includes(user._id);
          return {
            ...c,
            dislikes: alreadyDisliked
              ? c.dislikes?.filter((u) => u !== user._id)
              : [...(c.dislikes || []), user._id],
            likes: alreadyLiked
              ? c.likes?.filter((u) => u !== user._id)
              : c.likes,
          };
        })
      );
    } catch (error) {
      console.log(error);
    }
  };

  const handleReport = async (id: string) => {
    if (!user) return;
    try {
      await axiosInstance.post(`/comment/report/${id}`, {
        userid: user._id,
        reason: reportReason || "No reason provided",
      });
      toast.success("Comment reported. Our team will review it.");
      setReportDialogOpen(null);
      setReportReason("");
    } catch (error: any) {
      const message = error?.response?.data?.message || "Could not report comment";
      toast.error(message);
    }
  };

  const handleTranslate = async (comment: Comment) => {
    if (translations[comment._id]) {
      setTranslations((prev) => {
        const updated = { ...prev };
        delete updated[comment._id];
        return updated;
      });
      return;
    }

    const sourceLang = comment.language || "en";
    const targetLang = "en";

    if (sourceLang === targetLang) {
      toast.info("This comment is already in English");
      return;
    }

    setTranslating((prev) => ({ ...prev, [comment._id]: true }));
    try {
      const response = await fetch(
        `https://api.mymemory.translated.net/get?q=${encodeURIComponent(
          comment.commentbody
        )}&langpair=${sourceLang}|${targetLang}`
      );
      const data = await response.json();
      const translatedText = data?.responseData?.translatedText;
      if (translatedText) {
        setTranslations((prev) => ({ ...prev, [comment._id]: translatedText }));
      } else {
        toast.error("Translation not available right now");
      }
    } catch (error) {
      toast.error("Translation failed. Please try again.");
    } finally {
      setTranslating((prev) => ({ ...prev, [comment._id]: false }));
    }
  };

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold">{comments.length} Comments</h2>

      {user && (
        <div className="flex gap-4">
          <Avatar className="w-10 h-10">
            <AvatarImage src={user.image || ""} />
            <AvatarFallback>{user.name?.[0] || "U"}</AvatarFallback>
          </Avatar>
          <div className="flex-1 space-y-2">
            <Textarea
              placeholder="Add a comment..."
              value={newComment}
              onChange={(e: any) => setNewComment(e.target.value)}
              className="min-h-[80px] resize-none border-0 border-b-2 rounded-none focus-visible:ring-0"
            />

            <div className="flex flex-wrap items-center gap-3 text-sm">
              <select
                value={commentLanguage}
                onChange={(e) => setCommentLanguage(e.target.value)}
                className="border rounded px-2 py-1 text-sm bg-transparent"
              >
                {LANGUAGES.map((lang) => (
                  <option key={lang.code} value={lang.code}>
                    {lang.label}
                  </option>
                ))}
              </select>

              <label className="flex items-center gap-1 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showLocation}
                  onChange={(e) => setShowLocation(e.target.checked)}
                />
                Show my location
              </label>

              {showLocation && (
                <Input
                  placeholder="e.g. Mumbai"
                  value={location}
                  onChange={(e: any) => setLocation(e.target.value)}
                  className="h-8 w-32 text-sm"
                />
              )}
            </div>

            <div className="flex gap-2 justify-end">
              <Button
                variant="ghost"
                onClick={() => setNewComment("")}
                disabled={!newComment.trim()}
              >
                Cancel
              </Button>
              <Button
                onClick={handleSubmitComment}
                disabled={!newComment.trim() || isSubmitting}
              >
                Comment
              </Button>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-4">
        {comments.length === 0 ? (
          <p className="text-sm text-gray-500 italic">
            No comments yet. Be the first to comment!
          </p>
        ) : (
          comments.map((comment) => {
            const userLiked = user && comment.likes?.includes(user._id);
            const userDisliked = user && comment.dislikes?.includes(user._id);

            return (
              <div key={comment._id} className="flex gap-4">
                <Avatar className="w-10 h-10">
                  <AvatarImage src="/placeholder.svg?height=40&width=40" />
                  <AvatarFallback>{comment.usercommented[0]}</AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className="font-medium text-sm">
                      {comment.usercommented}
                    </span>
                    <span className="text-xs text-gray-600">
                      {formatDistanceToNow(new Date(comment.commentedon))} ago
                    </span>

                    {comment.showLocation && comment.location && (
                      <span className="text-xs text-gray-500 flex items-center gap-1">
                        <MapPin className="w-3 h-3" /> {comment.location}
                      </span>
                    )}

                    {comment.status === "flagged" && (
                      <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded">
                        Under review
                      </span>
                    )}
                  </div>

                  {editingCommentId === comment._id ? (
                    <div className="space-y-2">
                      <Textarea
                        value={editText}
                        onChange={(e) => setEditText(e.target.value)}
                      />
                      <div className="flex gap-2 justify-end">
                        <Button
                          onClick={handleUpdateComment}
                          disabled={!editText.trim()}
                        >
                          Save
                        </Button>
                        <Button
                          variant="ghost"
                          onClick={() => {
                            setEditingCommentId(null);
                            setEditText("");
                          }}
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <p className="text-sm">
                        {translations[comment._id] || comment.commentbody}
                      </p>

                      <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                        <button
                          onClick={() => handleTranslate(comment)}
                          className="flex items-center gap-1 hover:text-gray-800"
                          disabled={translating[comment._id]}
                        >
                          <Languages className="w-4 h-4" />
                          {translating[comment._id]
                            ? "Translating..."
                            : translations[comment._id]
                            ? "Show original"
                            : "Translate"}
                        </button>

                        <button
                          onClick={() => handleLike(comment._id)}
                          className={`flex items-center gap-1 hover:text-gray-800 ${
                            userLiked ? "text-blue-600" : ""
                          }`}
                        >
                          <ThumbsUp className="w-4 h-4" />
                          {comment.likes?.length || 0}
                        </button>

                        <button
                          onClick={() => handleDislike(comment._id)}
                          className={`flex items-center gap-1 hover:text-gray-800 ${
                            userDisliked ? "text-red-600" : ""
                          }`}
                        >
                          <ThumbsDown className="w-4 h-4" />
                          {comment.dislikes?.length || 0}
                        </button>

                        <Dialog
                          open={reportDialogOpen === comment._id}
                          onOpenChange={(open) =>
                            setReportDialogOpen(open ? comment._id : null)
                          }
                        >
                          <DialogTrigger asChild>
                            <button className="flex items-center gap-1 hover:text-gray-800">
                              <Flag className="w-4 h-4" />
                              Report
                            </button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Report this comment</DialogTitle>
                            </DialogHeader>
                            <Textarea
                              placeholder="Why are you reporting this comment? (optional)"
                              value={reportReason}
                              onChange={(e) => setReportReason(e.target.value)}
                            />
                            <DialogFooter>
                              <Button
                                variant="ghost"
                                onClick={() => setReportDialogOpen(null)}
                              >
                                Cancel
                              </Button>
                              <Button onClick={() => handleReport(comment._id)}>
                                Submit report
                              </Button>
                            </DialogFooter>
                          </DialogContent>
                        </Dialog>

                        {comment.userid === user?._id && (
                          <>
                            <button onClick={() => handleEdit(comment)}>
                              Edit
                            </button>
                            <button onClick={() => handleDelete(comment._id)}>
                              Delete
                            </button>
                          </>
                        )}
                      </div>
                    </>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default Comments;