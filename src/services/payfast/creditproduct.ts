// services/payfast/credit.service.ts
import { Request, Response } from "express";
import {
    generateOrderNumber,
    generateTransactionId,
    preparePayFastDataCREDIT,
} from '../../utils/payfast.utils';
import { planOrderModel } from "../../models/orders/plan_orders";
import { CREDIT_PAYFAST_CONFIG } from "../../config/payfast.config";
import { usersModel } from "../../models/user/user-schema"; // ✅ Import user model


// ============================================
// PLAN DATA
// ============================================
const PLANS = {
    basic: {
        id: "basic",
        name: "Individual Scholar",
        type: "basic",
        credits: 100,
        monthlyPrice: 450,
        yearlyPrice: 4500,
        features: [
            "10 Document translations/month with AI Story Engine",
            "1 Standard Academic Profile with Voice & Tone Calibrator",
            "Step-by-step tools for op-eds, policy briefs & thought leadership",
            "Access to foundational AI tools to articulate research identity",
            "Request 'Magalela Polish' at standard hourly/project rate",
            "Community support via email"
        ]
    },
    pro: {
        id: "pro",
        name: "Department",
        type: "pro",
        credits: 200,
        monthlyPrice: 2500,
        yearlyPrice: 25000,
        features: [
            "20 Document translations/month with AI Story Engine",
            "Up to 3 Custom Voice Profiles for team members",
            "Consistent overflow capacity for high-volume periods",
            "1 hour of human-led specialist science communication editing/month",
            "Social media content aligned with institutional tone",
            "Introduction to premium journalism, strategy & storytelling services",
            "Priority email support"
        ]
    },
    enterprise: {
        id: "enterprise",
        name: "Organisation",
        type: "enterprise",
        credits: 1000,
        monthlyPrice: 12500,
        yearlyPrice: 125000,
        features: [
            "100+ Document translations/month with AI Story Engine",
            "Unlimited Institutional Voice Profiles",
            "IP protection through precise sourcing and rigorous editorial standards",
            "Dedicated account manager with integrated narrative impact strategy",
            "Custom AI models trained on institutional archives",
            "Complex multi-user collaboration with top-tier security",
            "Premium service combining journalism, strategy, editing & storytelling",
            "24/7 priority support with dedicated success team"
        ]
    }
};

// ============================================
// 1. INITIATE CREDIT PAYMENT SERVICE (NO TAX)
// ============================================
export const initiateCreditPaymentService = async (payload: any, req: Request, res: Response) => {
    try {
        const {
            userEmail,
            billingInfo,
            planId,
            billingCycle = 'monthly'
        } = payload;

        // ✅ Validate required fields
        if (!userEmail || !billingInfo || !planId) {
            return {
                success: false,
                message: "Missing required fields: userEmail, billingInfo, or planId",
            };
        }

        // ✅ Validate billing info fields
        if (!billingInfo.firstName || !billingInfo.lastName || !billingInfo.email) {
            return {
                success: false,
                message: "Missing required billing fields: firstName, lastName, or email",
            };
        }

        // ✅ Find plan
        const plan = PLANS[planId as keyof typeof PLANS];
        if (!plan) {
            return {
                success: false,
                message: "Plan not found",
            };
        }

        // ✅ Get price based on billing cycle (NO TAX)
        const price = billingCycle === 'monthly' ? plan.monthlyPrice : plan.yearlyPrice;
        const credits = billingCycle === 'monthly' ? plan.credits : plan.credits * 12;

        // ✅ Generate order details
        const orderNumber = generateOrderNumber();
        const transactionId = generateTransactionId();

        // ✅ Create order in database with ALL required fields (NO TAX)
        const order = new planOrderModel({
            orderNumber: orderNumber,
            userEmail: userEmail,
            orderType: 'plan',

            // Plan Details
            planId: plan.id,
            planName: plan.name,
            planType: plan.type,
            credits: credits,
            price: price,
            billingCycle: billingCycle,
            planFeatures: plan.features,

            // Payment Details - NO TAX
            subtotal: price,
            taxAmount: 0, // ✅ No tax
            discountAmount: 0,
            totalAmount: price, // ✅ Direct amount without tax
            currency: 'ZAR',
            status: 'pending',
            paymentMethod: 'payfast',
            transactionId: transactionId,

            // Billing Info
            billingInfo: {
                firstName: billingInfo.firstName,
                lastName: billingInfo.lastName,
                email: billingInfo.email,
                phone: billingInfo.phone || "",
                company: billingInfo.company || "",
                organisation: billingInfo.organisation || billingInfo.company || "",
                streetAddress: billingInfo.address || billingInfo.streetAddress || "",
                city: billingInfo.city || "",
                postalCode: billingInfo.postalCode || "",
                country: billingInfo.country || "",
                taxNumber: billingInfo.taxNumber || "",
            },

            // Credit Tracking
            creditDetails: {
                creditsPurchased: credits,
                creditsBefore: 0,
                creditsAfter: 0,
                remainingCredits: credits,
                usedCredits: 0,
            },

            // User Info Snapshot
            user: {
                name: `${billingInfo.firstName} ${billingInfo.lastName}`,
                email: billingInfo.email,
                currentPlan: 'free',
                currentCredits: 0,
            },

            // Status History
            statusHistory: [{
                status: 'pending',
                timestamp: new Date(),
                note: 'Order created - awaiting payment',
            }],

            // PayFast Response (initially empty)
            payfast: {},

            // Timestamps
            paidAt: null,
            cancelledAt: null,
            refundedAt: null,
        });

        await order.save();

        // ✅ Prepare PayFast payment data - just pass the params object
        const paymentData = preparePayFastDataCREDIT({
            amount: price,
            email: billingInfo.email,
            firstName: billingInfo.firstName,
            lastName: billingInfo.lastName,
            orderNumber: orderNumber,
            transactionId: transactionId,
        });

        return {
            success: true,
            message: "Payment initiated successfully",
            data: {
                paymentUrl: CREDIT_PAYFAST_CONFIG.paymentUrl,
                paymentData: paymentData,
                transactionId: transactionId,
                orderNumber: orderNumber,
                orderId: order._id,
                amount: price, // ✅ Direct amount without tax
                plan: plan,
                credits: credits,
                billingCycle: billingCycle,
            },
        };

    } catch (error: any) {
        console.error('❌ Initiate Payment Error:', error);

        // ✅ Check if it's a validation error
        if (error.name === 'ValidationError') {
            const errors = Object.values(error.errors).map((err: any) => err.message);
            return {
                success: false,
                message: `Validation error: ${errors.join(', ')}`,
                error: error.message,
                validationErrors: errors,
            };
        }

        return {
            success: false,
            message: error.message || 'Payment initiation failed',
            error: error.message,
        };
    }
};

// ============================================
// 2. HANDLE CREDIT PAYMENT NOTIFICATION SERVICE
// ============================================

export const handleCreditPaymentNotificationService = async (payload: any, res: Response) => {
  try {
    const data = payload;
    console.log("📩 PayFast ITN Received:", data);

    const paymentStatus = data.payment_status;
    const transactionId = data.m_payment_id;
    const pfPaymentId = data.pf_payment_id;
    const orderNumber = data.custom_str1 || "";

    // ✅ Find order
    let order = await planOrderModel.findOne({
      $or: [
        { transactionId: transactionId },
        { orderNumber: orderNumber }
      ]
    } as any);

    if (!order) {
      console.error("❌ Order not found for:", { transactionId, orderNumber });
      return {
        success: false,
        message: "Order not found.",
      };
    }

    // ✅ Handle COMPLETE payment
    if (paymentStatus === "COMPLETE") {
      try {
        // ✅ 1. Update order status
        const updatedOrder = await planOrderModel.findByIdAndUpdate(
          order._id,
          {
            status: 'paid',
            paidAt: new Date(),
            'payfast.paymentId': pfPaymentId,
            'payfast.transactionId': transactionId,
            'payfast.status': paymentStatus,
            'payfast.amount': Number(data.amount_gross || order.totalAmount),
            'creditDetails.creditsAfter': order.credits,
            'creditDetails.remainingCredits': order.credits,
            'user.currentPlan': order.planType,
            'user.currentCredits': order.credits,
            $push: {
              statusHistory: {
                status: 'paid',
                timestamp: new Date(),
                note: 'Payment completed successfully',
              }
            }
          },
          { new: true }
        );

        console.log(`✅ Credit payment completed for order: ${order.orderNumber}`);

        // ✅ 2. ADD CREDITS TO USER
        const user = await usersModel.findOne({ email: order.userEmail });

        if (user) {
          const previousCredits = user.credits || 0;
          const newCredits = previousCredits + order.credits;

          // ✅ Update user with new credits and plan
          await usersModel.findByIdAndUpdate(
            user._id,
            {
              $inc: { credits: order.credits }, // ✅ Add credits
              $set: {
                plan: order.planType,
                planType: order.planType,
                lastCreditPurchase: new Date(),
                lastPurchaseAmount: order.totalAmount,
                lastPurchasePlan: order.planName,
                lastPurchaseOrderNumber: order.orderNumber,
              }
            }
          );

          console.log(`✅ ${order.credits} credits added to user: ${user.email}`);
          console.log(`📊 Credits: ${previousCredits} → ${newCredits}`);
          console.log(`📋 Plan updated to: ${order.planType}`);

        } else {
          console.warn(`⚠️ User not found: ${order.userEmail}`);
          
          // Mark order that user not found
          await planOrderModel.findByIdAndUpdate(
            order._id,
            {
              $set: {
                notes: 'User not found - credits not added automatically',
              }
            }
          );
        }

        return {
          success: true,
          message: "Credit payment completed successfully",
          data: {
            orderNumber: order.orderNumber,
            status: 'paid',
            credits: order.credits,
            planName: order.planName,
            planType: order.planType,
          },
        };

      } catch (error: any) {
        console.error('❌ Error processing payment:', error);
        
        // ✅ If something fails, mark order as failed
        await planOrderModel.findByIdAndUpdate(
          order._id,
          {
            status: 'failed',
            notes: `Failed to add credits: ${error.message}`,
            $push: {
              statusHistory: {
                status: 'failed',
                timestamp: new Date(),
                note: `Failed to process: ${error.message}`,
              }
            }
          }
        );

        return {
          success: false,
          message: 'Failed to process payment',
          error: error.message,
        };
      }
    }

    // ✅ Handle PENDING payment
    if (paymentStatus === "PENDING") {
      await planOrderModel.findByIdAndUpdate(
        order._id,
        {
          status: 'pending',
          'payfast.status': paymentStatus,
          $push: {
            statusHistory: {
              status: 'pending',
              timestamp: new Date(),
              note: 'Payment pending',
            }
          }
        },
        { new: true }
      );
      console.log("⏳ Credit payment pending for order:", order.orderNumber);
      
      return {
        success: true,
        message: "Credit payment pending",
        data: { orderNumber: order.orderNumber, status: 'pending' },
      };
    }

    // ✅ Handle FAILED or CANCELLED payment
    if (paymentStatus === "FAILED" || paymentStatus === "CANCELLED") {
      await planOrderModel.findByIdAndUpdate(
        order._id,
        {
          status: 'failed',
          'payfast.status': paymentStatus,
          $push: {
            statusHistory: {
              status: 'failed',
              timestamp: new Date(),
              note: `Payment ${paymentStatus.toLowerCase()}`,
            }
          }
        },
        { new: true }
      );
      console.log(`❌ Credit payment ${paymentStatus.toLowerCase()} for order:`, order.orderNumber);
      
      return {
        success: true,
        message: `Credit payment ${paymentStatus.toLowerCase()}`,
        data: { orderNumber: order.orderNumber, status: 'failed' },
      };
    }

    return {
      success: true,
      message: "Credit payment notification processed",
    };

  } catch (error: any) {
    console.error("❌ ITN Processing Error:", error);
    return {
      success: false,
      message: error.message || "ITN Processing failed.",
    };
  }
};

// ============================================
// 3. GET CREDIT ORDER STATUS SERVICE
// ============================================
export const getCreditOrderStatusService = async (orderId: string) => {
    try {
        const order = await planOrderModel.findOne({
            $or: [
                { _id: orderId },
                { orderNumber: orderId }
            ]
        });

        if (!order) {
            return {
                success: false,
                message: "Order not found",
                data: null,
            };
        }

        return {
            success: true,
            message: "Order status fetched successfully",
            data: {
                orderNumber: order.orderNumber,
                status: order.status,
                planName: order.planName,
                planType: order.planType,
                credits: order.credits,
                totalAmount: order.totalAmount,
                paidAt: order.paidAt,
                createdAt: order.createdAt,
                billingCycle: order.billingCycle,
            },
        };

    } catch (error: any) {
        console.error("Error fetching order status:", error);
        return {
            success: false,
            message: error.message || "Failed to fetch order status",
            data: null,
        };
    }
};

// ============================================
// 4. GET CREDIT ORDER SERVICE
// ============================================
export const getCreditOrderService = async (
  id: string,
  body: any,
  res: Response
) => {
  try {
    const order = await planOrderModel.findOne({ orderNumber: id });

    if (!order) {
      return {
        success: false,
        message: "Order not found",
        data: null,
      };
    }

    return {
      success: true,
      message: "Order fetched successfully",
      data: order,
    };

  } catch (error: any) {
    console.error("Error fetching order:", error);
    return {
      success: false,
      message: error.message || "Failed to fetch order",
      data: null,
    };
  }
};

// ============================================
// 5. GET USER CREDIT ORDERS SERVICE
// ============================================
export const getUserCreditOrdersService = async (email: string) => {
    try {
        if (!email) {
            return {
                success: false,
                message: "Email is required",
                data: [],
            };
        }

        const orders = await planOrderModel.find({
            userEmail: email,
        }).sort({ createdAt: -1 });

        // Format orders for response
        const formattedOrders = orders.map(order => ({
            orderNumber: order.orderNumber,
            transactionId: order.transactionId,
            planName: order.planName,
            planType: order.planType,
            credits: order.credits,
            price: order.price,
            billingCycle: order.billingCycle,
            totalAmount: order.totalAmount,
            status: order.status,
            paidAt: order.paidAt,
            createdAt: order.createdAt,
            creditDetails: order.creditDetails,
            billingInfo: {
                firstName: order.billingInfo?.firstName,
                lastName: order.billingInfo?.lastName,
                email: order.billingInfo?.email,
            },
        }));

        return {
            success: true,
            message: "Orders fetched successfully",
            data: formattedOrders,
        };

    } catch (error: any) {
        console.error("Error fetching orders:", error);
        return {
            success: false,
            message: error.message || "Failed to fetch orders",
            data: [],
        };
    }
};