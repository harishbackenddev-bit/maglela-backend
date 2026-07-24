import { Router } from "express";
import {
    getDashboardStats, getExperts, updateAExperts, createExperts, deleteAExperts,updateProfile,
     getAllworkshop, updateAworkshop, getAworkshop, updateAPassword
} from "../controllers/admin/admin";
import { upload } from "../config/multer";
import { checkMulter } from "../lib/errors/error-response-handler"
import { checkAuth } from "src/middleware/check-auth";



const router = Router();

router.route("/experts").get(getExperts).post(checkAuth, createExperts)
router.route("/experts/:id").patch(checkAuth, updateAExperts).delete(checkAuth, deleteAExperts)
router.get("/dashboard", checkAuth, getDashboardStats)
router.route("/workshops").get(getAllworkshop)
router.route("/workshops/:id").put(checkAuth, updateAworkshop).get(checkAuth, getAworkshop)
router.route("/update-profile").patch(checkAuth, updateProfile)
router.route("/updatedetails").put(checkAuth, updateProfile)
router.route("/change-password").post(checkAuth, updateAPassword)

export { router }