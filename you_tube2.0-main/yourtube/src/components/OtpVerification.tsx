import React, { useState } from "react";
import { useUser } from "@/lib/AuthContext";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import { toast } from "sonner";

const OtpVerification = () => {
  const { otpPending, pendingEmail, verifyOtp, logout } = useUser();
  const [otp, setOtp] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);

  const handleVerify = async () => {
    if (!otp.trim()) return;
    setIsVerifying(true);
    const result = await verifyOtp(otp);
    setIsVerifying(false);

    if (result.success) {
      toast.success("Login verified successfully!");
      setOtp("");
    } else {
      toast.error(result.message);
    }
  };

  return (
    <Dialog open={otpPending}>
      <DialogContent
        // prevent closing by clicking outside - user must verify or cancel explicitly
        onInteractOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle>Verify your login</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-gray-500">
          We noticed a login from a new location. We've sent a 6-digit code to{" "}
          <span className="font-medium">{pendingEmail}</span>. Please enter it below.
        </p>
        <Input
          placeholder="Enter 6-digit code"
          value={otp}
          onChange={(e) => setOtp(e.target.value)}
          maxLength={6}
          className="text-center text-lg tracking-widest"
        />
        <div className="flex gap-2 justify-end mt-2">
          <Button variant="ghost" onClick={logout}>
            Cancel
          </Button>
          <Button onClick={handleVerify} disabled={!otp.trim() || isVerifying}>
            {isVerifying ? "Verifying..." : "Verify"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default OtpVerification;