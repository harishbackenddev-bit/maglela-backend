import { vi } from "vitest";
import fs from "fs";
import os from "os";
import path from "path";

// Several modules create folders relative to cwd at import time (public/uploads/...).
// Run tests from a throw-away temp dir so nothing is created inside the project.
process.chdir(fs.mkdtempSync(path.join(os.tmpdir(), "backend-ut-")));

// Dummy env so modules that read env at import time (OpenAI/Anthropic/Twilio/JWT/Mongo) don't blow up
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

// keep test output clean
vi.spyOn(console, "log").mockImplementation(() => {});
vi.spyOn(console, "error").mockImplementation(() => {});
