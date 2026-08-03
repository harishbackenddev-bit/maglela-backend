import { Request, Response } from "express"
import { httpStatusCode } from "../../lib/constant"
import { errorParser } from "../../lib/errors/error-response-handler"
import { clientSignupSchema, passswordResetSchema } from "../../validation/client-user"
import { formatZodErrors } from "../../validation/format-zod-errors"
import { loginService, signupService,userdataServive, forgotPasswordService, verifyPasswordResetService,deleteAUserService,
     getDashboardStatsService, getUserInfoService, updateAUserService, updateAPasswordService, twoFactorAuthService,
    getNotificationPreferencesService, updateNotificationPreferencesService, createWorkshopService, getworkshopService,createProjectsService,
    getprojectsService, getAIwritingDataService, getAIspeechDataService
 } from "../../services/user/user"
import { z } from "zod"
import mongoose from "mongoose"

export const signup = async (req: Request, res: Response) => {
    // const validation = clientSignupSchema.safeParse(req.body)
    // if (!validation.success) return res.status(httpStatusCode.BAD_REQUEST).json({ success: false, message: formatZodErrors(validation.error) })
    try {
        const response: any = await signupService(req.body, res)
        return res.status(httpStatusCode.CREATED).json(response)
    }
    catch (error: any) {
        const { code, message } = errorParser(error)
        return res.status(code || httpStatusCode.INTERNAL_SERVER_ERROR).json({ success: false, message: message || "An error occurred" })
    }
}

export const userdata = async (req: Request, res: Response) => {
    try {
        const userId = (req as any).currentUser;
        const response = await userdataServive({ userId }, res)
        return res.status(httpStatusCode.OK).json(response)
    } catch (error: any) {
        const { code, message } = errorParser(error)
        return res.status(code || httpStatusCode.INTERNAL_SERVER_ERROR).json({ success: false, message: message || "An error occurred" })
    }
}

export const login = async (req: Request, res: Response) => {
    // const validation = adminUserLoginSchema.safeParse(req.body)
    // if (!validation.success) return res.status(httpStatusCode.BAD_REQUEST).json({ success: false, message: formatZodErrors(validation.error) })
    try {
        const response = await loginService(req.body, res)
        return res.status(httpStatusCode.OK).json(response)
    }
    catch (error: any) {
        const { code, message } = errorParser(error)
        return res.status(code || httpStatusCode.INTERNAL_SERVER_ERROR).json({ success: false, message: message || "An error occurred" })
    }
}

export const forgotPassword = async (req: Request, res: Response) => {
    // const { email } = req.body
    // const validation = z.string().email().safeParse(email)
    // if (!validation.success) return res.status(httpStatusCode.BAD_REQUEST).json({ success: false, message: formatZodErrors(validation.error) })
    try {
        const response = await forgotPasswordService(req.body, res)
        return res.status(httpStatusCode.OK).json(response)
    }
    catch (error: any) {
        const { code, message } = errorParser(error)
        return res.status(code || httpStatusCode.INTERNAL_SERVER_ERROR).json({ success: false, message: message || "An error occurred" })
    }
}

export const verifyPasswordReset = async (req: Request, res: Response) => {
    
    try {
        const response = await verifyPasswordResetService(req.body, res)
        return res.status(httpStatusCode.OK).json(response)
    }
    catch (error: any) {
        const { code, message } = errorParser(error)
        return res.status(code || httpStatusCode.INTERNAL_SERVER_ERROR).json({ success: false, message: message || "An error occurred" })
    }
}


export const getUserInfo = async (req: Request, res: Response) => {
    try {
        const response = await getUserInfoService(req.params.id, res)
        return res.status(httpStatusCode.OK).json(response)
    } catch (error: any) {
        const { code, message } = errorParser(error)
        return res.status(code || httpStatusCode.INTERNAL_SERVER_ERROR).json({ success: false, message: message || "An error occurred" });
    }
}


export const updateAUser = async (req: Request, res: Response) => {
    try {
        const userId = (req as any).currentUser;
        const response = await updateAUserService({ userId, body: req.body }, res);
        return res.status(httpStatusCode.OK).json(response)
    } catch (error: any) {
        const { code, message } = errorParser(error)
        return res.status(code || httpStatusCode.INTERNAL_SERVER_ERROR).json({ success: false, message: message || "An error occurred" });
    }
}

export const deleteAUser = async (req: Request, res: Response) => {
    try {
        const userId = (req as any).currentUser;
        const response = await deleteAUserService(userId, res)
        return res.status(httpStatusCode.OK).json(response)
    } catch (error: any) {
        const { code, message } = errorParser(error)
        return res.status(code || httpStatusCode.INTERNAL_SERVER_ERROR).json({ success: false, message: message || "An error occurred" });
    }
}

export const twoFactorAuth = async (req: Request, res: Response) => {
    try {
        const userId = (req as any).currentUser;
        const response = await twoFactorAuthService({ userId, body: req.body }, res);
        return res.status(httpStatusCode.OK).json(response)
    } catch (error: any) {
        const { code, message } = errorParser(error)
        return res.status(code || httpStatusCode.INTERNAL_SERVER_ERROR).json({ success: false, message: message || "An error occurred" });
    }
}


export const updateAPassword = async (req: Request, res: Response) => {
    try {
        const userId = (req as any).currentUser;
        const response = await updateAPasswordService({ userId, body: req.body }, res);
        return res.status(httpStatusCode.OK).json(response)
    } catch (error: any) {
        const { code, message } = errorParser(error)
        return res.status(code || httpStatusCode.INTERNAL_SERVER_ERROR).json({ success: false, message: message || "An error occurred" });
    }
}






export const getNotificationPreferences = async (req: Request, res: Response) => {
    try {
        const userId = (req as any).currentUser;
        const response = await getNotificationPreferencesService({ userId }, res)
        return res.status(httpStatusCode.OK).json(response)
    } catch (error: any) {
        const { code, message } = errorParser(error)
        return res.status(code || httpStatusCode.INTERNAL_SERVER_ERROR).json({ success: false, message: message || "An error occurred" })
    }
}



export const updateNotificationPreferences = async (req: Request, res: Response) => {
    try {
        const userId = (req as any).currentUser;
        const response = await updateNotificationPreferencesService({ userId, body: req.body }, res)
        return res.status(httpStatusCode.OK).json(response)
    } catch (error: any) {
        const { code, message } = errorParser(error)
        return res.status(code || httpStatusCode.INTERNAL_SERVER_ERROR).json({ success: false, message: message || "An error occurred" })
    }
}

export const profileupdate = async (req: Request, res: Response) => {
  try {
    // Check if file was uploaded
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded',
      });
    }

    // Cloudinary automatically uploads the file and provides the URL
    // The file object will have Cloudinary-specific properties
    const imageUrl = (req.file as any).path; // Cloudinary URL
    const publicId = (req.file as any).filename; // Cloudinary public_id

    // Return the Cloudinary URL
    res.status(200).json({
      success: true,
      message: 'Profile image uploaded successfully',
      imageUrl: imageUrl,
      data: {
        imageUrl: imageUrl,
        publicId: publicId,
      },
    });
  } catch (error: any) {
    console.error('Profile upload error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to upload profile image',
      error: error.message,
    });
  }
};


export const createWorkshop = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).currentUser;
    const response = await createWorkshopService({userId,body: req.body,},res);
    return res.status(httpStatusCode.OK).json(response);
  } catch (error: any) {
    const { code, message } = errorParser(error);
    return res.status(code || httpStatusCode.INTERNAL_SERVER_ERROR).json({success: false,message: message || "An error occurred",});
  }
};

export const getworkshop = async (req: Request, res: Response) => {
    try {
        const userId = (req as any).currentUser;
        const response = await getworkshopService({ userId }, res)
        return res.status(httpStatusCode.OK).json(response)
    } catch (error: any) {
        const { code, message } = errorParser(error)
        return res.status(code || httpStatusCode.INTERNAL_SERVER_ERROR).json({ success: false, message: message || "An error occurred" })
    }
}


export const createProjects = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).currentUser;
    const response = await createProjectsService({userId,body: req.body,},res);
    return res.status(httpStatusCode.CREATED).json(response);
  } catch (error: any) {
    const { code, message } = errorParser(error);
    return res.status(code || httpStatusCode.INTERNAL_SERVER_ERROR).json({success: false,message: message || "An error occurred",});
  }
};

export const getprojects = async (req: Request, res: Response) => {
    try {
        const userId = (req as any).currentUser;
        const response = await getprojectsService({ userId }, res)
        return res.status(httpStatusCode.OK).json(response)
    } catch (error: any) {
        const { code, message } = errorParser(error)
        return res.status(code || httpStatusCode.INTERNAL_SERVER_ERROR).json({ success: false, message: message || "An error occurred" })
    }
}


export const documentUpload = async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "No document uploaded",
      });
    }

    const fileUrl = (req.file as any).path.replace(/^public/, "");
    const publicId = (req.file as any).filename;

    return res.status(200).json({
      success: true,
      message: "Document uploaded successfully",
      fileUrl,
      data: {
        fileUrl,
        publicId,
      },
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: "Failed to upload document",
      error: error.message,
    });
  }
};



// Dashboard
export const getDashboardStats = async (req: Request, res: Response) => {
    try {
        const response = await getDashboardStatsService(req, res)
        return res.status(httpStatusCode.OK).json(response)
    } catch (error: any) {
        const { code, message } = errorParser(error)
        return res.status(code || httpStatusCode.INTERNAL_SERVER_ERROR).json({ success: false, message: message || "An error occurred" });
    }
}

// getAIwritingData
export const getAIwritingData = async (req: Request, res: Response) => {
    try {
        const response = await getAIwritingDataService(req, res)
        return res.status(httpStatusCode.OK).json(response)
    } catch (error: any) {
        const { code, message } = errorParser(error)
        return res.status(code || httpStatusCode.INTERNAL_SERVER_ERROR).json({ success: false, message: message || "An error occurred" });
    }
}


export const getAIspeechData = async (req: Request, res: Response) => {
    try {
        const response = await getAIspeechDataService(req, res)
        return res.status(httpStatusCode.OK).json(response)
    } catch (error: any) {
        const { code, message } = errorParser(error)
        return res.status(code || httpStatusCode.INTERNAL_SERVER_ERROR).json({ success: false, message: message || "An error occurred" });
    }
}







