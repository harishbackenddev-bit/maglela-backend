import { Router } from "express";
import {
  getDashboardStats, getExperts, updateAExperts, createExperts, deleteAExperts, updateProfile, getAllUsers,
  getAllworkshop, updateAworkshop, getAworkshop, updateAPassword, getAllprojects, getAproject, updateAproject,
  getPlans, createPlans, deleteAPlans, updateAPlans, createSubscriptionPlans, updateASubscriptionPlans, deleteASubscriptionPlans,
  getSubscriptionPlans, getNotifications
} from "../controllers/admin/admin";
import { upload } from "../config/multer";
import { checkMulter } from "../lib/errors/error-response-handler"
import { checkAuth } from "src/middleware/check-auth";
import {
  createQuote,
  getQuotes,
  getQuote,
  updateQuote,
  deleteQuote,
  sendQuote,
  saveDraftQuote,
  updateQuoteStatus,
} from "../controllers/admin/invoice/quote";

import {
  createInvoice,
  getInvoices,
  getInvoice,
  updateInvoice,
  deleteInvoice,
  sendInvoice,
  saveDraftInvoice,
  updateInvoiceStatus,
} from "../controllers/admin/invoice/invoice";

import {
    getEvents,
    getEventById,
    createEvent,
    updateEvent,
    deleteEvent,
    getEventsByMonth,
    getTodayEvents,
    getAvailability,
    createOrUpdateAvailability,
    getAvailabilityByUser
} from '../controllers/admin/schedule/schedule';

const router = Router();

router.route("/experts").get(getExperts).post(checkAuth, createExperts)
router.route("/experts/:id").patch(checkAuth, updateAExperts).delete(checkAuth, deleteAExperts)
router.get("/dashboard", checkAuth, getDashboardStats)
router.get("/notifications", checkAuth, getNotifications)
router.route("/workshops").get(getAllworkshop)
router.route("/workshops/:id").put(checkAuth, updateAworkshop).get(checkAuth, getAworkshop)
router.route("/update-profile").patch(checkAuth, updateProfile)
router.route("/updatedetails").put(checkAuth, updateProfile)
router.route("/change-password").post(checkAuth, updateAPassword)
router.route("/projects").get(getAllprojects)
router.route("/projects/:id").put(checkAuth, updateAproject).get(checkAuth, getAproject)


router.route("/users").get(getAllUsers)

router.route("/plans").get(getPlans).post(checkAuth, createPlans)
router.route("/plans/:id").patch(checkAuth, updateAPlans).delete(checkAuth, deleteAPlans)

router.route("/subscription-plans").get(getSubscriptionPlans).post(checkAuth, createSubscriptionPlans)
router.route("/subscription-plans/:id").patch(checkAuth, updateASubscriptionPlans).delete(checkAuth, deleteASubscriptionPlans)

// Create quote
router.route("/quotes").get(checkAuth, getQuotes).post(checkAuth, createQuote);

// Save as draft
router.route("/quotes/draft").post(checkAuth, saveDraftQuote);

// Send quote
router.route("/quotes/:id/send").patch(checkAuth, sendQuote);

// Update quote status
router.route("/quotes/:id/status").patch(checkAuth, updateQuoteStatus);

// Get, update, delete single quote
router.route("/quotes/:id").get(checkAuth, getQuote).put(checkAuth, updateQuote).delete(checkAuth, deleteQuote);

// Create invoice
router.route("/invoices").get(getInvoices).post(createInvoice);

// Save as draft
router.route("/invoices/draft").post(saveDraftInvoice);

// Send invoice
router.route("/invoices/:id/send").patch(sendInvoice);

// Update invoice status
router.route("/invoices/:id/status").patch(updateInvoiceStatus);

// Get, update, delete single invoice
router.route("/invoices/:id").get(getInvoice).put(updateInvoice).delete(deleteInvoice);




// ============================================
// EVENT ROUTES
// ============================================

// Get events with filters
router.route("/events").get(checkAuth, getEvents);

// Get events by month (query params: month, year)
router.route("/events/month").get(checkAuth, getEventsByMonth);

// Get today's events
router.route("/events/today").get(checkAuth, getTodayEvents);

// Create event
router.route("/events").post(checkAuth, createEvent);

// Get, update, delete single event
router.route("/events/:id")
    .get(checkAuth, getEventById)
    .put(checkAuth, updateEvent)
    .delete(checkAuth, deleteEvent);

// ============================================
// AVAILABILITY ROUTES
// ============================================

// Get user availability
router.route("/availability").get(checkAuth, getAvailability);

// Create or update availability
router.route("/availability").post(checkAuth, createOrUpdateAvailability);

// Get availability by user email
router.route("/availability/user/:email").get(checkAuth, getAvailabilityByUser);




export { router }