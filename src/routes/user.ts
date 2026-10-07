
import { Router } from "express";
import {
    login, signup, userdata, forgotPassword, getDashboardStats, deleteAUser, updateAUser, twoFactorAuth, profileupdate, getNotificationPreferences, updateNotificationPreferences,
    updateAPassword, createWorkshop, getworkshop, createProjects, getprojects, documentUpload, getAIwritingData, getAIspeechData,
    deleteAWritingContent, deleteASpeechContent, createSupportMessage, getQuote, updateQuote, getInvoices

} from "../controllers/user/user";

import {
updateAproject
} from "../controllers/admin/admin";

import { checkAuth } from "../middleware/check-auth";
import { uploadProfile, uploadDocument } from "../config/multerConfig";
import {
    initiatePayment,
    handlePayfastNotification,
    getOrderPaymentStatus,
    getOrder,
    getUserOrders,
    downloadProduct,
    cancelOrder,
} from "../controllers/payfast/payfast";

import {
    initiateCreditPayment,
    handleCreditPaymentNotification,
    getCreditOrderStatus,
    getCreditOrder,
    getUserCreditOrders,
} from "../controllers/payfast/creditproduct";

import {
    getPlans
} from "../controllers/admin/admin";


import {
    initiateInvoicePayment,
    handleInvoicePaymentNotification,
    getInvoiceOrder
} from "../controllers/payfast/invoiceproduct";

const router = Router();




router.get("/me", checkAuth, userdata);
router.post("/register", signup);
router.post("/login", login);
router.patch("/forgot-password", forgotPassword);
router.get("/dashboard", checkAuth, getDashboardStats);
router.post("/update-profile-pic", uploadProfile.single("profileImage"), profileupdate);
router.route("/update-profile").patch(checkAuth, updateAUser).delete(checkAuth, deleteAUser);
router.route("/updatedetails").put(checkAuth, updateAUser).delete(checkAuth, deleteAUser);
router.route("/notification-preferences").get(checkAuth, getNotificationPreferences).post(checkAuth, updateNotificationPreferences);
router.route("/change-password").post(checkAuth, updateAPassword);
router.route("/two-factor").post(checkAuth, twoFactorAuth);
router.route("/workshops").post(checkAuth, createWorkshop).get(checkAuth, getworkshop);
router.route("/projects").post(checkAuth, createProjects).get(checkAuth, getprojects);
router.route("/projects/:id").put(checkAuth, updateAproject)
router.post("/upload-document", checkAuth, uploadDocument.single("document"), documentUpload);
router.route("/workshops-guest").post(checkAuth, createWorkshop)
router.route("/credit-plans").get(getPlans)



router.get("/ai-writing", checkAuth, getAIwritingData);
router.route("/ai-writing/:id").delete(checkAuth, deleteAWritingContent)


router.get("/ai-speech", checkAuth, getAIspeechData);
router.route("/ai-speech/:id").delete(checkAuth, deleteASpeechContent)


router.route("/contact/send-message").post(checkAuth, createSupportMessage)

router.route("/quotes").get(checkAuth, getQuote)
router.route("/quotes/:id").put(checkAuth, updateQuote)

router.route("/invoices").get(checkAuth, getInvoices)







router.post("/create-order", initiatePayment);



router.post("/payfast/notify", handlePayfastNotification);


router.get("/payments/status/:orderId", getOrderPaymentStatus);


router.get("/orders/:orderId", getOrder);


router.get("/orders/user/:email", checkAuth, getUserOrders);


router.get("/download/:orderNumber/:productId", downloadProduct);

router.patch("/orders/:orderId/cancel", cancelOrder);




router.route("/credit/create-order").post(checkAuth, initiateCreditPayment)


router.post("/credit/payfast/notify", handleCreditPaymentNotification);


router.get("/credit/payments/status/:orderId", getCreditOrderStatus);


router.get("/credit/orders/:orderId", getCreditOrder);


router.get("/credit/orders/user/:email", checkAuth, getUserCreditOrders);




router.route("/invoices/create-payment").post(checkAuth, initiateInvoicePayment)


router.post("/invoice/payfast/notify", handleInvoicePaymentNotification);


router.get("/invoices/orders/:orderId", getInvoiceOrder);

export { router };