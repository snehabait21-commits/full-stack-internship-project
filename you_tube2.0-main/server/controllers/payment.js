import Razorpay from "razorpay";
import crypto from "crypto";
import nodemailer from "nodemailer";
import transaction from "../Modals/transaction.js";
import users from "../Modals/Auth.js";

// Task 3: plan pricing (in INR). Adjust these anytime.
const PLAN_PRICES = {
  bronze: 49,
  silver: 99,
  gold: 199,
};

const PLAN_BENEFITS = {
  bronze: "Longer watch time and limited ad-free viewing",
  silver: "Ad-free viewing and more daily downloads",
  gold: "Full ad-free experience, maximum downloads and priority support",
};

// Task 3: create a Razorpay order - instance created here (not at module load)
// so it always picks up the already-loaded .env values
export const createOrder = async (req, res) => {
  const { userid, plan } = req.body;

  if (!PLAN_PRICES[plan]) {
    return res.status(400).json({ message: "Invalid plan selected" });
  }

  try {
    const razorpayInstance = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET,
    });

    const amount = PLAN_PRICES[plan] * 100; // Razorpay expects amount in paise

    const order = await razorpayInstance.orders.create({
      amount,
      currency: "INR",
      receipt: `receipt_${Date.now()}`,
    });

    // Task 3: record the order attempt as "created" - updated to "paid" after verification
    await transaction.create({
      userid,
      plan,
      amount: PLAN_PRICES[plan],
      razorpayOrderId: order.id,
      status: "created",
    });

    return res.status(200).json({
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      keyId: process.env.RAZORPAY_KEY_ID,
    });
  } catch (error) {
    console.error("Create order error:", error);
    return res.status(500).json({ message: "Something went wrong creating the order" });
  }
};

// Task 3: send confirmation email/invoice after successful payment
const sendInvoiceEmail = async (toEmail, plan, amount) => {
  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });

  await transporter.sendMail({
    from: process.env.EMAIL_USER,
    to: toEmail,
    subject: "Your YourTube subscription confirmation",
    text: `Thank you for upgrading to the ${plan.toUpperCase()} plan!\n\nAmount paid: ₹${amount}\nPlan benefits: ${PLAN_BENEFITS[plan]}\n\nYour subscription is now active. Enjoy!`,
  });
};

// Task 3: verify payment signature and activate the user's plan
export const verifyPayment = async (req, res) => {
  const {
    razorpay_order_id,
    razorpay_payment_id,
    razorpay_signature,
    userid,
    plan,
  } = req.body;

  try {
    // verify the payment is genuinely from Razorpay using the signature
    const generatedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest("hex");

    if (generatedSignature !== razorpay_signature) {
      return res.status(400).json({ message: "Payment verification failed" });
    }

    // update the transaction record
    const txn = await transaction.findOneAndUpdate(
      { razorpayOrderId: razorpay_order_id },
      {
        razorpayPaymentId: razorpay_payment_id,
        razorpaySignature: razorpay_signature,
        status: "paid",
      },
      { new: true }
    );

    // update the user's plan (30 days validity)
    const planExpiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    const updatedUser = await users.findByIdAndUpdate(
      userid,
      { $set: { plan, planExpiresAt } },
      { new: true }
    );

    await sendInvoiceEmail(updatedUser.email, plan, PLAN_PRICES[plan]);

    return res.status(200).json({
      success: true,
      message: "Payment verified and plan activated",
      user: updatedUser,
    });
  } catch (error) {
    console.error("Payment verification error:", error);
    return res.status(500).json({ message: "Something went wrong verifying the payment" });
  }
};

export const getPlanPricing = (req, res) => {
  return res.status(200).json({
    prices: PLAN_PRICES,
    benefits: PLAN_BENEFITS,
  });
};