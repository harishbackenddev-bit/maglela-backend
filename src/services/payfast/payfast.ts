// services/payfast/payfast.service.ts
import { Request, Response } from "express";
import { errorResponseHandler } from "../../lib/errors/error-response-handler";
import { httpStatusCode } from "../../lib/constant";
import {
  generateOrderNumber,
  generateTransactionId,
  preparePayFastData,
  formatOrderResponse,
} from '../../utils/payfast.utils';
import { orderModel } from "../../models/orders/order-schema";
import { PAYFAST_CONFIG } from "../../config/payfast.config";
import { sendOrderConfirmationEmail, sendAdminOrderNotification } from "../../utils/mails/orders/orderconfirmation";
import { getPDFFileInfoById } from "./product-mapping";
import { getToolkitFileInfoById } from "./user-product-mapping";

// ============================================
// INITIATE PAYMENT SERVICE
// ============================================
export const initiatePaymentService = async (payload: any, req: Request, res: Response) => {
  const {
    userEmail,
    billingInfo,
    items,
    totalAmount
  } = payload;

  if (!userEmail || !billingInfo || !items || items.length === 0) {
    return errorResponseHandler(
      "Missing required fields: userEmail, billingInfo, or items",
      httpStatusCode.BAD_REQUEST,
      res
    );
  }

  try {
    const orderNumber = generateOrderNumber();
    const transactionId = generateTransactionId();

    // ✅ Check if token exists in headers
    const token = req.headers.authorization;
    const isAuthenticated = token && token.startsWith('Bearer ');
    
    console.log('🔍 Auth check:', { isAuthenticated, hasToken: !!token });

    // ✅ Calculate totals and get PDF file info by product ID
    let subtotal = 0;
    const orderItems = items.map((item: any) => {
      const itemSubtotal = item.price * item.quantity;
      subtotal += itemSubtotal;
      
      let fileInfo = null;
      
      // ✅ If authenticated, try toolkit mapping first
      if (isAuthenticated) {
        // Check if it's a toolkit product (you can add a flag or check based on productId range)
        // For now, we'll check both mappings
        fileInfo = getToolkitFileInfoById(item.productId);
        
      } else {
        // ✅ If not authenticated, use regular product mapping only
        fileInfo = getPDFFileInfoById(item.productId);
      }
      
      return {
        productId: item.productId,
        title: item.title,
        price: item.price,
        quantity: item.quantity,
        subtotal: itemSubtotal,
        fileUrl: fileInfo?.fileUrl || `/uploads/pdfs/${item.productId}-default.pdf`,
        fileName: fileInfo?.fileName || `${item.title}.pdf`
      };
    });

    const taxAmount = subtotal * 0.15; // 15% VAT
    const totalWithTax = subtotal + taxAmount;

    // Create order with file info
    const order = new orderModel({
      orderNumber: orderNumber,
      userEmail: userEmail,
      items: orderItems,
      totalAmount: totalWithTax,
      taxAmount: taxAmount,
      billingInfo: billingInfo,
      status: 'pending',
      paymentMethod: 'payfast',
      transactionId: transactionId,
    });

    await order.save();

    const paymentData = preparePayFastData({
      amount: totalWithTax,
      email: billingInfo.email,
      firstName: billingInfo.firstName,
      lastName: billingInfo.lastName,
      orderNumber: orderNumber,
      transactionId: transactionId,
    });

    return {
      success: true,
      message: "Payment initiated successfully",
      paymentUrl: PAYFAST_CONFIG.paymentUrl,
      paymentData: paymentData,
      transactionId: transactionId,
      orderNumber: orderNumber,
      orderId: order._id,
    };

  } catch (error: any) {
    console.error('Initiate Payment Error:', error);
    return {
      success: false,
      message: error.message || 'Payment initiation failed',
    };
  }
};

// ============================================
// HANDLE PAYFAST NOTIFICATION SERVICE
// ============================================
export const handlePayfastNotificationService = async (payload: any, res: Response) => {
  try {
    const data = payload;
    console.log("📩 PayFast ITN Received:", data);

    const paymentStatus = data.payment_status;
    const transactionId = data.m_payment_id;
    const pfPaymentId = data.pf_payment_id;
    const amount = Number(data.amount_gross || 0);

    if (isNaN(amount)) {
      throw new Error("Invalid payment amount received from PayFast.");
    }

    const orderNumber = data.custom_str1 || "";

    let order = await orderModel.findOne({
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

    // ✅ If payment is COMPLETE
    if (paymentStatus === "COMPLETE") {
      // ✅ Create download links with file info from order items
      const downloadLinks = order.items.map((item: any) => {
        // Use file info already stored in order items
        const fileUrl = item.fileUrl || `/uploads/pdfs/${item.productId}-default.pdf`;
        const fileName = item.fileName || `${item.title}.pdf`;
        
        return {
          productId: String(item.productId),
          link: fileUrl,
          fileName: fileName,
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
        };
      });

      // Update order
      const updatedOrder = await orderModel.findByIdAndUpdate(
        order._id,
        {
          status: 'paid',
          'payfast.paymentId': pfPaymentId,
          'payfast.transactionId': transactionId,
          'payfast.status': paymentStatus,
          downloadLinks: downloadLinks
        },
        { new: true }
      );

      console.log(`✅ Payment completed for order:`, order.orderNumber);

      // ✅ Send confirmation email to user with null checks
      try {
        const billingInfo = order.billingInfo;
        if (billingInfo) {
          const fullName = billingInfo.firstName && billingInfo.lastName
            ? `${billingInfo.firstName} ${billingInfo.lastName}`.trim()
            : 'Valued Customer';

          const emailTo = billingInfo.email || '';

          if (emailTo) {
            // ✅ Map items with file info
            const mappedItems = order.items.map((item: any) => ({
              productId: String(item.productId),
              title: String(item.title),
              price: Number(item.price),
              quantity: Number(item.quantity),
              subtotal: Number(item.subtotal),
              fileUrl: String(item.fileUrl || ''),
              fileName: String(item.fileName || '')
            }));

            // ✅ Map download links with file names
            const mappedDownloadLinks = downloadLinks.map((link: any) => ({
              productId: String(link.productId),
              link: String(link.link),
              fileName: String(link.fileName),
              expiresAt: new Date(link.expiresAt)
            }));

            await sendOrderConfirmationEmail({
              to: emailTo,
              name: fullName,
              orderNumber: order.orderNumber,
              items: mappedItems,
              totalAmount: `R${order.totalAmount.toFixed(2)}`,
              downloadLinks: mappedDownloadLinks,
            });

            console.log(`✅ Confirmation email sent to: ${billingInfo.email}`);
          } else {
            console.warn('⚠️ No email address found for order:', order.orderNumber);
          }
        } else {
          console.warn('⚠️ No billing info found for order:', order.orderNumber);
        }
      } catch (emailError) {
        console.error('❌ Failed to send confirmation email:', emailError);
      }

      // ✅ Send admin notification
      try {
        const billingInfo = order.billingInfo;
        const fullName = billingInfo && billingInfo.firstName && billingInfo.lastName
          ? `${billingInfo.firstName} ${billingInfo.lastName}`.trim()
          : 'Valued Customer';

        // ✅ Map items for admin notification
        const mappedItems = order.items.map((item: any) => ({
          productId: String(item.productId),
          title: String(item.title),
          price: Number(item.price),
          quantity: Number(item.quantity),
          subtotal: Number(item.subtotal),
          fileUrl: String(item.fileUrl || ''),
          fileName: String(item.fileName || '')
        }));

        await sendAdminOrderNotification({
          orderNumber: order.orderNumber,
          name: fullName,
          email: billingInfo?.email || 'N/A',
          items: mappedItems,
          totalAmount: `R${order.totalAmount.toFixed(2)}`,
          transactionId: transactionId,
        });
        console.log(`✅ Admin notification sent for order: ${order.orderNumber}`);
      } catch (adminError) {
        console.error('❌ Failed to send admin notification:', adminError);
      }
    }

    // ✅ If payment is PENDING
    if (paymentStatus === "PENDING") {
      await orderModel.findByIdAndUpdate(
        order._id,
        {
          status: 'pending',
          'payfast.status': paymentStatus,
        },
        { new: true }
      );
      console.log("⏳ Payment pending for order:", order.orderNumber);
    }

    // ✅ If payment is FAILED or CANCELLED
    if (
      paymentStatus === "FAILED" ||
      paymentStatus === "CANCELLED"
    ) {
      await orderModel.findByIdAndUpdate(
        order._id,
        {
          status: 'failed',
          'payfast.status': paymentStatus,
        },
        { new: true }
      );
      console.log("❌ Payment failed for order:", order.orderNumber);
    }

    return {
      success: true,
      message: "Payment notification processed successfully.",
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
// GET ORDER PAYMENT STATUS SERVICE
// ============================================
export const getOrderPaymentStatusService = async (
  id: string,
  body: any,
  res: Response
) => {
  try {
    const order = await orderModel.findOne({ orderNumber: id });

    if (!order) {
      return {
        success: false,
        message: "Order not found",
        data: null,
      };
    }

    const formattedOrder = formatOrderResponse(order);

    return {
      success: true,
      message: "Order status fetched successfully",
      data: formattedOrder,
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
// GET ORDER SERVICE
// ============================================
export const getOrderService = async (
  id: string,
  body: any,
  res: Response
) => {
  try {
    const order = await orderModel.findOne({ orderNumber: id });

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
// DOWNLOAD PRODUCT SERVICE
// ============================================
export const downloadProductService = async (
  orderNumber: string,
  productId: string,
  res: Response
) => {
  try {
    const order = await orderModel.findOne({ orderNumber });

    if (!order) {
      return {
        success: false,
        message: "Order not found",
      };
    }

    // Check if order is paid
    if (order.status !== 'paid' && order.status !== 'completed') {
      return {
        success: false,
        message: "Order not paid. Please complete payment first.",
      };
    }

    // Find the item in order by product ID
    const orderItem = order.items.find(
      (item: any) => item.productId === productId
    );

    if (!orderItem) {
      return {
        success: false,
        message: "Product not found in this order",
      };
    }

    // ✅ Ensure fileUrl is always a string with fallback
    const fileUrl = orderItem.fileUrl || `/uploads/pdfs/${productId}-default.pdf`;
    const fileName = orderItem.fileName || `${orderItem.title || 'product'}.pdf`;

    return {
      success: true,
      message: "Download ready",
      fileUrl: fileUrl, // ✅ Always a string
      fileName: fileName, // ✅ Always a string
      orderNumber: orderNumber,
      productId: productId,
    };

  } catch (error: any) {
    console.error("Error downloading product:", error);
    return {
      success: false,
      message: error.message || "Failed to download product",
    };
  }
};