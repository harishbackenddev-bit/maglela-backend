// controllers/schedule/schedule.controller.ts
import { Request, Response } from "express";
import { httpStatusCode } from "../../../lib/constant";
import { errorParser } from "../../../lib/errors/error-response-handler";
import {
    getEventsService,
    getEventByIdService,
    createEventService,
    updateEventService,
    deleteEventService,
    getEventsByMonthService,
    getTodayEventsService,
    getAvailabilityService,
    createOrUpdateAvailabilityService,
    getAvailabilityByUserService
} from "../../../services/admin/schedule/schedule";

// ============================================
// EVENT CONTROLLERS
// ============================================

// 1. GET ALL EVENTS
export const getEvents = async (req: Request, res: Response) => {
    try {
        const userId = (req as any).currentUser;
        const { startDate, endDate, status } = req.query;

        const response = await getEventsService(
            userId,
            startDate as string,
            endDate as string,
            status as string
        );

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

// 2. GET EVENTS BY MONTH
export const getEventsByMonth = async (req: Request, res: Response) => {
    try {
        const userId = (req as any).currentUser;
        const { month, year } = req.query;

        const response = await getEventsByMonthService(
            userId,
            parseInt(month as string),
            parseInt(year as string)
        );

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

// 3. GET TODAY'S EVENTS
export const getTodayEvents = async (req: Request, res: Response) => {
    try {
        const userId = (req as any).currentUser;
        const response = await getTodayEventsService(userId);

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

// 4. GET EVENT BY ID
export const getEventById = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const response = await getEventByIdService(id);

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

// 5. CREATE EVENT
export const createEvent = async (req: Request, res: Response) => {
    try {

        const payload = req.body;
        const userId = (req as any).currentUser;

        const response = await createEventService(payload, userId);

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

// 6. UPDATE EVENT
export const updateEvent = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const payload = req.body;

        const response = await updateEventService(id, payload);

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

// 7. DELETE EVENT
export const deleteEvent = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;

        const response = await deleteEventService(id);

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
// AVAILABILITY CONTROLLERS
// ============================================

// 1. GET AVAILABILITY
export const getAvailability = async (req: Request, res: Response) => {
    try {
        const userId = (req as any).currentUser;
        const response = await getAvailabilityService(userId);

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

// 2. CREATE OR UPDATE AVAILABILITY
export const createOrUpdateAvailability = async (req: Request, res: Response) => {
    try {
        const userId = (req as any).currentUser;
        const payload = req.body;

        const response = await createOrUpdateAvailabilityService(
            payload,
            userId
        );

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

// 3. GET AVAILABILITY BY USER
export const getAvailabilityByUser = async (req: Request, res: Response) => {
    try {
        const { email } = req.params;
        const response = await getAvailabilityByUserService(email);

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