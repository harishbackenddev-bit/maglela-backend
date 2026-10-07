import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import path from "path";
import { fileURLToPath } from "url";
import connectDB from "./config/db.js";
import { admin, user, ai } from "./routes/index.js";
import bodyParser from "body-parser";
import { login } from "./controllers/admin/admin.js";
import { forgotPassword } from "./controllers/user/user.js";
import { verifyPasswordReset } from "./controllers/user/user.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = process.env.PORT || 8000;

const app = express();

export { app };

app.set("trust proxy", true);

const corsOptions = {
  origin: [
    "http://localhost:5173",
    "http://localhost:3000",
    "http://127.0.0.1:5173",
    "http://127.0.0.1:3000",
    "http://localhost:5174",
    "https://mutual-maglela.vercel.app",
  ],
  methods: ["GET", "POST", "PATCH", "DELETE", "PUT", "OPTIONS"],
  credentials: true,
  allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
};

app.use(cors(corsOptions));

app.options("*", cors(corsOptions));

app.use(
  bodyParser.json({
    verify: (req: any, res, buf) => {
      req.rawBody = buf.toString();
    },
  })
);

app.use(cookieParser());

app.use(express.json());

app.use(express.urlencoded({ extended: true }));

const dir = path.join(__dirname, "static");

app.use(express.static(dir));

app.use(
  "/uploads",
  express.static(path.join(__dirname, "../public/uploads"))
);

connectDB();

app.get("/", (_, res) => {
  res.send("Hello world entry point 🚀✅");
});

app.use("/api/admin", admin);

app.use("/api/auth", user);

app.use("/api/login", login);

app.use("/api/forgot-password", forgotPassword);

app.use("/api/reset-password", verifyPasswordReset);

app.use("/api", ai);

app.use("/api/toolkit", user);

app.use("/api/user", user);

app.use((err: any, req: any, res: any, next: any) => {
  console.error("Error:", err);

  res.status(err.status || 500).json({
    success: false,
    message: err.message || "Internal server error",
  });
});

export const startServer = () => {
  return app.listen(PORT, () => {
    console.log(`Server is listening on port ${PORT}`);
  });
};

if (process.env.NODE_ENV !== "test") {
  startServer();
}