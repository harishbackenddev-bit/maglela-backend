import { Router } from "express";
import {
  getDashboardStats, getExperts, updateAExperts, createExperts, deleteAExperts, updateProfile, getAllUsers,
  getAllworkshop, updateAworkshop, getAworkshop, updateAPassword, getAllprojects, getAproject, updateAproject,
  getPlans, createPlans, deleteAPlans, updateAPlans, createSubscriptionPlans, updateASubscriptionPlans, deleteASubscriptionPlans,
  getSubscriptionPlans, getNotifications, updateAUser, deleteAUser, getAllClient, createClient, updateAClient, deleteAClient

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
    getAvailabilityByUser,
    getallAvailabilities
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
router.route("/users/:id").patch(checkAuth, updateAUser).delete(checkAuth, deleteAUser)


router.route("/clients").get(getAllClient).post(checkAuth, createClient)
router.route("/clients/:id").patch(checkAuth, updateAClient).delete(checkAuth, deleteAClient)



router.route("/plans").get(getPlans).post(checkAuth, createPlans)
router.route("/plans/:id").patch(checkAuth, updateAPlans).delete(checkAuth, deleteAPlans)

router.route("/subscription-plans").get(getSubscriptionPlans).post(checkAuth, createSubscriptionPlans)
router.route("/subscription-plans/:id").patch(checkAuth, updateASubscriptionPlans).delete(checkAuth, deleteASubscriptionPlans)


router.route("/quotes").get(checkAuth, getQuotes).post(checkAuth, createQuote);


router.route("/quotes/draft").post(checkAuth, saveDraftQuote);


router.route("/quotes/:id/send").patch(checkAuth, sendQuote);


router.route("/quotes/:id/status").patch(checkAuth, updateQuoteStatus);


router.route("/quotes/:id").get(checkAuth, getQuote).put(checkAuth, updateQuote).delete(checkAuth, deleteQuote);


router.route("/invoices").get(getInvoices).post(createInvoice);


router.route("/invoices/draft").post(saveDraftInvoice);


router.route("/invoices/:id/send").patch(sendInvoice);


router.route("/invoices/:id/status").patch(updateInvoiceStatus);


router.route("/invoices/:id").get(getInvoice).put(updateInvoice).delete(deleteInvoice);









router.route("/events").get(checkAuth, getEvents);


router.route("/events/month").get(checkAuth, getEventsByMonth);


router.route("/events/today").get(checkAuth, getTodayEvents);


router.route("/events").post(checkAuth, createEvent);


router.route("/events/:id")
    .get(checkAuth, getEventById)
    .put(checkAuth, updateEvent)
    .delete(checkAuth, deleteEvent);






router.route("/availability").get(checkAuth, getAvailability);


router.route("/availability").post(checkAuth, createOrUpdateAvailability);


router.route("/availability/user/:email").get(checkAuth, getAvailabilityByUser);

router.route("/all-availabilities").get(getallAvailabilities);


export { router }