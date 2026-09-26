import React, { useState } from "react";
import { useUser } from "@/lib/AuthContext";
import axiosInstance from "@/lib/axiosinstance";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Check } from "lucide-react";

const PLANS = [
  {
    id: "free",
    name: "Free",
    price: 0,
    features: ["Standard video quality", "Limited watch time", "Ads included", "1 download per day"],
  },
  {
    id: "bronze",
    name: "Bronze",
    price: 49,
    features: ["Longer watch time", "Fewer ads", "3 downloads per day"],
  },
  {
    id: "silver",
    name: "Silver",
    price: 99,
    features: ["Extended watch time", "Ad-free viewing", "5 downloads per day"],
  },
  {
    id: "gold",
    name: "Gold",
    price: 199,
    features: ["Unlimited watch time", "Fully ad-free", "10 downloads per day", "Priority support"],
  },
];

const Subscription = () => {
  const { user, login } = useUser();
  const [processingPlan, setProcessingPlan] = useState<string | null>(null);

  const handleUpgrade = async (planId: string) => {
    if (!user) {
      toast.error("Please sign in to upgrade your plan");
      return;
    }
    if (planId === "free") return;
    if (user.plan === planId) {
      toast.info("You're already on this plan");
      return;
    }

    setProcessingPlan(planId);
    try {
      // Task 3: create a Razorpay order on our backend
      const orderRes = await axiosInstance.post("/payment/create-order", {
        userid: user._id,
        plan: planId,
      });

      const { orderId, amount, currency, keyId } = orderRes.data;

      // Task 3: open Razorpay's checkout popup
      const options = {
        key: keyId,
        amount,
        currency,
        name: "YourTube",
        description: `Upgrade to ${planId.charAt(0).toUpperCase() + planId.slice(1)} plan`,
        order_id: orderId,
        handler: async (response: any) => {
          try {
            // Task 3: verify the payment on our backend
            const verifyRes = await axiosInstance.post("/payment/verify", {
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              userid: user._id,
              plan: planId,
            });

            login(verifyRes.data.user);
            toast.success(`Successfully upgraded to ${planId} plan! A confirmation email has been sent.`);
          } catch (error) {
            toast.error("Payment verification failed. Please contact support.");
          } finally {
            setProcessingPlan(null);
          }
        },
        modal: {
          ondismiss: () => {
            setProcessingPlan(null);
          },
        },
        prefill: {
          name: user.name,
          email: user.email,
        },
        theme: {
          color: "#dc2626",
        },
      };

      const razorpay = new (window as any).Razorpay(options);
      razorpay.open();
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Could not start payment");
      setProcessingPlan(null);
    }
  };

  return (
    <main className="flex-1 p-6">
      <div className="max-w-5xl mx-auto">
        <h1 className="text-2xl font-bold mb-2">Choose your plan</h1>
        <p className="text-gray-600 dark:text-gray-400 mb-6">
          Upgrade for longer watch time, ad-free viewing, and more downloads.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {PLANS.map((plan) => {
            const isCurrentPlan = user?.plan === plan.id;
            return (
              <div
                key={plan.id}
                className={`border rounded-lg p-5 flex flex-col ${
                  isCurrentPlan ? "border-red-500 border-2" : "dark:border-gray-800"
                }`}
              >
                <h3 className="text-lg font-semibold">{plan.name}</h3>
                <p className="text-2xl font-bold my-2">
                  {plan.price === 0 ? "Free" : `₹${plan.price}`}
                  {plan.price > 0 && <span className="text-sm font-normal text-gray-500">/month</span>}
                </p>
                <ul className="space-y-2 flex-1 my-4">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2 text-sm">
                      <Check className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
                <Button
                  onClick={() => handleUpgrade(plan.id)}
                  disabled={plan.id === "free" || isCurrentPlan || processingPlan === plan.id}
                  variant={isCurrentPlan ? "secondary" : "default"}
                >
                  {isCurrentPlan
                    ? "Current plan"
                    : processingPlan === plan.id
                    ? "Processing..."
                    : plan.id === "free"
                    ? "Default plan"
                    : "Upgrade"}
                </Button>
              </div>
            );
          })}
        </div>
      </div>
    </main>
  );
};

export default Subscription;