import { adminModel } from "../../models/admin/admin-schema";
import bcrypt from "bcryptjs";
import { Response } from "express";
import { errorResponseHandler } from "../../lib/errors/error-response-handler";
import { httpStatusCode } from "../../lib/constant";
import { queryBuilder } from "../../utils";
import { sendPasswordResetEmail } from "src/utils/mails/mail";
import { generatePasswordResetToken, getPasswordResetTokenByToken, generatePasswordResetTokenByPhone } from "src/utils/mails/token";
import { generatePasswordResetTokenByPhoneWithTwilio } from "../../utils/sms/sms"
import { passwordResetTokenModel } from "src/models/password-token-schema";
import { usersModel } from "src/models/user/user-schema";
import { expertsModel } from "src/models/experts/expert-schema";
import { customAlphabet } from "nanoid"
import { workshopModel } from "src/models/workshop/workshop-schema";

export const loginService = async (payload: any, res: Response) => {
    const { username, password } = payload;
    const countryCode = "+45";
    const toNumber = Number(username);
    const isEmail = isNaN(toNumber);
    let user: any = null;

    if (isEmail) {

        user = await adminModel.findOne({ email: username }).select('+password');
        if (!user) {
            user = await usersModel.findOne({ email: username }).select('+password');
        }
    } else {

        const formattedPhoneNumber = `${countryCode}${username}`;
        user = await adminModel.findOne({ phoneNumber: formattedPhoneNumber }).select('+password');
        if (!user) {
            user = await usersModel.findOne({ phoneNumber: formattedPhoneNumber }).select('+password');
        }
    }

    if (!user) return errorResponseHandler('User not found', httpStatusCode.NOT_FOUND, res);
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
        return errorResponseHandler('Invalid password', httpStatusCode.UNAUTHORIZED, res);
    }
    const userObject = user.toObject();
    delete userObject.password;

    return {
        success: true,
        message: "Login successful",
        data: {
            user: userObject,
        },
    };
};


export const forgotPasswordService = async (payload: any, res: Response) => {
    const { username } = payload;
    const countryCode = "+91";
    const toNumber = Number(username);
    const isEmail = isNaN(toNumber);
    let user: any = null;
    if (isEmail) {

        user = await adminModel.findOne({ email: username }).select('+password');
        if (!user) {
            user = await usersModel.findOne({ email: username }).select('+password');
        }
        if (!user) return errorResponseHandler('User not found', httpStatusCode.NOT_FOUND, res);

        const passwordResetToken = await generatePasswordResetToken(username);
        if (passwordResetToken) {
            await sendPasswordResetEmail(username, passwordResetToken.token);
            return { success: true, message: "Password reset email sent with OTP" };
        }
    } else {
        const formattedPhoneNumber = `${countryCode}${username}`;
        user = await adminModel.findOne({ phoneNumber: formattedPhoneNumber }).select('+password');
        if (!user) {
            user = await usersModel.findOne({ phoneNumber: formattedPhoneNumber }).select('+password');
        }
        if (!user) return errorResponseHandler('User not found', httpStatusCode.NOT_FOUND, res);

        const passwordResetTokenBySms = await generatePasswordResetTokenByPhone(formattedPhoneNumber);
        if (passwordResetTokenBySms) {
            await generatePasswordResetTokenByPhoneWithTwilio(formattedPhoneNumber, passwordResetTokenBySms.token);
            return { success: true, message: "Password reset SMS sent with OTP" };
        }
    }

    return errorResponseHandler('Failed to generate password reset token', httpStatusCode.INTERNAL_SERVER_ERROR, res);
};


export const newPassswordAfterOTPVerifiedService = async (payload: { password: string, otp: string }, res: Response) => {
    // console.log('payload: ', payload);
    const { password, otp } = payload

    const existingToken = await getPasswordResetTokenByToken(otp)
    if (!existingToken) return errorResponseHandler("Invalid OTP", httpStatusCode.BAD_REQUEST, res)

    const hasExpired = new Date(existingToken.expires) < new Date()
    if (hasExpired) return errorResponseHandler("OTP expired", httpStatusCode.BAD_REQUEST, res)

    let existingAdmin: any;

    if (existingToken.email) {
        existingAdmin = await adminModel.findOne({ email: existingToken.email });
    }
    else if (existingToken.phoneNumber) {
        existingAdmin = await adminModel.findOne({ phoneNumber: existingToken.phoneNumber });
    }

    const hashedPassword = await bcrypt.hash(password, 10)
    const response = await adminModel.findByIdAndUpdate(existingAdmin._id, { password: hashedPassword }, { new: true });
    await passwordResetTokenModel.findByIdAndDelete(existingToken._id);

    return {
        success: true,
        message: "Password updated successfully",
        data: response
    }
}


export const getAllUsersService = async (payload: any) => {
    const page = parseInt(payload.page as string) || 1
    const limit = parseInt(payload.limit as string) || 0
    const offset = (page - 1) * limit
    const { query, sort } = queryBuilder(payload, ['fullName'])
    const totalDataCount = Object.keys(query).length < 1 ? await usersModel.countDocuments() : await usersModel.countDocuments(query)
    const results = await usersModel.find(query).sort(sort).skip(offset).limit(limit).select("-__v")
    if (results.length) return {
        page,
        limit,
        success: true,
        total: totalDataCount,
        data: results
    }
    else {
        return {
            data: [],
            page,
            limit,
            success: false,
            total: 0
        }
    }
}

export const getAUserService = async (id: string, res: Response) => {
    //   const user = await usersModel.findById(id);
    //   if (!user) return errorResponseHandler("User not found", httpStatusCode.NOT_FOUND, res);

    //   const userProjects = await projectsModel.find({ userId: id }).select("-__v");

    //   return {
    //       success: true,
    //       message: "User retrieved successfully",
    //       data: {
    //           user,
    //           projects: userProjects.length > 0 ? userProjects : [],
    //       }
    //   };
}


export const updateAUserService = async (id: string, payload: any, res: Response) => {
    const user = await usersModel.findById(id);
    if (!user) return errorResponseHandler("User not found", httpStatusCode.NOT_FOUND, res);
    const countryCode = "+45";
    payload.phoneNumber = `${countryCode}${payload.phoneNumber}`;
    const updateduser = await usersModel.findByIdAndUpdate(id, { ...payload }, { new: true });

    return {
        success: true,
        message: "User updated successfully",
        data: updateduser,
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



export const updateAProfileService = async (payload: any, res: Response) => {
  const userId = payload.userId;
  const body = payload.body;
  // console.log("userIdpayload", userId);
  // console.log("bodypayload", body);
  const user = await adminModel.findById(userId);
  if (!user) return errorResponseHandler("User not found", httpStatusCode.NOT_FOUND, res);
  const updateduser = await adminModel.findByIdAndUpdate(userId, { ...body }, { new: true });
  return {
    success: true,
    message: "User data retrieved successfully",
    data: updateduser
  };
};

export const updateAPasswordService = async (payload: any, res: Response) => {
  const userId = payload.userId;
  const { currentPassword, newPassword } = payload.body;

  const user = await adminModel.findById(userId).select("+password");


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
  await adminModel.findByIdAndUpdate(
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


export const getExpertsService = async (payload: any, res: Response) => {
  const experts = await expertsModel.find();

  return {
    success: true,
    message: "Experts fetched successfully",
    data: experts,
  };
};


export const createExpertsService = async (
  body: any,
  res: Response
) => {
  try {
    const identifier = customAlphabet("0123456789", 3);

    // Check if expert with same email already exists
    if (body.email) {
      const existingExpert = await expertsModel.findOne({ 
        email: body.email 
      });
      
      if (existingExpert) {
        return {
          success: false,
          message: "An expert with this email already exists",
          data: null,
        };
      }
    }

    // Create new expert with generated identifier
    const expert = await expertsModel.create({
      ...body,
      identifier: identifier(),
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    return {
      success: true,
      message: "Expert created successfully",
      data: expert,
    };
  } catch (error: any) {
    console.error("Error creating expert:", error);
    return {
      success: false,
      message: error.message || "Failed to create expert",
      data: null,
    };
  }
};

export const updateAExpertsService = async (
  id: string,
  body: any,
  res: Response
) => {
  try {
    // Check if expert exists
    const existingExpert = await expertsModel.findById(id);
    
    if (!existingExpert) {
      return {
        success: false,
        message: "Expert not found",
        data: null,
      };
    }

    // Check if email is being changed and if it's already taken
    if (body.email && body.email !== existingExpert.email) {
      const emailExists = await expertsModel.findOne({ 
        email: body.email,
        _id: { $ne: id } // Exclude current expert
      });
      
      if (emailExists) {
        return {
          success: false,
          message: "Email is already taken by another expert",
          data: null,
        };
      }
    }

    // Update expert
    const expert = await expertsModel.findByIdAndUpdate(
      id,
      {
        $set: {
          ...body,
          updatedAt: new Date(),
        },
      },
      {
        new: true, // Return updated document
        runValidators: true, // Run schema validators
      }
    );

    return {
      success: true,
      message: "Expert updated successfully",
      data: expert,
    };
  } catch (error: any) {
    console.error("Error updating expert:", error);
    return {
      success: false,
      message: error.message || "Failed to update expert",
      data: null,
    };
  }
};

export const deleteAExpertsService = async (id: string, res: Response) => {
    const user = await expertsModel.findById(id);
    if (!user) return errorResponseHandler("Expert not found", httpStatusCode.NOT_FOUND, res);

    // Delete user ----
    await expertsModel.findByIdAndDelete(id)

    return {
        success: true,
        message: "Expert deleted successfully"
    }
}

export const getAllworkshopService = async (payload: any, res: Response) => {
  const userId = payload.userId;
  // console.log("userIdpayload", userId);
  const user = await workshopModel.find();

  return {
    success: true,
    message: "Workshops fetched successfully",
    data: user
  };
}


export const getAworkshopService = async (
  id: string,
  body: any,
  res: Response
) => {
  try {
    // Check if expert exists
    const existingworkshop = await workshopModel.findById(id);
    
    if (!existingworkshop) {
      return {
        success: false,
        message: "Workshop not found",
        data: null,
      };
    }


    return {
      success: true,
      message: "workshop fetched successfully",
      data: existingworkshop,
    };
  } catch (error: any) {
    console.error("Error fetched workshop:", error);
    return {
      success: false,
      message: error.message || "Failed to fetched workshop",
      data: null,
    };
  }
};


export const updateAworkshopService = async (
  id: string,
  body: any,
  res: Response
) => {
  try {
    // Check if workshop exists
    const existingExpert = await workshopModel.findById(id);
    
    if (!existingExpert) {
      return {
        success: false,
        message: "workshop not found",
        data: null,
      };
    }

    // Update workshop
    const workshop = await workshopModel.findByIdAndUpdate(
      id,
      {
        $set: {
          ...body,
          updatedAt: new Date(),
        },
      },
      {
        new: true, // Return updated document
        runValidators: true, // Run schema validators
      }
    );

    return {
      success: true,
      message: "workshop updated successfully",
      data: workshop,
    };
  } catch (error: any) {
    console.error("Error updating workshop:", error);
    return {
      success: false,
      message: error.message || "Failed to update workshop",
      data: null,
    };
  }
};



// Dashboard

export const getDashboardStatsService = async (payload: any, res: Response) => {
    const currentDate = new Date();



    return currentDate;
};



















