// controllers/payfast/credit.controller.ts
import { Request, Response } from "express";
import { httpStatusCode } from "../../lib/constant";
import { errorParser } from "../../lib/errors/error-response-handler";
import {
    initiateCreditPaymentService,
    handleCreditPaymentNotificationService,
    getCreditOrderStatusService
} from "../../services/payfast/invoiceproduct";

// ============================================
// 1. INITIATE CREDIT PAYMENT
// ============================================
export const initiateInvoicePayment = async (req: Request, res: Response) => {
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
export const handleInvoicePaymentNotification = async (req: Request, res: Response) => {
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

export const getInvoiceOrder = async (req: Request, res: Response) => {
    try {
        const response = await getCreditOrderStatusService(req.params.orderId, req.body, res);

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
