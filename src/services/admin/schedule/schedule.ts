// services/schedule/schedule.service.ts
import { EventModel } from "../../../models/schedule/event-schema";
import { AvailabilityModel } from "../../../models/schedule/availability-schema";
import { Types } from "mongoose";

import { adminModel } from "../../../models/admin/admin-schema";
// ============================================
// EVENT SERVICES
// ============================================

// 1. GET ALL EVENTS
export const getEventsService = async (
    userId: string,
    startDate?: string,
    endDate?: string,
    status?: string
) => {
    try {
        const query: any = { userId: new Types.ObjectId(userId) };

        if (status) {
            query.status = status;
        }

        if (startDate && endDate) {
            query.date = {
                $gte: new Date(startDate),
                $lte: new Date(endDate)
            };
        }

        const events = await EventModel.find(query)
            .sort({ date: 1, startTime: 1 });

        const formattedEvents = events.map(event => ({
            id: event._id,
            title: event.title,
            type: event.type,
            date: event.date,
            startTime: event.startTime,
            endTime: event.endTime,
            location: event.location,
            description: event.description,
            reminder: event.reminder,
            status: event.status,
            createdAt: event.createdAt,
        }));

        return {
            success: true,
            message: "Events fetched successfully",
            data: formattedEvents,
            count: formattedEvents.length
        };

    } catch (error: any) {
        console.error('❌ Get Events Error:', error);
        return {
            success: false,
            message: error.message || 'Failed to fetch events',
            error: error.message
        };
    }
};

// 2. GET EVENTS BY MONTH
export const getEventsByMonthService = async (
    userId: string,
    month: number,
    year: number
) => {
    try {
        const startDate = new Date(year, month, 1);
        const endDate = new Date(year, month + 1, 1);

console.log("userId",userId);
console.log("startDate",startDate);
console.log("endDate",endDate);

        const events = await EventModel.find({
            userId: new Types.ObjectId(userId),
            date: {
                $gte: startDate,
                $lt: endDate
            },
            status: 'scheduled'
        }).sort({ date: 1, startTime: 1 });

        const eventsByDate: Record<string, any[]> = {};
        events.forEach(event => {
            const dateKey = event.date.toISOString().split('T')[0];
            if (!eventsByDate[dateKey]) {
                eventsByDate[dateKey] = [];
            }
            eventsByDate[dateKey].push({
                id: event._id,
                title: event.title,
                type: event.type,
                startTime: event.startTime,
                endTime: event.endTime,
                location: event.location,
            });
        });

        return {
            success: true,
            message: "Events fetched successfully",
            data: eventsByDate,
            count: events.length
        };

    } catch (error: any) {
        console.error('❌ Get Events By Month Error:', error);
        return {
            success: false,
            message: error.message || 'Failed to fetch events',
            error: error.message
        };
    }
};

// 3. GET TODAY'S EVENTS
export const getTodayEventsService = async (userId: string) => {
    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        const events = await EventModel.find({
            userId: new Types.ObjectId(userId),
            date: {
                $gte: today,
                $lt: tomorrow
            },
            status: 'scheduled'
        }).sort({ startTime: 1 });

        const formattedEvents = events.map(event => ({
            id: event._id,
            title: event.title,
            type: event.type,
            startTime: event.startTime,
            endTime: event.endTime,
            location: event.location,
        }));

        return {
            success: true,
            message: "Today's events fetched successfully",
            data: formattedEvents,
            count: formattedEvents.length
        };

    } catch (error: any) {
        console.error('❌ Get Today Events Error:', error);
        return {
            success: false,
            message: error.message || 'Failed to fetch today\'s events',
            error: error.message
        };
    }
};

// 4. GET EVENT BY ID
export const getEventByIdService = async (id: string) => {
    try {
        const event = await EventModel.findById(id);

        if (!event) {
            return {
                success: false,
                message: "Event not found",
                data: null
            };
        }

        return {
            success: true,
            message: "Event fetched successfully",
            data: {
                id: event._id,
                title: event.title,
                type: event.type,
                date: event.date,
                startTime: event.startTime,
                endTime: event.endTime,
                location: event.location,
                description: event.description,
                reminder: event.reminder,
                status: event.status,
            }
        };

    } catch (error: any) {
        console.error('❌ Get Event By ID Error:', error);
        return {
            success: false,
            message: error.message || 'Failed to fetch event',
            error: error.message
        };
    }
};

// 5. CREATE EVENT
export const createEventService = async (
    payload: any,
    userId: string,
) => {
    try {
        const {
            title,
            type,
            date,
            startTime,
            endTime,
            location,
            description,
            reminder,
            status = 'scheduled'
        } = payload;

        console.log("userId",userId);

        if (!title || !date || !startTime) {
            return {
                success: false,
                message: "Missing required fields: title, date, or startTime"
            };
        }

        // Get user email using userId
        const user = await adminModel.findById(userId).select('email');

        if (!user) {
            return {
                success: false,
                message: "User not found"
            };
        }

        const event = new EventModel({
            title,
            type: type || 'Meeting',
            date: new Date(date),
            startTime,
            endTime: endTime || '',
            location: location || '',
            description: description || '',
            reminder: reminder || '10 minutes',
            userId: new Types.ObjectId(userId),
            userEmail: user.email,
            status,
        });

        await event.save();

        return {
            success: true,
            message: "Event created successfully",
            data: {
                id: event._id,
                title: event.title,
                type: event.type,
                date: event.date,
                startTime: event.startTime,
                endTime: event.endTime,
            }
        };

    } catch (error: any) {
        console.error('❌ Create Event Error:', error);

        return {
            success: false,
            message: error.message || 'Failed to create event',
            error: error.message
        };
    }
};

// 6. UPDATE EVENT
export const updateEventService = async (id: string, payload: any) => {
    try {
        const event = await EventModel.findById(id);

        if (!event) {
            return {
                success: false,
                message: "Event not found"
            };
        }

        const updatedEvent = await EventModel.findByIdAndUpdate(
            id,
            { ...payload },
            { new: true, runValidators: true }
        );

        return {
            success: true,
            message: "Event updated successfully",
            data: {
                id: updatedEvent?._id,
                title: updatedEvent?.title,
                type: updatedEvent?.type,
                date: updatedEvent?.date,
                startTime: updatedEvent?.startTime,
                endTime: updatedEvent?.endTime,
            }
        };

    } catch (error: any) {
        console.error('❌ Update Event Error:', error);
        return {
            success: false,
            message: error.message || 'Failed to update event',
            error: error.message
        };
    }
};

// 7. DELETE EVENT
export const deleteEventService = async (id: string) => {
    try {
        const event = await EventModel.findByIdAndDelete(id);

        if (!event) {
            return {
                success: false,
                message: "Event not found"
            };
        }

        return {
            success: true,
            message: "Event deleted successfully"
        };

    } catch (error: any) {
        console.error('❌ Delete Event Error:', error);
        return {
            success: false,
            message: error.message || 'Failed to delete event',
            error: error.message
        };
    }
};

// ============================================
// AVAILABILITY SERVICES
// ============================================

// 1. GET AVAILABILITY
export const getAvailabilityService = async (userId: string) => {
    try {
        const availability = await AvailabilityModel.findOne({
            userId: new Types.ObjectId(userId),
            isActive: true
        });

        if (!availability) {
            return {
                success: true,
                message: "No availability settings found",
                data: null
            };
        }

        return {
            success: true,
            message: "Availability fetched successfully",
            data: {
                id: availability._id,
                mode: availability.mode,
                selectedDays: availability.selectedDays,
                status: availability.status,
                startDate: availability.startDate,
                endDate: availability.endDate,
                startTime: availability.startTime,
                endTime: availability.endTime,
                timezone: availability.timezone,
                timeSlots: availability.timeSlots,
                blockStartDate: availability.blockStartDate,
                blockEndDate: availability.blockEndDate,
                blockStartTime: availability.blockStartTime,
                blockEndTime: availability.blockEndTime,
                blockTimezone: availability.blockTimezone,
                isActive: availability.isActive,
            }
        };

    } catch (error: any) {
        console.error('❌ Get Availability Error:', error);
        return {
            success: false,
            message: error.message || 'Failed to fetch availability',
            error: error.message
        };
    }
};


export const getallAvailabilitiesService = async (payload: any, res: Response) => {
  try {
    const availabilities = await AvailabilityModel
      .find({
        blockStartDate: { $exists: true, $ne: null },
        blockEndDate: { $exists: true, $ne: null }
      })
      .sort({ createdAt: -1 });

    const blockedDates: any[] = [];

    availabilities.forEach((availability) => {
      const startDate = new Date(availability.blockStartDate);
      const endDate = new Date(availability.blockEndDate);

      // Include both start and end dates
      const currentDate = new Date(startDate);

      while (currentDate <= endDate) {
        blockedDates.push({
          date: new Date(currentDate)
        });

        currentDate.setDate(currentDate.getDate() + 1);
      }
    });

    return {
      success: true,
      message: "Blocked dates fetched successfully",
      data: blockedDates,
      count: blockedDates.length
    };

  } catch (error: any) {
    console.error("Error fetching blocked dates:", error);

    return {
      success: false,
      message: error.message || "Failed to fetch blocked dates",
      data: null
    };
  }
};

// 2. CREATE OR UPDATE AVAILABILITY
export const createOrUpdateAvailabilityService = async (
    payload: any,
    userId: string
) => {
    try {
        const {
            mode,
            selectedDays,
            status,
            startDate,
            endDate,
            startTime,
            endTime,
            timezone,
            timeSlots,
            blockStartDate,
            blockEndDate,
            blockStartTime,
            blockEndTime,
            blockTimezone,
            isActive = true
        } = payload;

        // Get user email using userId
        const user = await adminModel.findById(userId).select("email");

        if (!user) {
            return {
                success: false,
                message: "User not found",
                data: null,
            };
        }

        const existing = await AvailabilityModel.findOne({
            userId: new Types.ObjectId(userId)
        });

        const availabilityData = {
            userId: new Types.ObjectId(userId),
            userEmail: user.email,
            mode: mode || "recurring",
            selectedDays: selectedDays || ["Mon", "Tue", "Wed", "Thu", "Fri"],
            status: status || "available",
            startDate: startDate ? new Date(startDate) : null,
            endDate: endDate ? new Date(endDate) : null,
            startTime: startTime || "09:00",
            endTime: endTime || "17:00",
            timezone: timezone || "Africa/Johannesburg",
            timeSlots: timeSlots || [
                {
                    id: "1",
                    startTime: "09:00",
                    endTime: "17:00"
                }
            ],
            blockStartDate: blockStartDate ? new Date(blockStartDate) : null,
            blockEndDate: blockEndDate ? new Date(blockEndDate) : null,
            blockStartTime: blockStartTime || "",
            blockEndTime: blockEndTime || "",
            blockTimezone: blockTimezone || "Africa/Johannesburg",
            isActive,
        };

        let availability;

        if (existing) {
            availability = await AvailabilityModel.findByIdAndUpdate(
                existing._id,
                availabilityData,
                {
                    new: true,
                    runValidators: true
                }
            );

            if (!availability) {
                return {
                    success: false,
                    message: "Failed to update availability",
                    data: null,
                };
            }
        } else {
            availability = new AvailabilityModel(availabilityData);
            await availability.save();
        }

        return {
            success: true,
            message: "Availability saved successfully",
            data: {
                id: availability._id,
                mode: availability.mode,
                selectedDays: availability.selectedDays,
                status: availability.status,
                startTime: availability.startTime,
                endTime: availability.endTime,
                timezone: availability.timezone,
                timeSlots: availability.timeSlots,
            }
        };

    } catch (error: any) {
        console.error("❌ Create/Update Availability Error:", error);

        return {
            success: false,
            message: error.message || "Failed to save availability",
            error: error.message
        };
    }
};

// 3. GET AVAILABILITY BY USER EMAIL
export const getAvailabilityByUserService = async (email: string) => {
    try {
        const availability = await AvailabilityModel.findOne({
            userEmail: email,
            isActive: true
        });

        if (!availability) {
            return {
                success: true,
                message: "No availability settings found for this user",
                data: null
            };
        }

        return {
            success: true,
            message: "Availability fetched successfully",
            data: {
                mode: availability.mode,
                selectedDays: availability.selectedDays,
                status: availability.status,
                startTime: availability.startTime,
                endTime: availability.endTime,
                timezone: availability.timezone,
                timeSlots: availability.timeSlots,
                blockStartDate: availability.blockStartDate,
                blockEndDate: availability.blockEndDate,
                blockStartTime: availability.blockStartTime,
                blockEndTime: availability.blockEndTime,
                blockTimezone: availability.blockTimezone,
            }
        };

    } catch (error: any) {
        console.error('❌ Get Availability By User Error:', error);
        return {
            success: false,
            message: error.message || 'Failed to fetch availability',
            error: error.message
        };
    }
};