import { Request, Response } from "express"
import { errorResponseHandler } from "../../lib/errors/error-response-handler"
import { usersModel } from "../../models/user/user-schema"
import bcrypt from "bcryptjs"
import { notificationsModel } from "../../models/notifications/notifications-schema";
import { generatePasswordResetToken, generatePasswordResetTokenByPhone, getPasswordResetTokenByToken } from "../../utils/mails/token"
import { sendPasswordResetEmail, sendSupportEmailToAdmin } from "../../utils/mails/mail"
import { generatePasswordResetTokenByPhoneWithTwilio } from "../../utils/sms/sms"
import { httpStatusCode } from "../../lib/constant"
import { customAlphabet } from "nanoid"
import jwt, { JwtPayload } from 'jsonwebtoken';
import { adminModel } from "src/models/admin/admin-schema";
import { workshopModel } from "src/models/workshop/workshop-schema";
import { projectModel } from "src/models/projects/project-schema";
import { aiContentModel } from "../../models/aiContentModel/aiContentModel";
import { supportMessageModel } from "../../models/user/support-messages-schema";
import { QuoteModel } from "../../models/invoice/quote-schema";
import { InvoiceModel } from "../../models/invoice/invoice-schema";

export const signupService = async (payload: any, res: Response) => {
  const emailExists = await usersModel.findOne({
    email: payload.email.toLowerCase().trim()
  });

  if (emailExists) {
    return errorResponseHandler(
      "Email already exists",
      httpStatusCode.BAD_REQUEST,
      res
    );
  }

  payload.password = bcrypt.hashSync(payload.password, 10);

  const identifier = customAlphabet('0123456789', 3);
  payload.identifier = identifier();

  const user = await new usersModel({
    ...payload,
    email: payload.email.toLowerCase().trim()
  }).save();

  const token = jwt.sign(
    {
      id: user._id,
      email: user.email,
      phoneNumber: user.phoneNumber
    },
    process.env.JWT_SECRET as string,
    {
      expiresIn: '7d'
    }
  );

  return {
    success: true,
    message: "User signup successful",
    token,
    user
  };
};

export const userdataServive = async (payload: any, res: Response) => {
  const userId = payload.userId;

  let user = await usersModel.findById(userId);

  if (!user) {
    user = await adminModel.findById(userId);
  }

  if (!user) {
    return errorResponseHandler(
      "User not found",
      httpStatusCode.NOT_FOUND,
      res
    );
  }

  return {
    success: true,
    message: "User data fetched successfully",
    data: user,
  };
};

export const loginService = async (payload: any, res: Response) => {
  const { email, password } = payload;

  const normalizedEmail = email.toLowerCase().trim();

  let account: any = await usersModel
    .findOne({ email: normalizedEmail })
    .select("+password");

  let role = "user";

  if (!account) {
    account = await adminModel
      .findOne({ email: normalizedEmail })
      .select("+password");

    role = "admin";
  }

  if (!account) {
    return errorResponseHandler(
      "User not found",
      httpStatusCode.NOT_FOUND,
      res
    );
  }

  const isPasswordValid = bcrypt.compareSync(
    password,
    account.password
  );

  if (!isPasswordValid) {
    return errorResponseHandler(
      "Invalid password",
      httpStatusCode.UNAUTHORIZED,
      res
    );
  }

  const accountObject: any = account.toObject();
  delete accountObject.password;

  const token = jwt.sign(
    {
      id: account._id,
      email: account.email,
      role,
    },
    process.env.JWT_SECRET as string,
    {
      expiresIn: "7d",
    }
  );

  return {
    success: true,
    message: "Login successful",
    data: {
      ...accountObject,
      role,
    },
    token,
  };
};

export const forgotPasswordService = async (
  payload: any,
  res: Response
) => {
  const { email } = payload;
  console.log("emaildd", email);

  const user = await usersModel.findOne({
    email: email.toLowerCase().trim()
  });

  if (!user) {
    return errorResponseHandler(
      "User not found",
      httpStatusCode.NOT_FOUND,
      res
    );
  }

  const resetToken = jwt.sign(
    { id: user._id },
    process.env.JWT_SECRET as string,
    { expiresIn: "1h" }
  );

  const resetLink = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;

  await sendPasswordResetEmail(email, resetLink);

  return {
    success: true,
    message: "Password reset link sent successfully"
  };
};


// ✅ 2. Reset Password Service - Verify Token and Update Password
export const verifyPasswordResetService = async (payload: any, res: Response) => {
  try {
    const { token, newPassword, confirmPassword } = payload;

    // Validate input
    if (!token || !newPassword) {
      return errorResponseHandler(
        "Token and new password are required",
        httpStatusCode.BAD_REQUEST,
        res
      );
    }

    if (newPassword !== confirmPassword) {
      return errorResponseHandler(
        "Passwords do not match",
        httpStatusCode.BAD_REQUEST,
        res
      );
    }

    if (newPassword.length < 8) {
      return errorResponseHandler(
        "Password must be at least 8 characters",
        httpStatusCode.BAD_REQUEST,
        res
      );
    }

    // ✅ Verify JWT token
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET as string) as JwtPayload;
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        return errorResponseHandler(
          "Reset link has expired. Please request a new one.",
          httpStatusCode.BAD_REQUEST,
          res
        );
      }
      return errorResponseHandler(
        "Invalid reset link. Please request a new one.",
        httpStatusCode.BAD_REQUEST,
        res
      );
    }

    // Find user by ID from token
    const user = await usersModel.findById(decoded.id);
    if (!user) {
      return errorResponseHandler(
        "User not found",
        httpStatusCode.NOT_FOUND,
        res
      );
    }
    // Hash new password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    // Update user password
    user.password = hashedPassword;
    await user.save();

    return {
      success: true,
      message: "Password reset successful. Please login with your new password.",
    };

  } catch (error: any) {
    console.error("Reset password error:", error);
    return errorResponseHandler(
      error.message || "Failed to reset password",
      httpStatusCode.INTERNAL_SERVER_ERROR,
      res
    );
  }
};



export const getUserInfoService = async (id: string, res: Response) => {
  // const user = await usersModel.findById(id);
  // if (!user) return errorResponseHandler("User not found", httpStatusCode.NOT_FOUND, res);

  // const userProjects = await projectsModel.find({ userId: id }).select("-__v");

  // return {
  //     success: true,
  //     message: "User retrieved successfully",
  //     data: {
  //         user,
  //         projects: userProjects.length > 0 ? userProjects : [],
  //     }
  // };
}


// export const editUserInfoService = async (id: string, payload: any, res: Response) => {
//     const user = await usersModel.findById(id);
//     if (!user) return errorResponseHandler("User not found", httpStatusCode.NOT_FOUND, res);
//     const countryCode = "+45";
//     payload.phoneNumber = `${countryCode}${payload.phoneNumber}`;
//     const updateduser = await usersModel.findByIdAndUpdate(id,{ ...payload },{ new: true});

//     return {
//         success: true,
//         message: "User updated successfully",
//         data: updateduser,
//     };
// }

export const updateAUserService = async (payload: any, res: Response) => {
  const userId = payload.userId;
  const body = payload.body;
  // console.log("userIdpayload", userId);
  // console.log("bodypayload", body);
  const user = await usersModel.findById(userId);
  if (!user) return errorResponseHandler("User not found", httpStatusCode.NOT_FOUND, res);
  const updateduser = await usersModel.findByIdAndUpdate(userId, { ...body }, { new: true });
  return {
    success: true,
    message: "User data retrieved successfully",
    data: updateduser
  };
};

export const twoFactorAuthService = async (payload: any, res: Response) => {
  const userId = payload.userId;
  const body = payload.body;
  // console.log("userIdpayload", userId);
  // console.log("bodypayload", body);
  const user = await usersModel.findById(userId);
  if (!user) return errorResponseHandler("User not found", httpStatusCode.NOT_FOUND, res);
  const updateduser = await usersModel.findByIdAndUpdate(userId, { ...body }, { new: true });
  return {
    success: true,
    message: "User data retrieved successfully",
    data: updateduser
  };
};




export const updateAPasswordService = async (payload: any, res: Response) => {
  const userId = payload.userId;
  const { currentPassword, newPassword } = payload.body;

  const user = await usersModel.findById(userId).select("+password");


  if (!user) { return errorResponseHandler("User not found", httpStatusCode.NOT_FOUND, res); }

  // Check current password
  const isPasswordMatched = await bcrypt.compare(
    currentPassword,
    user.password
  );

  if (!isPasswordMatched) {
    return errorResponseHandler(
      "Current password is incorrect",
      httpStatusCode.BAD_REQUEST,
      res
    );
  }

  // Hash new password
  const saltRounds = 10;
  const hashedPassword = await bcrypt.hash(newPassword, saltRounds);

  // Update password
  await usersModel.findByIdAndUpdate(
    userId,
    {
      password: hashedPassword,
    },
    {
      new: true,
    }
  );

  return {
    success: true,
    message: "Password updated successfully",
  };
};

export const deleteAUserService = async (id: string, res: Response) => {
  // const user = await usersModel.findById(id);
  // if (!user) return errorResponseHandler("User not found", httpStatusCode.NOT_FOUND, res);

  // // Delete user projects ----
  // const userProjects = await projectsModel.deleteMany({ userId: id })

  // // Delete user ----
  // await usersModel.findByIdAndDelete(id)

  // return {
  //     success: true,
  //     message: "User deleted successfully",
  //     data: {
  //         user,
  //         projects: userProjects
  //     }
  // }
}



export const getNotificationPreferencesService = async (payload: any, res: Response) => {
  const userId = payload.userId;
  // console.log("userIdpayload", userId);
  const user = await notificationsModel.findOne({ userId });

  return {
    success: true,
    message: "Notification preferences fetched successfully",
    data: user
  };
}

export const updateNotificationPreferencesService = async (
  payload: any,
  res: Response
) => {
  const { userId, body } = payload;

  const identifier = customAlphabet("0123456789", 3);

  const updatedUser = await notificationsModel.findOneAndUpdate(
    { userId },
    {
      $set: {
        ...body,
        userId,
      },
      $setOnInsert: {
        identifier: identifier(), // only when creating
      },
    },
    {
      new: true,
      upsert: true, // create if not found
      runValidators: true,
    }
  );

  return {
    success: true,
    message: "Notification preferences saved successfully",
    data: updatedUser,
  };
};


export const createWorkshopService = async (
  payload: any,
  res: Response
) => {
  try {
    const { userId, body } = payload;

    const identifier = customAlphabet("0123456789", 3);

    const workshop = await workshopModel.create({
      ...body,
      userId: userId || "guest",
      identifier: identifier(),
    });

    return {
      success: true,
      message: "Workshop created successfully",
      data: workshop,
    };
  } catch (error: any) {
    console.error("Error creating workshop:", error);

    return {
      success: false,
      message: error.message || "Failed to create workshop",
      data: null,
    };
  }
};


export const getworkshopService = async (payload: any, res: Response) => {
  const userId = payload.userId;
  // console.log("userIdpayload", userId);
  const user = await workshopModel.find({ userId });

  return {
    success: true,
    message: "Workshops fetched successfully",
    data: user
  };
}



export const createProjectsService = async (
  payload: any,
  res: Response
) => {
  try {
    const { userId, body } = payload;

    const identifier = customAlphabet("0123456789", 3);

    const project = await projectModel.create({
      ...body,
      userId,
      identifier: identifier(),
    });

    return {
      success: true,
      message: "project created successfully",
      data: project,
    };
  } catch (error: any) {
    console.error("Error creating project:", error);

    return {
      success: false,
      message: error.message || "Failed to create project",
      data: null,
    };
  }
};


export const getprojectsService = async (payload: any, res: Response) => {
  const { userId } = payload;

  const projects = await projectModel.find({ userId });

  return {
    success: true,
    message: "Projects fetched successfully",
    data: projects
  };
};


// Dashboard
export const getDashboardStatsService = async (payload: any, res: Response) => {
  // //Ongoing project count
  const userId = payload.currentUser

  // // console.log("userid",userId);

  // const ongoingProjectCount = await projectsModel.countDocuments({ userId, status: { $ne: "1" } })

  // const completedProjectCount = await projectsModel.countDocuments({ userId,status: "1" })

  // const workingProjectDetails = await projectsModel.find({ userId, status: { $ne: "1" } }).select("projectName projectimageLink status"); // Adjust the fields as needed


  // const response = {
  //     success: true,
  //     message: "Dashboard stats fetched successfully",
  //     data: {
  //         ongoingProjectCount,
  //         completedProjectCount,
  //          workingProjectDetails,
  //     }
  // }

  return userId;
}

// ============================================
// ✅ GET ALL AI WRITING DATA
// ============================================

export const getAIwritingDataService = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).currentUser;

    const data = await aiContentModel.find({
      userId: userId,
      contentType: 'writing'
    }).sort({ createdAt: -1 });

    return {
      success: true,
      message: "Writing data fetched successfully",
      data: data
    };

  } catch (error: any) {
    console.error("Error fetching writing data:", error);
    return errorResponseHandler(
      error.message || "Failed to fetch writing data",
      httpStatusCode.INTERNAL_SERVER_ERROR,
      res
    );
  }
};

// ============================================
// ✅ GET ALL AI SPEECH DATA
// ============================================

export const getAIspeechDataService = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).currentUser;

    const data = await aiContentModel.find({
      userId: userId,
      contentType: 'speech'
    }).sort({ createdAt: -1 });

    return {
      success: true,
      message: "Speech data fetched successfully",
      data: data
    };

  } catch (error: any) {
    console.error("Error fetching speech data:", error);
    return errorResponseHandler(
      error.message || "Failed to fetch speech data",
      httpStatusCode.INTERNAL_SERVER_ERROR,
      res
    );
  }
};


export const deleteAWritingContentService = async (id: string, res: Response) => {
  try {
    const content = await aiContentModel.findById(id);

    if (!content) {
      return errorResponseHandler(
        "Writing content not found",
        httpStatusCode.NOT_FOUND,
        res
      );
    }

    await aiContentModel.findByIdAndDelete(id);

    return {
      success: true,
      message: "Writing content deleted successfully",
    };
  } catch (error: any) {
    return errorResponseHandler(
      error.message || "Failed to delete writing content",
      httpStatusCode.INTERNAL_SERVER_ERROR,
      res
    );
  }
};

export const deleteASpeechContentService = async (id: string, res: Response) => {
  try {
    const content = await aiContentModel.findById(id);

    if (!content) {
      return errorResponseHandler(
        "Speech content not found",
        httpStatusCode.NOT_FOUND,
        res
      );
    }

    await aiContentModel.findByIdAndDelete(id);

    return {
      success: true,
      message: "Speech content deleted successfully",
    };
  } catch (error: any) {
    return errorResponseHandler(
      error.message || "Failed to delete speech content",
      httpStatusCode.INTERNAL_SERVER_ERROR,
      res
    );
  }
};



export const createSupportMessageService = async (
  payload: any,
  res: Response
) => {
  try {
    const { userId, body } = payload;

    // Get logged-in user
    const user = await usersModel.findById(userId);

    if (!user) {
      return {
        success: false,
        message: "User not found",
        data: null,
      };
    }

    // Create support message
    const supportMessage = await supportMessageModel.create({
      userId: user._id,
      name: user.name,
      email: user.email,
      phoneNumber: user.phoneNumber,
      organisation: user.organisation,
      profileType: user.profileType,
      subject: body.subject,
      message: body.message,
    });


    await sendSupportEmailToAdmin({
      name: user.name,
      email: user.email,
      organisation: user.organisation,
      subject: body.subject,
      message: body.message,
    });


    return {
      success: true,
      message: "Support message sent successfully",
      data: supportMessage,
    };
  } catch (error: any) {
    console.error("Error creating support message:", error);

    return {
      success: false,
      message: error.message || "Failed to send support message",
      data: null,
    };
  }
};

export const getQuoteService = async (
  payload: any,
  res: Response
) => {
  try {
    const { userId } = payload;

    // Find user by ID
    const user = await usersModel.findById(userId);

    if (!user) {
      return {
        success: false,
        message: "User not found",
        data: null,
      };
    }

    const userEmail = user.email;

    // Find quote by client email
    const quote = await QuoteModel.find({
      "clientInfo.email": userEmail,
    });

    if (!quote) {
      return {
        success: false,
        message: "Quote not found",
        data: null,
      };
    }

    return {
      success: true,
      message: "Quote fetched successfully",
      data: quote,
    };
  } catch (error: any) {
    console.error("Error fetching quote:", error);

    return {
      success: false,
      message: error.message || "Failed to fetch quote",
      data: null,
    };
  }
};


export const getInvoicesService = async (
  payload: any,
  res: Response
) => {
  try {
    const { userId } = payload;

    // Find user by ID
    const user = await usersModel.findById(userId);

    if (!user) {
      return {
        success: false,
        message: "User not found",
        data: null,
      };
    }

    const userEmail = user.email;

    // Find quote by client email
    const quote = await InvoiceModel.find({
      "clientInfo.email": userEmail,
    });

    if (!quote) {
      return {
        success: false,
        message: "Invoice not found",
        data: null,
      };
    }

    return {
      success: true,
      message: "Invoice fetched successfully",
      data: quote,
    };
  } catch (error: any) {
    console.error("Error fetching Invoice:", error);

    return {
      success: false,
      message: error.message || "Failed to fetch Invoice",
      data: null,
    };
  }
};



export const updateQuoteService = async (id: string, body: any, res: Response) => {
  try {
    const quote = await QuoteModel.findById(id);
    
    if (!quote) {
      return {
        success: false,
        message: "Quote not found",
        data: null,
      };
    }

    if (quote.status !== 'draft') {
      return {
        success: false,
        message: `Cannot update quote in "${quote.status}" status`,
        data: null,
      };
    }

    const updatedQuote = await QuoteModel.findByIdAndUpdate(
      id,
      { $set: body },
      { new: true, runValidators: true }
    );

    return {
      success: true,
      message: "Quote updated successfully",
      data: updatedQuote,
    };
  } catch (error: any) {
    console.error("Error updating quote:", error);
    return {
      success: false,
      message: error.message || "Failed to update quote",
      data: null,
    };
  }
};