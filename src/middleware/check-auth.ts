import { NextFunction, Request, Response } from "express";
import { httpStatusCode } from "src/lib/constant";
import { configDotenv } from "dotenv";
import jwt, { JwtPayload } from 'jsonwebtoken';
import { usersModel } from "src/models/user/user-schema";
configDotenv()
declare global {
    namespace Express {
        interface Request {
            user?: string | JwtPayload
        }
    }
}

export const checkAuth = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];

    if (!token) {
      return res.status(httpStatusCode.UNAUTHORIZED).json({
        success: false,
        message: "Unauthorized token missing"
      });
    }

    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET as string
    ) as JwtPayload;

    (req as any).currentUser = decoded.id;

    next();
  } catch (error) {
    console.log(error);

    return res.status(httpStatusCode.UNAUTHORIZED).json({
      success: false,
      message: "Unauthorized token invalid or expired"
    });
  }
};