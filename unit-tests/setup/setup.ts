import { vi } from "vitest";
import fs from "fs";
import os from "os";
import path from "path";



process.chdir(fs.mkdtempSync(path.join(os.tmpdir(), "backend-ut-")));


process.env.JWT_SECRET = "test-secret";
process.env.MONGO_URL = "mongodb://localhost:27017/test";
process.env.OPENAI_API_KEY = "sk-test";
process.env.ANTHROPIC_API_KEY = "sk-ant-test";
process.env.TWILIO_ACCOUNT_SID = "ACtest";
process.env.TWILIO_AUTH_TOKEN = "test";
process.env.TWILIO_PHONE_NUMBER = "+10000000000";
process.env.EMAIL_USER = "test@example.com";
process.env.EMAIL_PASS = "pass";
process.env.PORT = "0";
process.env.FRONTEND_URL = "http://localhost:5173";
process.env.BASE_URL = "http://localhost:8000";


vi.spyOn(console, "log").mockImplementation(() => {});
vi.spyOn(console, "error").mockImplementation(() => {});
