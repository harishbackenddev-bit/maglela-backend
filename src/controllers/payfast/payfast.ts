// controllers/payfast/payfast.controller.ts
import { Request, Response } from "express";
import { httpStatusCode } from "../../lib/constant";
import { errorParser } from "../../lib/errors/error-response-handler";
import {
  initiatePaymentService,
  handlePayfastNotificationService,
  getOrderPaymentStatusService,
  getOrderService,
  downloadProductService,
} from "../../services/payfast/payfast";
import { orderModel } from "../../models/orders/order-schema";
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url'; // ✅ Import for ES modules

// ✅ Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ============================================
// INITIATE PAYMENT CONTROLLER
// ============================================
export const initiatePayment = async (req: Request, res: Response) => {
  try {
    const response: any = await initiatePaymentService(req.body, req, res);
    
    if (!response.success) {
      return res.status(httpStatusCode.BAD_REQUEST).json(response);
    }

    return res.status(httpStatusCode.CREATED).json(response);
  } catch (error: any) {
    const { code, message } = errorParser(error);
    return res.status(code || httpStatusCode.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: message || "An error occurred"
    });
  }
};

// ============================================
// HANDLE PAYFAST NOTIFICATION CONTROLLER
// ============================================
export const handlePayfastNotification = async (req: Request, res: Response) => {
  try {
    const response = await handlePayfastNotificationService(req.body, res);

    if (!response.success) {
      return res.status(httpStatusCode.BAD_REQUEST).json(response);
    }

    return res.status(httpStatusCode.OK).json(response);
  } catch (error: any) {
    const { code, message } = errorParser(error);
    return res.status(code || httpStatusCode.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: message || "An error occurred"
    });
  }
};

// ============================================
// GET ORDER PAYMENT STATUS CONTROLLER
// ============================================
export const getOrderPaymentStatus = async (req: Request, res: Response) => {
  try {
    const response = await getOrderPaymentStatusService(req.params.orderId, req.body, res);

    if (!response.success) {
      return res.status(httpStatusCode.NOT_FOUND).json(response);
    }

    return res.status(httpStatusCode.OK).json(response);
  } catch (error: any) {
    const { code, message } = errorParser(error);
    return res.status(code || httpStatusCode.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: message || "An error occurred"
    });
  }
};

// ============================================
// GET ORDER CONTROLLER
// ============================================
export const getOrder = async (req: Request, res: Response) => {
  try {
    const response = await getOrderService(req.params.orderId, req.body, res);

    if (!response.success) {
      return res.status(httpStatusCode.NOT_FOUND).json(response);
    }

    return res.status(httpStatusCode.OK).json(response);
  } catch (error: any) {
    const { code, message } = errorParser(error);
    return res.status(code || httpStatusCode.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: message || "An error occurred"
    });
  }
};

// ============================================
// GET USER ORDERS CONTROLLER
// ============================================
export const getUserOrders = async (req: Request, res: Response) => {
  try {
    const { email } = req.params;
    
    if (!email) {
      return res.status(httpStatusCode.BAD_REQUEST).json({
        success: false,
        message: "Email is required"
      });
    }

    const orders = await orderModel.find({ userEmail: email })
      .sort({ createdAt: -1 });

    return res.status(httpStatusCode.OK).json({
      success: true,
      message: "Orders fetched successfully",
      data: orders
    });
  } catch (error: any) {
    const { code, message } = errorParser(error);
    return res.status(code || httpStatusCode.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: message || "An error occurred"
    });
  }
};

// ============================================
// DOWNLOAD PRODUCT CONTROLLER
// ============================================
export const downloadProduct = async (req: Request, res: Response) => {
  try {
    const { orderNumber, productId } = req.params;
    
    if (!orderNumber || !productId) {
      return res.status(httpStatusCode.BAD_REQUEST).json({
        success: false,
        message: "Order number and product ID are required"
      });
    }

    const order = await orderModel.findOne({ orderNumber });

    if (!order) {
      return res.status(httpStatusCode.NOT_FOUND).json({
        success: false,
        message: "Order not found"
      });
    }

    // Check if order is paid
    if (order.status !== 'paid' && order.status !== 'completed') {
      return res.status(httpStatusCode.FORBIDDEN).json({
        success: false,
        message: "Order not paid. Please complete payment first.",
        orderStatus: order.status
      });
    }

    // Find the item in order by product ID
    const orderItem = order.items.find(
      (item: any) => item.productId === productId
    );

    if (!orderItem) {
      return res.status(httpStatusCode.NOT_FOUND).json({
        success: false,
        message: "Product not found in this order"
      });
    }

    // Get file info from order item
    const fileUrl = orderItem.fileUrl;
    const fileName = orderItem.fileName || `${orderItem.title}.pdf`;

    if (!fileUrl) {
      return res.status(httpStatusCode.NOT_FOUND).json({
        success: false,
        message: "File URL not found for this product"
      });
    }

    // ✅ Construct full file path using __dirname
    const fullPath = path.join(__dirname, '../../public', fileUrl);
    
    console.log('📁 Looking for file at:', fullPath); // Debug log
    
    // Check if file exists
    if (!fs.existsSync(fullPath)) {
      return res.status(httpStatusCode.NOT_FOUND).json({
        success: false,
        message: "File not found on server",
        path: fullPath
      });
    }

    // Send file for download
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    res.setHeader('Content-Length', fs.statSync(fullPath).size);
    
    const fileStream = fs.createReadStream(fullPath);
    fileStream.pipe(res);

  } catch (error: any) {
    const { code, message } = errorParser(error);
    return res.status(code || httpStatusCode.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: message || "An error occurred"
    });
  }
};


// ============================================
// CANCEL ORDER CONTROLLER - SIMPLIFIED
// ============================================
export const cancelOrder = async (req: Request, res: Response) => {
  try {
    const { orderId } = req.params;

    if (!orderId) {
      return res.status(httpStatusCode.BAD_REQUEST).json({
        success: false,
        message: "Order ID is required"
      });
    }

    // Find order by ID or orderNumber
    const order = await orderModel.findOne({
      $or: [
        { _id: orderId },
        { orderNumber: orderId }
      ]
    });

    if (!order) {
      return res.status(httpStatusCode.NOT_FOUND).json({
        success: false,
        message: "Order not found"
      });
    }

    // Check if order can be cancelled
    if (order.status === 'paid' || order.status === 'completed') {
      return res.status(httpStatusCode.BAD_REQUEST).json({
        success: false,
        message: "Cannot cancel a paid order"
      });
    }

    if (order.status === 'cancelled') {
      return res.status(httpStatusCode.BAD_REQUEST).json({
        success: false,
        message: "Order is already cancelled"
      });
    }

    // ✅ Simply update status to cancelled
    const updatedOrder = await orderModel.findByIdAndUpdate(
      order._id,
      {
        status: 'cancelled'
      },
      { new: true }
    );

    console.log(`✅ Order ${order.orderNumber} cancelled`);

    return res.status(httpStatusCode.OK).json({
      success: true,
      message: "Order cancelled successfully",
      data: updatedOrder
    });

  } catch (error: any) {
    const { code, message } = errorParser(error);
    return res.status(code || httpStatusCode.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: message || "An error occurred"
    });
  }
};