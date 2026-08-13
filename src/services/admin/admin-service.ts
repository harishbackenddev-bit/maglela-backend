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
import { projectModel } from "src/models/projects/project-schema";
import { creditPlanModel } from "src/models/plans/plan-schema";
import { subscriptionPlanModel } from "src/models/plans/subscription-plan";
import { InvoiceModel } from "../../models/invoice/invoice-schema";
import { QuoteModel } from "../../models/invoice/quote-schema";
import { planOrderModel } from "../../models/orders/plan_orders";
import { invoiceOrderModel } from "../../models/orders/invoice_orders";


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
  payload: any,
  res: Response
) => {
  try {
    console.log("payload", payload);

    const { userId, body } = payload;

    console.log("expert body", body);

    const identifier = customAlphabet("0123456789", 3);

    // Check if expert with same email already exists
    if (body.email) {
      const existingExpert = await expertsModel.findOne({
        email: body.email,
      });

      if (existingExpert) {
        return {
          success: false,
          message: "An expert with this email already exists",
          data: null,
        };
      }
    }

    const expert = await expertsModel.create({
      ...body,
      userId,
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

  const user = await workshopModel.find().sort({ createdAt: -1 });

  return {
    success: true,
    message: "Workshops fetched successfully",
    data: user
  };
};


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


export const getAllprojectsService = async (payload: any, res: Response) => {
  // console.log("userIdpayload", userId);
  const user = await projectModel.find();

  return {
    success: true,
    message: "projects fetched successfully",
    data: user
  };
}


export const getAprojectsService = async (
  id: string,
  body: any,
  res: Response
) => {
  try {
    // Check if expert exists
    const projects = await projectModel.findById(id);
    
    if (!projects) {
      return {
        success: false,
        message: "projects not found",
        data: null,
      };
    }


    return {
      success: true,
      message: "projects fetched successfully",
      data: projects,
    };
  } catch (error: any) {
    console.error("Error fetched projects:", error);
    return {
      success: false,
      message: error.message || "Failed to fetched projects",
      data: null,
    };
  }
};


export const updateAprojectService = async (
  id: string,
  body: any,
  res: Response
) => {
  try {
    // Check if projects exists
    const existingprojects = await projectModel.findById(id);
    
    if (!existingprojects) {
      return {
        success: false,
        message: "projects not found",
        data: null,
      };
    }

    // Update projects
    const projects = await projectModel.findByIdAndUpdate(
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
      data: projects,
    };
  } catch (error: any) {
    console.error("Error updating projects:", error);
    return {
      success: false,
      message: error.message || "Failed to update projects",
      data: null,
    };
  }
};



export const getPlansService = async (payload: any, res: Response) => {
  const plans = await creditPlanModel.find();

  return {
    success: true,
    message: "Plans fetched successfully",
    data: plans,
  };
};

// services/admin/admin-service.ts

export const createPlansService = async (payload: any, res: Response) => {
  try {
    // The payload might be nested - extract the actual data
    const data = payload.body || payload;
    
    console.log("Creating plan with data:", data);

    // Check if plan with same name already exists
    if (data.name) {
      const existingPlan = await creditPlanModel.findOne({ 
        name: data.name.trim() 
      });
      
      if (existingPlan) {
        return {
          success: false,
          message: "A plan with this name already exists",
          data: null,
        };
      }
    }

    // Validate required fields
    if (!data.name || data.name.trim() === "") {
      return {
        success: false,
        message: "Plan name is required",
        data: null,
      };
    }

    // Create new plan with proper data
    const planData = {
      name: data.name.trim(),
      billingType: data.billingType || "One-time",
      credits: Number(data.credits) || 0,
      price: Number(data.price) || 0,
      description: data.description || "",
      features: Array.isArray(data.features) ? data.features : [],
      accentColor: data.accentColor || "#4f6ef7",
      isPopular: Boolean(data.isPopular),
      isActive: data.isActive !== undefined ? Boolean(data.isActive) : true,
    };

    console.log("Plan data to save:", planData);

    const plan = await creditPlanModel.create(planData);

    return {
      success: true,
      message: "Plan created successfully",
      data: plan,
    };
  } catch (error: any) {
    console.error("Error creating plan:", error);
    return {
      success: false,
      message: error.message || "Failed to create plan",
      data: null,
    };
  }
};

export const updateAPlansService = async (
  id: string,
  body: any,
  res: Response
) => {
  try {
    // Check if plan exists
    const existingPlan = await creditPlanModel.findById(id);
    
    if (!existingPlan) {
      return {
        success: false,
        message: "Plan not found",
        data: null,
      };
    }

    // Check if name is being changed and if it's already taken
    if (body.name && body.name !== existingPlan.name) {
      const nameExists = await creditPlanModel.findOne({ 
        name: body.name,
        _id: { $ne: id }
      });
      
      if (nameExists) {
        return {
          success: false,
          message: "Plan name is already taken by another plan",
          data: null,
        };
      }
    }

    // Check if planId is being changed and if it's already taken
    if (body.planId && body.planId !== existingPlan.planId) {
      const planIdExists = await creditPlanModel.findOne({ 
        planId: body.planId,
        _id: { $ne: id }
      });
      
      if (planIdExists) {
        return {
          success: false,
          message: "Plan ID is already taken by another plan",
          data: null,
        };
      }
    }

    // ✅ Handle status toggle - if isActive is provided, use it, otherwise keep existing
    const updateData = {
      ...body,
      updatedAt: new Date(),
    };

    // If only status toggle is needed (isActive field present)
    // No additional validation needed as isActive is a boolean

    // Update plan
    const plan = await creditPlanModel.findByIdAndUpdate(
      id,
      {
        $set: updateData,
      },
      {
        new: true,
        runValidators: true,
      }
    );

    // ✅ Check if status was changed
    const statusChanged = body.isActive !== undefined && body.isActive !== existingPlan.isActive;
    const statusMessage = statusChanged 
      ? ` and ${body.isActive ? 'activated' : 'deactivated'}`
      : '';

    return {
      success: true,
      message: `Plan updated successfully${statusMessage}`,
      data: plan,
    };
  } catch (error: any) {
    console.error("Error updating plan:", error);
    return {
      success: false,
      message: error.message || "Failed to update plan",
      data: null,
    };
  }
};

export const deleteAPlansService = async (id: string, res: Response) => {
  try {
    const plan = await creditPlanModel.findById(id);
    if (!plan) {
      return {
        success: false,
        message: "Plan not found",
        data: null,
      };
    }

    // Delete plan
    await creditPlanModel.findByIdAndDelete(id);

    return {
      success: true,
      message: "Plan deleted successfully",
      data: null,
    };
  } catch (error: any) {
    console.error("Error deleting plan:", error);
    return {
      success: false,
      message: error.message || "Failed to delete plan",
      data: null,
    };
  }
};





// ============================================
// GET COMPLETE DASHBOARD DATA
// ============================================
export const getDashboardStatsService = async (payload: any, res: Response) => {
    try {
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const startOfYear = new Date(now.getFullYear(), 0, 1);

        // ============================================
        // 1. STATS CARDS
        // ============================================

        // ✅ Total Users
        const totalUsers = await usersModel.countDocuments();

        // ✅ Users growth (month over month)
        const usersThisMonth = await usersModel.countDocuments({
            createdAt: { $gte: startOfMonth }
        });
        const usersLastMonth = await usersModel.countDocuments({
            createdAt: { $gte: startOfLastMonth, $lt: startOfMonth }
        });
        const usersGrowth = usersLastMonth > 0 
            ? ((usersThisMonth - usersLastMonth) / usersLastMonth) * 100 
            : usersThisMonth > 0 ? 100 : 0;

        // ✅ Active Projects
        const activeProjects = await projectModel.countDocuments({
            status: { $nin: ['completed', 'cancelled', 'archived'] }
        });

        // ✅ Projects growth
        const projectsThisMonth = await projectModel.countDocuments({
            createdAt: { $gte: startOfMonth },
            status: { $nin: ['cancelled', 'archived'] }
        });
        const projectsLastMonth = await projectModel.countDocuments({
            createdAt: { $gte: startOfLastMonth, $lt: startOfMonth },
            status: { $nin: ['cancelled', 'archived'] }
        });
        const projectsGrowth = projectsLastMonth > 0 
            ? ((projectsThisMonth - projectsLastMonth) / projectsLastMonth) * 100 
            : projectsThisMonth > 0 ? 100 : 0;

        // ✅ Active Experts
        const activeExperts = await expertsModel.countDocuments({
           
            isActive: true
        });

        // ✅ Experts growth
        const expertsThisMonth = await expertsModel.countDocuments({
            createdAt: { $gte: startOfMonth },
           
            isActive: true
        });
        const expertsLastMonth = await expertsModel.countDocuments({
            createdAt: { $gte: startOfLastMonth, $lt: startOfMonth },
           
            isActive: true
        });
        const expertsGrowth = expertsLastMonth > 0 
            ? ((expertsThisMonth - expertsLastMonth) / expertsLastMonth) * 100 
            : expertsThisMonth > 0 ? 100 : 0;

        // ✅ Monthly Revenue (from paid invoices and orders)
        const paidInvoices = await InvoiceModel.aggregate([
            {
                $match: {
                    status: 'paid',
                    paidAt: { $gte: startOfMonth }
                }
            },
            {
                $group: {
                    _id: null,
                    total: { $sum: '$grandTotal' }
                }
            }
        ]);

        const paidOrders = await planOrderModel.aggregate([
            {
                $match: {
                    status: 'paid',
                    paidAt: { $gte: startOfMonth }
                }
            },
            {
                $group: {
                    _id: null,
                    total: { $sum: '$totalAmount' }
                }
            }
        ]);

        const invoiceOrders = await invoiceOrderModel.aggregate([
            {
                $match: {
                    status: 'paid',
                    paidAt: { $gte: startOfMonth }
                }
            },
            {
                $group: {
                    _id: null,
                    total: { $sum: '$totalAmount' }
                }
            }
        ]);

        const monthlyRevenue = 
            (paidInvoices[0]?.total || 0) + 
            (paidOrders[0]?.total || 0) + 
            (invoiceOrders[0]?.total || 0);

        // ✅ Revenue growth
        const lastMonthInvoices = await InvoiceModel.aggregate([
            {
                $match: {
                    status: 'paid',
                    paidAt: { $gte: startOfLastMonth, $lt: startOfMonth }
                }
            },
            {
                $group: {
                    _id: null,
                    total: { $sum: '$grandTotal' }
                }
            }
        ]);

        const lastMonthOrders = await planOrderModel.aggregate([
            {
                $match: {
                    status: 'paid',
                    paidAt: { $gte: startOfLastMonth, $lt: startOfMonth }
                }
            },
            {
                $group: {
                    _id: null,
                    total: { $sum: '$totalAmount' }
                }
            }
        ]);

        const lastMonthInvoiceOrders = await invoiceOrderModel.aggregate([
            {
                $match: {
                    status: 'paid',
                    paidAt: { $gte: startOfLastMonth, $lt: startOfMonth }
                }
            },
            {
                $group: {
                    _id: null,
                    total: { $sum: '$totalAmount' }
                }
            }
        ]);

        const lastMonthRevenue = 
            (lastMonthInvoices[0]?.total || 0) + 
            (lastMonthOrders[0]?.total || 0) + 
            (lastMonthInvoiceOrders[0]?.total || 0);

        const revenueGrowth = lastMonthRevenue > 0 
            ? ((monthlyRevenue - lastMonthRevenue) / lastMonthRevenue) * 100 
            : monthlyRevenue > 0 ? 100 : 0;

        // ============================================
        // 2. CHART DATA (Last 12 Months)
        // ============================================

        const chartData = [];
        for (let i = 11; i >= 0; i--) {
            const monthDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);
            const monthName = monthDate.toLocaleString('en-US', { month: 'short' });

            // Users count for this month
            const usersCount = await usersModel.countDocuments({
                createdAt: { $gte: monthDate, $lt: monthEnd }
            });

            // Projects count for this month
            const projectsCount = await projectModel.countDocuments({
                createdAt: { $gte: monthDate, $lt: monthEnd },
                status: { $nin: ['cancelled', 'archived'] }
            });

            // Revenue for this month
            const monthInvoices = await InvoiceModel.aggregate([
                {
                    $match: {
                        status: 'paid',
                        paidAt: { $gte: monthDate, $lt: monthEnd }
                    }
                },
                { $group: { _id: null, total: { $sum: '$grandTotal' } } }
            ]);

            const monthOrders = await planOrderModel.aggregate([
                {
                    $match: {
                        status: 'paid',
                        paidAt: { $gte: monthDate, $lt: monthEnd }
                    }
                },
                { $group: { _id: null, total: { $sum: '$totalAmount' } } }
            ]);

            const monthInvoiceOrders = await invoiceOrderModel.aggregate([
                {
                    $match: {
                        status: 'paid',
                        paidAt: { $gte: monthDate, $lt: monthEnd }
                    }
                },
                { $group: { _id: null, total: { $sum: '$totalAmount' } } }
            ]);

            const monthRevenue = 
                (monthInvoices[0]?.total || 0) + 
                (monthOrders[0]?.total || 0) + 
                (monthInvoiceOrders[0]?.total || 0);

            chartData.push({
                month: monthName,
                users: usersCount,
                projects: projectsCount,
                revenue: Math.round(monthRevenue)
            });
        }

        // ============================================
        // 3. RECENT ACTIVITY
        // ============================================

        const activities: any[] = [];

        // Get recent user registrations
        const recentUsers = await usersModel.find()
            .sort({ createdAt: -1 })
            .limit(3)
            .select('name email createdAt');

        recentUsers.forEach(user => {
            activities.push({
                icon: 'Users',
                title: 'New user registered',
                description: `${user.name || user.email} joined as B2C user`,
                time: getTimeAgo(user.createdAt),
                color: '#4F6EF7'
            });
        });

        // Get recent projects
        const recentProjects = await projectModel.find()
            .sort({ createdAt: -1 })
            .limit(3)
            .select('title clientName status createdAt');

        recentProjects.forEach(project => {
            const statusMap: Record<string, string> = {
                'submitted': 'submitted',
                'in_review': 'in review',
                'in_progress': 'in progress',
                'completed': 'completed'
            };
            const statusText = statusMap[project.status] || project.status;
            activities.push({
                icon: 'FolderKanban',
                title: `Project ${statusText}`,
                description: project.title,
                time: getTimeAgo(project.createdAt),
                color: project.status === 'completed' ? '#22C9A5' : '#F59E0B'
            });
        });

        // Get recent experts
        const recentExperts = await expertsModel.find()
            .sort({ createdAt: -1 })
            .limit(2)
            .select('name expertise createdAt');

        recentExperts.forEach(expert => {
            activities.push({
                icon: 'UserCheck',
                title: 'Expert onboarded',
                description: `${expert.name || 'Expert'} added as ${expert.expertise || 'Expert'}`,
                time: getTimeAgo(expert.createdAt),
                color: '#F59E0B'
            });
        });

        // Get recent payments
        const recentPayments = await invoiceOrderModel.find()
            .sort({ createdAt: -1 })
            .limit(3)
            .select('invoiceNumber totalAmount status createdAt userEmail');

        recentPayments.forEach(payment => {
            activities.push({
                icon: 'CreditCard',
                title: `Invoice payment ${payment.status}`,
                description: `Invoice ${payment.invoiceNumber} - R${payment.totalAmount.toLocaleString()}`,
                time: getTimeAgo(payment.createdAt),
                color: payment.status === 'paid' ? '#22C9A5' : '#E05C97'
            });
        });

        // Get recent plan purchases
        const recentPlanPurchases = await planOrderModel.find()
            .sort({ createdAt: -1 })
            .limit(2)
            .select('planName credits totalAmount status createdAt userEmail');

        recentPlanPurchases.forEach(purchase => {
            activities.push({
                icon: 'CreditCard',
                title: 'Credit plan purchased',
                description: `${purchase.planName || 'Credit Plan'} - ${purchase.credits || 0} credits`,
                time: getTimeAgo(purchase.createdAt),
                color: '#E05C97'
            });
        });

        // Sort activities by time (most recent first) and limit to 10
        activities.sort((a, b) => {
            const timeA = parseInt(a.time);
            const timeB = parseInt(b.time);
            return timeA - timeB;
        });

        const recentActivities = activities.slice(0, 10);

        // ============================================
        // 4. STATUS CARDS
        // ============================================

        // Projects in review
        const projectsInReview = await projectModel.countDocuments({
            status: 'Pending'
        });

        // Projects completed this month
        const projectsCompletedThisMonth = await projectModel.countDocuments({
            status: 'publish',
            updatedAt: { $gte: startOfMonth }
        });

        // Pending expert applications
        const pendingExperts = await expertsModel.countDocuments({
            isActive: 'false'
        });

        // ============================================
        // 5. PIE CHART DATA
        // ============================================

        // User distribution
        const totalUsersCount = await usersModel.countDocuments();
        const newUsersCount = await usersModel.countDocuments({
            createdAt: { $gte: startOfMonth }
        });
        const inactiveUsersCount = await usersModel.countDocuments({
            lastLogin: { $lt: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000) }
        });

        const pieData = [
            { name: 'Active Users', value: totalUsersCount - inactiveUsersCount },
            { name: 'New Users', value: newUsersCount },
            { name: 'Inactive Users', value: inactiveUsersCount },
        ];

        // ============================================
        // RESPONSE
        // ============================================

        return {
            success: true,
            message: "Dashboard data fetched successfully",
            data: {
                stats: {
                    totalUsers,
                    activeProjects,
                    activeExperts,
                    monthlyRevenue: Math.round(monthlyRevenue),
                    usersGrowth: Math.round(usersGrowth * 10) / 10,
                    projectsGrowth: Math.round(projectsGrowth * 10) / 10,
                    expertsGrowth: Math.round(expertsGrowth * 10) / 10,
                    revenueGrowth: Math.round(revenueGrowth * 10) / 10
                },
                chartData,
                recentActivities,
                statusCards: {
                    projectsInReview,
                    projectsCompletedThisMonth,
                    pendingExperts
                },
                pieData
            }
        };

    } catch (error: any) {
        console.error('❌ Dashboard Data Error:', error);
        return {
            success: false,
            message: error.message || 'Failed to fetch dashboard data',
            error: error.message
        };
    }
};

// ============================================
// HELPER FUNCTION: Get Time Ago
// ============================================
const getTimeAgo = (date: Date): string => {
    const now = new Date();
    const diffMs = now.getTime() - new Date(date).getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} min ago`;
    if (diffHours < 24) return `${diffHours} hr ago`;
    if (diffDays < 7) return `${diffDays} days ago`;
    return new Date(date).toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric' 
    });
};





export const getNotificationsService = async (payload: any, res: Response) => {
    try {
        const activities: any[] = [];

        // Get recent user registrations
        const recentUsers = await usersModel.find()
            .sort({ createdAt: -1 })
            .limit(3)
            .select('name email createdAt');

        recentUsers.forEach(user => {
            activities.push({
                id: `user-${user._id}`,
                icon: 'Users',
                title: 'New user registered',
                description: `${user.name || user.email} joined as B2C user`,
                time: getTimeAgo(user.createdAt),
                timestamp: user.createdAt,
                read: false,
                type: 'user_registration'
            });
        });

        // Get recent projects
        const recentProjects = await projectModel.find()
            .sort({ createdAt: -1 })
            .limit(3)
            .select('title clientName status createdAt');

        recentProjects.forEach(project => {
            const statusMap: Record<string, string> = {
                'submitted': 'submitted',
                'in_review': 'in review',
                'in_progress': 'in progress',
                'completed': 'completed'
            };
            const statusText = statusMap[project.status] || project.status;
            activities.push({
                id: `project-${project._id}`,
                icon: 'FolderKanban',
                title: `Project ${statusText}`,
                description: project.title,
                time: getTimeAgo(project.createdAt),
                timestamp: project.createdAt,
                read: false,
                type: 'project_update'
            });
        });

        // Get recent experts
        const recentExperts = await expertsModel.find()
            .sort({ createdAt: -1 })
            .limit(2)
            .select('name expertise createdAt');

        recentExperts.forEach(expert => {
            activities.push({
                id: `expert-${expert._id}`,
                icon: 'UserCheck',
                title: 'Expert onboarded',
                description: `${expert.name || 'Expert'} added as ${expert.expertise || 'Expert'}`,
                time: getTimeAgo(expert.createdAt),
                timestamp: expert.createdAt,
                read: false,
                type: 'expert_onboarding'
            });
        });

        // Get recent payments
        const recentPayments = await invoiceOrderModel.find()
            .sort({ createdAt: -1 })
            .limit(3)
            .select('invoiceNumber totalAmount status createdAt userEmail');

        recentPayments.forEach(payment => {
            activities.push({
                id: `payment-${payment._id}`,
                icon: 'CreditCard',
                title: `Invoice payment ${payment.status}`,
                description: `Invoice ${payment.invoiceNumber} - R${payment.totalAmount.toLocaleString()}`,
                time: getTimeAgo(payment.createdAt),
                timestamp: payment.createdAt,
                read: false,
                type: 'payment_received'
            });
        });

        // Get recent plan purchases
        const recentPlanPurchases = await planOrderModel.find()
            .sort({ createdAt: -1 })
            .limit(2)
            .select('planName credits totalAmount status createdAt userEmail');

        recentPlanPurchases.forEach(purchase => {
            activities.push({
                id: `plan-${purchase._id}`,
                icon: 'CreditCard',
                title: 'Credit plan purchased',
                description: `${purchase.planName || 'Credit Plan'} - ${purchase.credits || 0} credits`,
                time: getTimeAgo(purchase.createdAt),
                timestamp: purchase.createdAt,
                read: false,
                type: 'credit_purchase'
            });
        });

        // Sort by timestamp (most recent first)
        activities.sort((a, b) => {
            return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
        });

        // Limit results
        const limitedActivities = activities.slice(0, 10);

        return {
            success: true,
            message: "Notifications fetched successfully",
            data: limitedActivities
        };

    } catch (error: any) {
        console.error('❌ Notifications Error:', error);
        return {
            success: false,
            message: error.message || 'Failed to fetch notifications',
            error: error.message
        };
    }
};















// services/admin/admin-service.ts

// services/admin/admin-service.ts

export const getSubscriptionPlansService = async (payload: any, res: Response) => {
  try {
    // Check if plans exist
    let plans = await subscriptionPlanModel.find().sort({ displayOrder: 1, price: 1 });

    // If no plans exist, save default plans
    if (plans.length === 0) {
      console.log("📦 Seeding default subscription plans...");

      const defaultPlans = [
        {
          tier: "Basic",
          name: "Individual Scholar",
          billingType: "Monthly",
          audience: "Individual Academics & Early-Career Researchers",
          targetAudience: "Postdocs, lecturers, and doctoral candidates building their personal brands",
          monthlyPrice: "R 450",
          yearlyPrice: "R 4,500",
          creditsMonthly: 100,
          creditsYearly: 1200,
          periodLabel: "per month",
          buttonLabel: "Get Started",
          buttonLink: "/contact",
          features: [
            "10 Document translations/month with AI Story Engine",
            "1 Standard Academic Profile with Voice & Tone Calibrator",
            "Step-by-step tools for op-eds, policy briefs & thought leadership",
            "Access to foundational AI tools to articulate research identity",
            "Request 'Magalela Polish' at standard hourly/project rate"
          ],
          isPopular: false,
          isActive: true,
          displayOrder: 1,
          price: 450,
          credits: 100,
          description: "Individual Academics & Early-Career Researchers. Postdocs, lecturers, and doctoral candidates building their personal brands"
        },
        {
          tier: "Basic",
          name: "Individual Scholar",
          billingType: "Yearly",
          audience: "Individual Academics & Early-Career Researchers",
          targetAudience: "Postdocs, lecturers, and doctoral candidates building their personal brands",
          monthlyPrice: "R 4,500",
          yearlyPrice: "R 4,500",
          creditsMonthly: 1200,
          creditsYearly: 1200,
          periodLabel: "per year",
          buttonLabel: "Get Started",
          buttonLink: "/contact",
          features: [
            "120 Document translations/year with AI Story Engine",
            "1 Standard Academic Profile with Voice & Tone Calibrator",
            "Step-by-step tools for op-eds, policy briefs & thought leadership",
            "Access to foundational AI tools to articulate research identity",
            "Request 'Magalela Polish' at standard hourly/project rate",
            "💡 Save 20% compared to monthly billing"
          ],
          isPopular: false,
          isActive: true,
          displayOrder: 4,
          price: 4500,
          credits: 1200,
          description: "Individual Academics & Early-Career Researchers. Postdocs, lecturers, and doctoral candidates building their personal brands"
        },
        {
          tier: "Pro",
          name: "Department",
          billingType: "Monthly",
          audience: "Faculty-Level Comms Teams & Corporate Social Impact Teams",
          targetAudience: "Faculty marketing units and research centres needing overflow capacity",
          monthlyPrice: "R 4,500",
          yearlyPrice: "R 45,000",
          creditsMonthly: 500,
          creditsYearly: 6000,
          periodLabel: "per month",
          buttonLabel: "Get Started",
          buttonLink: "/contact",
          features: [
            "50 Document translations/month with AI Story Engine",
            "Up to 5 Custom Voice Profiles for team members",
            "Consistent overflow capacity for high-volume periods",
            "2 hours of human-led specialist science communication editing/month",
            "Social media content aligned with institutional tone",
            "Introduction to premium journalism, strategy & storytelling services"
          ],
          isPopular: true,
          isActive: true,
          displayOrder: 2,
          price: 4500,
          credits: 500,
          description: "Department. Faculty-Level Comms Teams & Corporate Social Impact Teams. Faculty marketing units and research centres needing overflow capacity"
        },
        {
          tier: "Pro",
          name: "Department",
          billingType: "Yearly",
          audience: "Faculty-Level Comms Teams & Corporate Social Impact Teams",
          targetAudience: "Faculty marketing units and research centres needing overflow capacity",
          monthlyPrice: "R 45,000",
          yearlyPrice: "R 45,000",
          creditsMonthly: 6000,
          creditsYearly: 6000,
          periodLabel: "per year",
          buttonLabel: "Get Started",
          buttonLink: "/contact",
          features: [
            "600 Document translations/year with AI Story Engine",
            "Up to 5 Custom Voice Profiles for team members",
            "Consistent overflow capacity for high-volume periods",
            "24 hours of human-led specialist science communication editing/year",
            "Social media content aligned with institutional tone",
            "Introduction to premium journalism, strategy & storytelling services",
            "💡 Save 20% compared to monthly billing"
          ],
          isPopular: false,
          isActive: true,
          displayOrder: 5,
          price: 45000,
          credits: 6000,
          description: "Department. Faculty-Level Comms Teams & Corporate Social Impact Teams. Faculty marketing units and research centres needing overflow capacity"
        },
        {
          tier: "Enterprise",
          name: "Organisation",
          billingType: "Monthly",
          audience: "Comms Directors, Exec Leaders, & Global Dev Orgs",
          targetAudience: "Vice-chancellors, university advancement directors, and international NGOs",
          monthlyPrice: "R 25,000+",
          yearlyPrice: "R 250,000+",
          creditsMonthly: 2000,
          creditsYearly: 24000,
          periodLabel: "per month",
          buttonLabel: "Contact Sales",
          buttonLink: "/contact",
          features: [
            "Unlimited document processing with AI Story Engine",
            "Unlimited Institutional Voice Profiles",
            "IP protection through precise sourcing and rigorous editorial standards",
            "Dedicated account manager with integrated narrative impact strategy",
            "Custom AI models trained on institutional archives",
            "Complex multi-user collaboration with top-tier security",
            "Premium service combining journalism, strategy, editing & storytelling"
          ],
          isPopular: false,
          isActive: true,
          displayOrder: 3,
          price: 25000,
          credits: 2000,
          description: "Organisation. Comms Directors, Exec Leaders, & Global Dev Orgs. Vice-chancellors, university advancement directors, and international NGOs"
        },
        {
          tier: "Enterprise",
          name: "Organisation",
          billingType: "Yearly",
          audience: "Comms Directors, Exec Leaders, & Global Dev Orgs",
          targetAudience: "Vice-chancellors, university advancement directors, and international NGOs",
          monthlyPrice: "R 250,000+",
          yearlyPrice: "R 250,000+",
          creditsMonthly: 24000,
          creditsYearly: 24000,
          periodLabel: "per year",
          buttonLabel: "Contact Sales",
          buttonLink: "/contact",
          features: [
            "Unlimited document processing with AI Story Engine",
            "Unlimited Institutional Voice Profiles",
            "IP protection through precise sourcing and rigorous editorial standards",
            "Dedicated account manager with integrated narrative impact strategy",
            "Custom AI models trained on institutional archives",
            "Complex multi-user collaboration with top-tier security",
            "Premium service combining journalism, strategy, editing & storytelling",
            "💡 Save 20% compared to monthly billing"
          ],
          isPopular: false,
          isActive: true,
          displayOrder: 6,
          price: 250000,
          credits: 24000,
          description: "Organisation. Comms Directors, Exec Leaders, & Global Dev Orgs. Vice-chancellors, university advancement directors, and international NGOs"
        }
      ];

      // Method 1: Using insertMany with ordered: false to continue on errors
      try {
        await subscriptionPlanModel.insertMany(defaultPlans, { ordered: false });
        console.log("✅ All 6 default subscription plans saved successfully");
      } catch (insertError: any) {
        // If duplicate key error, some plans may already exist
        if (insertError.code === 11000) {
          console.log("⚠️ Some plans already exist, attempting individual inserts...");
          
          // Method 2: Individual inserts for remaining plans
          let savedCount = 0;
          for (const plan of defaultPlans) {
            try {
              const existing = await subscriptionPlanModel.findOne({
                name: plan.name,
                tier: plan.tier
              });
              
              if (!existing) {
                await subscriptionPlanModel.create(plan);
                savedCount++;
                console.log(`✅ Saved: ${plan.name} (${plan.billingType})`);
              } else {
                console.log(`⏭️ Skipped: ${plan.name} (${plan.billingType}) - already exists`);
              }
            } catch (err) {
              console.error(`❌ Error saving ${plan.name}:`, err);
            }
          }
          console.log(`✅ ${savedCount} new plans saved successfully`);
        } else {
          throw insertError;
        }
      }

      // Fetch the newly created plans
      plans = await subscriptionPlanModel.find().sort({ displayOrder: 1, price: 1 });
    }

    return {
      success: true,
      message: "Subscription plans fetched successfully",
      data: plans,
    };
  } catch (error: any) {
    console.error("Error fetching subscription plans:", error);
    return {
      success: false,
      message: error.message || "Failed to fetch subscription plans",
      data: null,
    };
  }
};
// services/admin/admin-service.ts

export const createSubscriptionPlansService = async (
  payload: any,
  res: Response
) => {
  try {
    // The payload might be nested - extract the actual data
    const data = payload.body || payload;

    console.log("Creating plan with data:", data);

    // Check if plan with same name already exists
    if (data.name) {
      const existingPlan = await subscriptionPlanModel.findOne({
        name: data.name.trim(),
      });

      if (existingPlan) {
        return {
          success: false,
          message: "A plan with this name already exists",
          data: null,
        };
      }
    }

    // Validate required fields
    if (!data.name || data.name.trim() === "") {
      return {
        success: false,
        message: "Plan name is required",
        data: null,
      };
    }

    if (!data.tier || data.tier.trim() === "") {
      return {
        success: false,
        message: "Plan tier is required",
        data: null,
      };
    }

    if (
      data.monthlyPrice === undefined ||
      data.monthlyPrice === null ||
      data.monthlyPrice === ""
    ) {
      return {
        success: false,
        message: "Monthly price is required",
        data: null,
      };
    }

    // Create new plan with proper data
    const planData = {
      tier: data.tier.trim(),

      name: data.name.trim(),

      audience: data.audience || "",
      targetAudience: data.targetAudience || "",

      monthlyPrice: Number(data.monthlyPrice) || 0,
      yearlyPrice: Number(data.yearlyPrice) || 0,

      creditsMonthly: Number(data.creditsMonthly) || 0,
      creditsYearly: Number(data.creditsYearly) || 0,

      periodLabel: data.periodLabel || "",
      buttonLabel: data.buttonLabel || "",
      buttonLink: data.buttonLink || "",

      billingType: data.billingType || "One-time",

      credits: Number(data.credits) || 0,
      price: Number(data.price) || 0,

      description: data.description || "",

      features: Array.isArray(data.features)
        ? data.features
        : [],

      accentColor: data.accentColor || "#4f6ef7",

      isPopular: Boolean(data.isPopular),

      isActive:
        data.isActive !== undefined
          ? Boolean(data.isActive)
          : true,
    };

    console.log("Plan data to save:", planData);

    const plan = await subscriptionPlanModel.create(planData);

    return {
      success: true,
      message: "Plan created successfully",
      data: plan,
    };
  } catch (error: any) {
    console.error("Error creating plan:", error);

    return {
      success: false,
      message: error.message || "Failed to create plan",
      data: null,
    };
  }
};

export const updateASubscriptionPlansService = async (
  id: string,
  body: any,
  res: Response
) => {
  try {
    // Check if plan exists
    const existingPlan = await subscriptionPlanModel.findById(id);
    
    if (!existingPlan) {
      return {
        success: false,
        message: "Plan not found",
        data: null,
      };
    }

    // Check if name is being changed and if it's already taken
    if (body.name && body.name !== existingPlan.name) {
      const nameExists = await subscriptionPlanModel.findOne({ 
        name: body.name,
        _id: { $ne: id }
      });
      
      if (nameExists) {
        return {
          success: false,
          message: "Plan name is already taken by another plan",
          data: null,
        };
      }
    }

    // Check if planId is being changed and if it's already taken
    if (body.planId && body.planId !== existingPlan.planId) {
      const planIdExists = await subscriptionPlanModel.findOne({ 
        planId: body.planId,
        _id: { $ne: id }
      });
      
      if (planIdExists) {
        return {
          success: false,
          message: "Plan ID is already taken by another plan",
          data: null,
        };
      }
    }

    // ✅ Handle status toggle - if isActive is provided, use it, otherwise keep existing
    const updateData = {
      ...body,
      updatedAt: new Date(),
    };

    // If only status toggle is needed (isActive field present)
    // No additional validation needed as isActive is a boolean

    // Update plan
    const plan = await subscriptionPlanModel.findByIdAndUpdate(
      id,
      {
        $set: updateData,
      },
      {
        new: true,
        runValidators: true,
      }
    );

    // ✅ Check if status was changed
    const statusChanged = body.isActive !== undefined && body.isActive !== existingPlan.isActive;
    const statusMessage = statusChanged 
      ? ` and ${body.isActive ? 'activated' : 'deactivated'}`
      : '';

    return {
      success: true,
      message: `Plan updated successfully${statusMessage}`,
      data: plan,
    };
  } catch (error: any) {
    console.error("Error updating plan:", error);
    return {
      success: false,
      message: error.message || "Failed to update plan",
      data: null,
    };
  }
};

export const deleteASubscriptionPlansService = async (id: string, res: Response) => {
  try {
    const plan = await subscriptionPlanModel.findById(id);
    if (!plan) {
      return {
        success: false,
        message: "Plan not found",
        data: null,
      };
    }

    // Delete plan
    await subscriptionPlanModel.findByIdAndDelete(id);

    return {
      success: true,
      message: "Plan deleted successfully",
      data: null,
    };
  } catch (error: any) {
    console.error("Error deleting plan:", error);
    return {
      success: false,
      message: error.message || "Failed to delete plan",
      data: null,
    };
  }
};