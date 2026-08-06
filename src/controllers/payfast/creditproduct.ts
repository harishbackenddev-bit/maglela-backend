// controllers/payfast/credit.controller.ts
import { Request, Response } from "express";
import { httpStatusCode } from "../../lib/constant";
import { errorParser } from "../../lib/errors/error-response-handler";
import {
    initiateCreditPaymentService,
    handleCreditPaymentNotificationService,
    getCreditOrderStatusService,
    getCreditOrderService,
    getUserCreditOrdersService,
} from "../../services/payfast/creditproduct";

// ============================================
// 1. INITIATE CREDIT PAYMENT
// ============================================
export const initiateCreditPayment = async (req: Request, res: Response) => {
    try {
        const response = await initiateCreditPaymentService(req.body, req, res);

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
// 2. HANDLE CREDIT PAYMENT NOTIFICATION
// ============================================
export const handleCreditPaymentNotification = async (req: Request, res: Response) => {
    try {
        const response = await handleCreditPaymentNotificationService(req.body, res);

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
// 3. GET CREDIT ORDER STATUS
// ============================================
export const getCreditOrderStatus = async (req: Request, res: Response) => {
    try {
        const { orderId } = req.params;
        const response = await getCreditOrderStatusService(orderId);

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
// 4. GET CREDIT ORDER BY ID
// ============================================
export const getCreditOrder = async (req: Request, res: Response) => {
    try {
        const response = await getCreditOrderService(req.params.orderId, req.body, res);

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
// 5. GET USER CREDIT ORDERS
// ============================================
export const getUserCreditOrders = async (req: Request, res: Response) => {
    try {
        const { email } = req.params;
        const response = await getUserCreditOrdersService(email);

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