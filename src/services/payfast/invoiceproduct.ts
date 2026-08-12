// services/payfast/invoiceproduct.ts
import { Request, Response } from "express";
import {
    generateOrderNumber,
    generateTransactionId,
    preparePayFastDataInvoice,
} from '../../utils/payfast.utils';
import { invoiceOrderModel } from "../../models/orders/invoice_orders";
import { INVOICE_PAYFAST_CONFIG } from "../../config/payfast.config";
import { usersModel } from "../../models/user/user-schema";
import { InvoiceModel } from "../../models/invoice/invoice-schema";

// ============================================
// 1. INITIATE INVOICE PAYMENT SERVICE
// ============================================
export const initiateCreditPaymentService = async (payload: any, req: Request, res: Response) => {
    try {
        const {
            userEmail,
            billingInfo,
            invoiceId,
            invoiceNumber,
            amount,
            items,
            description
        } = payload;

        // ✅ Validate required fields
        if (!userEmail || !billingInfo || !invoiceId) {
            return {
                success: false,
                message: "Missing required fields: userEmail, billingInfo, or invoiceId",
            };
        }

        // ✅ Validate billing info fields
        if (!billingInfo.firstName || !billingInfo.lastName || !billingInfo.email) {
            return {
                success: false,
                message: "Missing required billing fields: firstName, lastName, or email",
            };
        }

        // ✅ Validate amount
        if (!amount || amount <= 0) {
            return {
                success: false,
                message: "Invalid invoice amount",
            };
        }

        // ✅ Find user
        const user = await usersModel.findOne({ email: userEmail });
        if (!user) {
            return {
                success: false,
                message: "User not found",
            };
        }

        // ✅ Verify invoice exists and is pending
        // Using clientInfo.email since invoice schema doesn't have direct userEmail field
        const invoice = await InvoiceModel.findOne({
            _id: invoiceId,
            'clientInfo.email': userEmail,
            status: { $in: ['sent', 'viewed', 'draft','overdue'] }
        });

        if (!invoice) {
            return {
                success: false,
                message: "Invoice not found or already paid",
            };
        }

        // ✅ Generate order details
        const orderNumber = generateOrderNumber();
        const transactionId = generateTransactionId();

        // ✅ Create order in database
        const order = new invoiceOrderModel({
            orderNumber: orderNumber,
            userEmail: userEmail,
            userId: user._id,
            orderType: 'invoice',

            // Invoice Details
            invoiceId: invoiceId,
            invoiceNumber: invoiceNumber || invoice.invoiceNumber,
            invoiceAmount: amount,
            description: description || invoice.additionalNotes || 'Invoice Payment',

            // Payment Details
            subtotal: invoice.subtotal || amount,
            taxAmount: invoice.taxTotal || 0,
            discountAmount: invoice.discountTotal || 0,
            totalAmount: amount,
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
                organisation: billingInfo.organisation || billingInfo.company || invoice.clientInfo?.organisation || "",
                streetAddress: billingInfo.address || billingInfo.streetAddress || "",
                city: billingInfo.city || "",
                postalCode: billingInfo.postalCode || "",
                country: billingInfo.country || "",
                taxNumber: billingInfo.taxNumber || "",
            },

            // Invoice Items
            items: items || invoice.items || [],

            // User Info Snapshot
            user: {
                name: `${billingInfo.firstName} ${billingInfo.lastName}`,
                email: billingInfo.email,
            },

            // Status History
            statusHistory: [{
                status: 'pending',
                timestamp: new Date(),
                note: 'Invoice order created - awaiting payment',
            }],

            // PayFast Response (initially empty)
            payfast: {},

            // Timestamps
            paidAt: null,
            cancelledAt: null,
            refundedAt: null,
        });

        await order.save();

        // ✅ Prepare PayFast payment data
        const paymentData = preparePayFastDataInvoice({
            amount: amount,
            email: billingInfo.email,
            firstName: billingInfo.firstName,
            lastName: billingInfo.lastName,
            orderNumber: orderNumber,
            transactionId: transactionId,
        });

        return {
            success: true,
            message: "Invoice payment initiated successfully",
            data: {
                paymentUrl: INVOICE_PAYFAST_CONFIG.paymentUrl,
                paymentData: paymentData,
                transactionId: transactionId,
                orderNumber: orderNumber,
                orderId: order._id,
                invoiceId: invoiceId,
                invoiceNumber: invoiceNumber || invoice.invoiceNumber,
                amount: amount,
            },
        };

    } catch (error: any) {
        console.error('❌ Initiate Invoice Payment Error:', error);

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
// 2. HANDLE INVOICE PAYMENT NOTIFICATION SERVICE
// ============================================
export const handleCreditPaymentNotificationService = async (payload: any, res: Response) => {
    try {
        const data = payload;
        console.log("📩 PayFast ITN Received for Invoice:", data);

        const paymentStatus = data.payment_status;
        const transactionId = data.m_payment_id;
        const pfPaymentId = data.pf_payment_id;
        const orderNumber = data.custom_str1 || "";

        // ✅ Find order
        let order = await invoiceOrderModel.findOne({
            $or: [
                { transactionId: transactionId },
                { orderNumber: orderNumber }
            ]
        } as any);

        if (!order) {
            console.error("❌ Invoice order not found for:", { transactionId, orderNumber });
            return {
                success: false,
                message: "Invoice order not found.",
            };
        }

        // ✅ Handle COMPLETE payment
        if (paymentStatus === "COMPLETE") {
            try {
                // ✅ 1. Update order status
                const updatedOrder = await invoiceOrderModel.findByIdAndUpdate(
                    order._id,
                    {
                        status: 'paid',
                        paidAt: new Date(),
                        'payfast.paymentId': pfPaymentId,
                        'payfast.transactionId': transactionId,
                        'payfast.status': paymentStatus,
                        'payfast.amount': Number(data.amount_gross || order.totalAmount),
                        $push: {
                            statusHistory: {
                                status: 'paid',
                                timestamp: new Date(),
                                note: 'Invoice payment completed successfully',
                            }
                        }
                    },
                    { new: true }
                );

                console.log(`✅ Invoice payment completed for order: ${order.orderNumber}`);

                // ✅ 2. UPDATE INVOICE STATUS TO PAID
                const invoice = await InvoiceModel.findById(order.invoiceId);

                if (invoice) {
                    // Use the instance method markAsPaid if available
                    if (typeof invoice.markAsPaid === 'function') {
                        await invoice.markAsPaid();
                    } else {
                        // Fallback to direct update
                        await InvoiceModel.findByIdAndUpdate(
                            invoice._id,
                            {
                                status: 'paid',
                                paidAt: new Date(),
                            }
                        );
                    }

                    console.log(`✅ Invoice ${invoice.invoiceNumber} marked as paid`);
                } else {
                    console.warn(`⚠️ Invoice not found: ${order.invoiceId}`);
                }

                // ✅ 3. Update user's order history (optional)
                const user = await usersModel.findOne({ email: order.userEmail });

                if (user) {
                    await usersModel.findByIdAndUpdate(
                        user._id,
                        {
                            $push: {
                                orderHistory: {
                                    orderNumber: order.orderNumber,
                                    type: 'invoice',
                                    invoiceId: order.invoiceId,
                                    amount: order.totalAmount,
                                    date: new Date(),
                                }
                            }
                        }
                    );
                    console.log(`✅ User order history updated for: ${user.email}`);
                }

                return {
                    success: true,
                    message: "Invoice payment completed successfully",
                    data: {
                        orderNumber: order.orderNumber,
                        invoiceNumber: order.invoiceNumber,
                        status: 'paid',
                        amount: order.totalAmount,
                    },
                };

            } catch (error: any) {
                console.error('❌ Error processing invoice payment:', error);

                // ✅ Mark order as failed
                await invoiceOrderModel.findByIdAndUpdate(
                    order._id,
                    {
                        status: 'failed',
                        notes: `Failed to process payment: ${error.message}`,
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
                    message: 'Failed to process invoice payment',
                    error: error.message,
                };
            }
        }

        // ✅ Handle PENDING payment
        if (paymentStatus === "PENDING") {
            await invoiceOrderModel.findByIdAndUpdate(
                order._id,
                {
                    status: 'pending',
                    'payfast.status': paymentStatus,
                    $push: {
                        statusHistory: {
                            status: 'pending',
                            timestamp: new Date(),
                            note: 'Invoice payment pending',
                        }
                    }
                },
                { new: true }
            );
            console.log("⏳ Invoice payment pending for order:", order.orderNumber);

            return {
                success: true,
                message: "Invoice payment pending",
                data: { orderNumber: order.orderNumber, status: 'pending' },
            };
        }

        // ✅ Handle FAILED or CANCELLED payment
        if (paymentStatus === "FAILED" || paymentStatus === "CANCELLED") {
            await invoiceOrderModel.findByIdAndUpdate(
                order._id,
                {
                    status: 'failed',
                    'payfast.status': paymentStatus,
                    $push: {
                        statusHistory: {
                            status: 'failed',
                            timestamp: new Date(),
                            note: `Invoice payment ${paymentStatus.toLowerCase()}`,
                        }
                    }
                },
                { new: true }
            );
            console.log(`❌ Invoice payment ${paymentStatus.toLowerCase()} for order:`, order.orderNumber);

            return {
                success: true,
                message: `Invoice payment ${paymentStatus.toLowerCase()}`,
                data: { orderNumber: order.orderNumber, status: 'failed' },
            };
        }

        return {
            success: true,
            message: "Invoice payment notification processed",
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
// 3. GET INVOICE ORDER STATUS SERVICE
// ============================================
export const getCreditOrderStatusService = async (
  orderId: string,
  body: any,
  res: Response
) => {
    try {
        const order = await invoiceOrderModel.findOne({
            $or: [
                { orderNumber: orderId }
            ]
        });

        if (!order) {
            return {
                success: false,
                message: "Invoice order not found",
                data: null,
            };
        }

        return {
            success: true,
            message: "Invoice order status fetched successfully",
            data: {
                orderNumber: order.orderNumber,
                invoiceNumber: order.invoiceNumber,
                status: order.status,
                amount: order.totalAmount,
                paidAt: order.paidAt,
                createdAt: order.createdAt,
            },
        };

    } catch (error: any) {
        console.error("Error fetching invoice order status:", error);
        return {
            success: false,
            message: error.message || "Failed to fetch order status",
            data: null,
        };
    }
};

// ============================================
// 4. GET INVOICE ORDER SERVICE
// ============================================
export const getCreditOrderService = async (
    id: string,
    body: any,
    res: Response
) => {
    try {
        const order = await invoiceOrderModel.findOne({ orderNumber: id });

        if (!order) {
            return {
                success: false,
                message: "Invoice order not found",
                data: null,
            };
        }

        return {
            success: true,
            message: "Invoice order fetched successfully",
            data: order,
        };

    } catch (error: any) {
        console.error("Error fetching invoice order:", error);
        return {
            success: false,
            message: error.message || "Failed to fetch order",
            data: null,
        };
    }
};

// ============================================
// 5. GET USER INVOICE ORDERS SERVICE
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

        const orders = await invoiceOrderModel.find({
            userEmail: email,
        }).sort({ createdAt: -1 });

        // Format orders for response
        const formattedOrders = orders.map(order => ({
            orderNumber: order.orderNumber,
            transactionId: order.transactionId,
            invoiceNumber: order.invoiceNumber,
            amount: order.totalAmount,
            status: order.status,
            paidAt: order.paidAt,
            createdAt: order.createdAt,
            billingInfo: {
                firstName: order.billingInfo?.firstName,
                lastName: order.billingInfo?.lastName,
                email: order.billingInfo?.email,
            },
        }));

        return {
            success: true,
            message: "Invoice orders fetched successfully",
            data: formattedOrders,
        };

    } catch (error: any) {
        console.error("Error fetching invoice orders:", error);
        return {
            success: false,
            message: error.message || "Failed to fetch orders",
            data: [],
        };
    }
};