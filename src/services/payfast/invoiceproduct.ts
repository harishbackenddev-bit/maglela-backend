
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

        
        if (!userEmail || !billingInfo || !invoiceId) {
            return {
                success: false,
                message: "Missing required fields: userEmail, billingInfo, or invoiceId",
            };
        }

        
        if (!billingInfo.firstName || !billingInfo.lastName || !billingInfo.email) {
            return {
                success: false,
                message: "Missing required billing fields: firstName, lastName, or email",
            };
        }

        
        if (!amount || amount <= 0) {
            return {
                success: false,
                message: "Invalid invoice amount",
            };
        }

        
        const user = await usersModel.findOne({ email: userEmail });
        if (!user) {
            return {
                success: false,
                message: "User not found",
            };
        }

        
        
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

        
        const orderNumber = generateOrderNumber();
        const transactionId = generateTransactionId();

        
        const order = new invoiceOrderModel({
            orderNumber: orderNumber,
            userEmail: userEmail,
            userId: user._id,
            orderType: 'invoice',

            
            invoiceId: invoiceId,
            invoiceNumber: invoiceNumber || invoice.invoiceNumber,
            invoiceAmount: amount,
            description: description || invoice.additionalNotes || 'Invoice Payment',

            
            subtotal: invoice.subtotal || amount,
            taxAmount: invoice.taxTotal || 0,
            discountAmount: invoice.discountTotal || 0,
            totalAmount: amount,
            currency: 'ZAR',
            status: 'pending',
            paymentMethod: 'payfast',
            transactionId: transactionId,

            
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

            
            items: items || invoice.items || [],

            
            user: {
                name: `${billingInfo.firstName} ${billingInfo.lastName}`,
                email: billingInfo.email,
            },

            
            statusHistory: [{
                status: 'pending',
                timestamp: new Date(),
                note: 'Invoice order created - awaiting payment',
            }],

            
            payfast: {},

            
            paidAt: null,
            cancelledAt: null,
            refundedAt: null,
        });

        await order.save();

        
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




export const handleCreditPaymentNotificationService = async (payload: any, res: Response) => {
    try {
        const data = payload;
        console.log("📩 PayFast ITN Received for Invoice:", data);

        const paymentStatus = data.payment_status;
        const transactionId = data.m_payment_id;
        const pfPaymentId = data.pf_payment_id;
        const orderNumber = data.custom_str1 || "";

        
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

        
        if (paymentStatus === "COMPLETE") {
            try {
                
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

                
                const invoice = await InvoiceModel.findById(order.invoiceId);

                if (invoice) {
                    
                    if (typeof invoice.markAsPaid === 'function') {
                        await invoice.markAsPaid();
                    } else {
                        
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