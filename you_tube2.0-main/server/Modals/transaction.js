import mongoose from "mongoose";

const transactionschema = mongoose.Schema(
  {
    userid: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "user",
      required: true,
    },
    plan: { type: String, enum: ["bronze", "silver", "gold"], required: true },
    amount: { type: Number, required: true }, // amount in INR (rupees)
    razorpayOrderId: { type: String, required: true },
    razorpayPaymentId: { type: String },
    razorpaySignature: { type: String },
    status: { type: String, enum: ["created", "paid", "failed"], default: "created" },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model("transaction", transactionschema);