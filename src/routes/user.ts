// routes/index.ts or routes/payfast.routes.ts
import { Router } from "express";
import { login, signup, userdata, forgotPassword, getDashboardStats, deleteAUser, updateAUser, twoFactorAuth, profileupdate, getNotificationPreferences, updateNotificationPreferences, 
    updateAPassword, createWorkshop, getworkshop, createProjects, getprojects, documentUpload , getAIwritingData, getAIspeechData ,
deleteAWritingContent,deleteASpeechContent, createSupportMessage

} from "../controllers/user/user";
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

const router = Router();

// ============================================
// USER ROUTES
// ============================================
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
router.post("/upload-document", checkAuth, uploadDocument.single("document"), documentUpload);
router.route("/workshops-guest").post(checkAuth, createWorkshop)

router.get("/ai-writing", checkAuth, getAIwritingData);
router.route("/ai-writing/:id").delete(checkAuth, deleteAWritingContent)


router.get("/ai-speech", checkAuth, getAIspeechData);
router.route("/ai-speech/:id").delete(checkAuth, deleteASpeechContent)


router.route("/contact/send-message").post(checkAuth, createSupportMessage)

// ============================================
// PAYFAST ORDER ROUTES
// ============================================

// 1. Initiate Payment - Frontend calls this to start payment
router.post("/create-order", initiatePayment);

// 2. PayFast Webhook - PayFast calls this after payment
// PayFast ITN notifications are sent as application/x-www-form-urlencoded
router.post("/payfast/notify", handlePayfastNotification);

// 3. Check Payment Status by order ID
router.get("/payments/status/:orderId", getOrderPaymentStatus);

// 4. Get Order by ID
router.get("/orders/:orderId", getOrder);

// 5. Get User Orders by email
router.get("/orders/user/:email", checkAuth, getUserOrders);

// 6. Download Product
router.get("/download/:orderNumber/:productId", downloadProduct);

router.patch("/orders/:orderId/cancel", cancelOrder);



// 1. Initiate Payment - Frontend calls this to start payment
router.route("/credit/create-order").post(checkAuth, initiateCreditPayment)

// 2. PayFast Webhook - PayFast calls this after payment
router.post("/credit/payfast/notify", handleCreditPaymentNotification);

// 3. Check Payment Status by order ID
router.get("/credit/payments/status/:orderId", getCreditOrderStatus);

// 4. Get Order by ID
router.get("/credit/orders/:orderId", getCreditOrder);

// 5. Get User Orders by email
router.get("/credit/orders/user/:email", checkAuth, getUserCreditOrders);




export { router };