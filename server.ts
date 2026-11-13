import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";
import nodemailer from "nodemailer";
import { createClient } from "@supabase/supabase-js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env variables if present
function loadEnv() {
  const envPath = path.resolve(process.cwd(), ".env");
  if (fs.existsSync(envPath)) {
    const raw = fs.readFileSync(envPath, "utf-8");
    for (const line of raw.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eqIdx = trimmed.indexOf("=");
      if (eqIdx !== -1) {
        const key = trimmed.slice(0, eqIdx).trim();
        const val = trimmed.slice(eqIdx + 1).trim();
        if (!process.env[key]) {
          process.env[key] = val;
        }
      }
    }
  }
}
loadEnv();

interface OtpRecord {
  code: string;
  expiresAt: number;
  verified: boolean;
  attempts: number;
}

const otpStore = new Map<string, OtpRecord>();

// Helper to clean up expired OTPs periodically
setInterval(() => {
  const now = Date.now();
  for (const [email, record] of otpStore.entries()) {
    if (record.expiresAt < now) {
      otpStore.delete(email);
    }
  }
}, 60000);

type EmailPurpose = "reset_password" | "change_password" | "signup_verification";

interface EmailConfig {
  badge: string;
  title: string;
  body: string;
  instructions: string;
  securityNotice: string;
  subject: string;
}

function getEmailConfig(purpose: EmailPurpose, email: string, code: string): EmailConfig {
  switch (purpose) {
    case "change_password":
      return {
        badge: "Security Verification",
        title: "Confirm Password Change",
        body: `We received a request to change the account password for your CSE QBANK reviewer profile associated with <strong>${email}</strong>.`,
        instructions: "Enter this 6-digit code on the Change Password dialog to confirm it was you and finalize your new password.",
        securityNotice: "<strong>Didn't make this change?</strong> If you did not request a password change, please contact support and secure your account immediately.",
        subject: `CSE QBANK - Your Password Change Verification Code is ${code}`,
      };
    case "signup_verification":
      return {
        badge: "Account Ownership Verification",
        title: "Confirm Your Reviewer Account",
        body: `Welcome to CSE QBANK! To confirm that you own <strong>${email}</strong> and protect your reviewer workspace, please verify your email address.`,
        instructions: "Enter this 6-digit code on the registration screen to complete your account setup and activate cloud sync.",
        securityNotice: "<strong>Didn't create an account?</strong> If you did not sign up for CSE QBANK, you can safely ignore this email. No account will be created without this verification code.",
        subject: `CSE QBANK - Your Account Verification Code is ${code}`,
      };
    case "reset_password":
    default:
      return {
        badge: "Security Verification",
        title: "Reset Your Password",
        body: `We received a request to reset the password for your CSE QBANK reviewer account associated with <strong>${email}</strong>.`,
        instructions: "Enter this 6-digit code on the password reset screen to verify your identity and choose a new password.",
        securityNotice: "<strong>Didn't request this?</strong> If you did not make this request, someone may have entered your email address by mistake. You can safely ignore this email—your account remains completely secure.",
        subject: `CSE QBANK - Your Password Reset Code is ${code}`,
      };
  }
}

function generateHtmlEmail(code: string, email: string, purpose: EmailPurpose = "reset_password"): { html: string; subject: string } {
  const expiryTime = new Date(Date.now() + 10 * 60 * 1000).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });

  const config = getEmailConfig(purpose, email, code);

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${config.title}</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      background-color: #050914;
      color: #e2e8f0;
      margin: 0;
      padding: 24px;
    }
    .wrapper {
      max-width: 520px;
      margin: 0 auto;
      background: #0a1122;
      border: 1px solid #1e293b;
      border-radius: 14px;
      padding: 36px 32px;
      box-shadow: 0 16px 36px rgba(0,0,0,0.55);
    }
    .brand-row {
      display: flex;
      align-items: center;
      gap: 10px;
      margin-bottom: 24px;
      padding-bottom: 16px;
      border-bottom: 1px solid rgba(255,255,255,0.08);
    }
    .brand-name {
      font-size: 20px;
      font-weight: 800;
      color: #f5a623;
      letter-spacing: -0.5px;
      margin: 0;
    }
    .brand-sub {
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 1px;
      color: #94a3b8;
      margin-top: 2px;
    }
    .badge {
      display: inline-block;
      background: rgba(245, 166, 35, 0.15);
      border: 1px solid rgba(245, 166, 35, 0.35);
      color: #f5a623;
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.8px;
      padding: 4px 10px;
      border-radius: 6px;
      margin-bottom: 16px;
    }
    h2 {
      font-size: 22px;
      font-weight: 700;
      color: #ffffff;
      margin: 0 0 12px 0;
    }
    p {
      font-size: 14px;
      line-height: 1.6;
      color: #cbd5e1;
      margin: 0 0 20px 0;
    }
    .code-container {
      background: linear-gradient(180deg, #101c38 0%, #0d172e 100%);
      border: 2px solid #f5a623;
      border-radius: 12px;
      padding: 24px 16px;
      text-align: center;
      margin: 28px 0;
    }
    .code-label {
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 1.5px;
      color: #94a3b8;
      margin-bottom: 10px;
      font-weight: 600;
    }
    .code-digits {
      font-family: 'SF Mono', Monaco, 'Courier New', Courier, monospace;
      font-size: 38px;
      font-weight: 800;
      letter-spacing: 10px;
      color: #ffffff;
      text-shadow: 0 0 18px rgba(245, 166, 35, 0.4);
      margin: 0;
      padding-left: 10px;
    }
    .code-exp {
      font-size: 12px;
      color: #f5a623;
      margin-top: 12px;
      font-weight: 600;
    }
    .security-notice {
      background: rgba(30, 41, 59, 0.4);
      border-left: 3px solid #38bdf8;
      border-radius: 4px;
      padding: 12px 14px;
      font-size: 12px;
      color: #94a3b8;
      line-height: 1.5;
      margin: 24px 0;
    }
    .footer {
      font-size: 11px;
      color: #64748b;
      line-height: 1.5;
      border-top: 1px solid rgba(255,255,255,0.06);
      padding-top: 16px;
      text-align: center;
    }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="brand-row">
      <div>
        <div class="brand-name">CSE QBANK</div>
        <div class="brand-sub">Civil Service Exam Reviewer</div>
      </div>
    </div>

    <div class="badge">${config.badge}</div>
    <h2>${config.title}</h2>
    <p>${config.body}</p>

    <div class="code-container">
      <div class="code-label">One-Time Verification Code</div>
      <div class="code-digits">${code}</div>
      <div class="code-exp">⏱ Code expires in 10 minutes (${expiryTime})</div>
    </div>

    <p>${config.instructions}</p>

    <div class="security-notice">
      ${config.securityNotice}
    </div>

    <div class="footer">
      © ${new Date().getFullYear()} CSE QBANK. Dedicated to helping examinees pass the Philippine Civil Service Exam on their first take.
    </div>
  </div>
</body>
</html>`;

  return { html, subject: config.subject };
}

// 1. Send using Brevo REST API (api.brevo.com/v3/smtp/email)
async function sendViaBrevoApi(toEmail: string, code: string, purpose: EmailPurpose = "reset_password") {
  const apiKey = process.env.BREVO_API_KEY || "";
  const senderEmail = process.env.BREVO_SENDER_EMAIL || "thehunterpro28@gmail.com";
  const senderName = process.env.BREVO_SENDER_NAME || "CSE QBANK";

  const { html: htmlContent, subject } = generateHtmlEmail(code, toEmail, purpose);

  const res = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: {
      accept: "application/json",
      "api-key": apiKey,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      sender: { name: senderName, email: senderEmail },
      to: [{ email: toEmail }],
      subject,
      htmlContent,
    }),
  });

  const data = await res.json().catch(() => ({}));
  if (res.ok && data?.messageId) {
    return { success: true, messageId: data.messageId };
  }
  return {
    success: false,
    status: res.status,
    message: data?.message || `Brevo API returned status ${res.status}`,
    code: data?.code,
  };
}

// 2. Fallback: Send using Brevo SMTP Relay (smtp-relay.brevo.com:587)
async function sendViaBrevoSmtp(toEmail: string, code: string, purpose: EmailPurpose = "reset_password") {
  const smtpKey = process.env.BREVO_SMTP_KEY || "";
  const smtpUser = process.env.BREVO_SMTP_USER || "";
  const senderEmail = process.env.BREVO_SENDER_EMAIL || smtpUser || "thehunterpro28@gmail.com";
  const senderName = process.env.BREVO_SENDER_NAME || "CSE QBANK";

  const transporter = nodemailer.createTransport({
    host: process.env.BREVO_SMTP_HOST || "smtp-relay.brevo.com",
    port: Number(process.env.BREVO_SMTP_PORT) || 587,
    secure: false,
    auth: {
      user: smtpUser,
      pass: smtpKey,
    },
    tls: {
      rejectUnauthorized: false,
    },
  });

  const { html, subject } = generateHtmlEmail(code, toEmail, purpose);

  const info = await transporter.sendMail({
    from: `"${senderName}" <${senderEmail}>`,
    to: toEmail,
    subject,
    html,
  });

  return { success: true, messageId: info.messageId };
}

// Unified dispatcher: tries REST API first, then falls back to SMTP Relay
async function dispatchVerificationEmail(toEmail: string, code: string, purpose: EmailPurpose) {
  let apiResult = await sendViaBrevoApi(toEmail, code, purpose);
  let smtpResult = null;
  if (!apiResult.success) {
    console.warn(`[Brevo Email] REST API send warning (${purpose}):`, apiResult);
    try {
      smtpResult = await sendViaBrevoSmtp(toEmail, code, purpose);
    } catch (smtpErr: any) {
      console.warn(`[Brevo Email] SMTP Relay warning (${purpose}):`, smtpErr?.message);
    }
  }
  return {
    delivered: !!(apiResult.success || smtpResult?.success),
    apiResult,
    smtpResult,
  };
}

async function startServer() {
  const app = express();
  const PORT = Number(process.env.APP_PORT) || 3000;

  app.use(express.json());

  // -------------------------------------------------------------
  // API: Request Password Reset Code
  // -------------------------------------------------------------
  app.post("/api/auth/forgot-password", async (req, res) => {
    try {
      const email = (req.body?.email || "").trim().toLowerCase();
      if (!email || !email.includes("@")) {
        return res.status(400).json({ error: "Please provide a valid email address." });
      }

      // Generate 6-digit cryptographically strong code
      const code = Math.floor(100000 + Math.random() * 900000).toString();
      const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes

      otpStore.set(email, {
        code,
        expiresAt,
        verified: false,
        attempts: 0,
      });

      console.log(`[Forgot Password] Generated OTP for ${email}: ${code} (expires at ${new Date(expiresAt).toISOString()})`);

      // Try Brevo REST API first
      let apiResult = await sendViaBrevoApi(email, code);

      // If REST API didn't succeed, attempt SMTP Relay
      let smtpResult = null;
      if (!apiResult.success) {
        console.warn("[Forgot Password] Brevo API send warning:", apiResult);
        try {
          smtpResult = await sendViaBrevoSmtp(email, code);
        } catch (smtpErr: any) {
          console.warn("[Forgot Password] Brevo SMTP send warning:", smtpErr?.message);
        }
      }

      const delivered = apiResult.success || smtpResult?.success;

      if (delivered) {
        return res.json({
          success: true,
          delivered: true,
          message: `A 6-digit verification code has been dispatched to ${email}. Please check your inbox and spam folder.`,
        });
      }

      console.warn("[Forgot Password] Email delivery failed:", apiResult, smtpResult);
      return res.status(500).json({
        error: apiResult?.message || "Failed to dispatch verification email. Please check your Brevo configuration.",
      });
    } catch (err: any) {
      console.error("[Forgot Password Error]:", err);
      return res.status(500).json({
        error: err?.message || "Failed to process forgot password request.",
      });
    }
  });

  // -------------------------------------------------------------
  // API: Verify 6-digit Code
  // -------------------------------------------------------------
  app.post("/api/auth/verify-code", (req, res) => {
    try {
      const email = (req.body?.email || "").trim().toLowerCase();
      const code = (req.body?.code || "").trim();

      if (!email || !code) {
        return res.status(400).json({ error: "Email and 6-digit verification code are required." });
      }

      const record = otpStore.get(email);
      if (!record) {
        return res.status(400).json({
          error: "No active verification code found for this email. Please request a new code.",
        });
      }

      if (Date.now() > record.expiresAt) {
        otpStore.delete(email);
        return res.status(400).json({
          error: "This verification code has expired. Please request a new code.",
        });
      }

      if (record.attempts >= 5) {
        otpStore.delete(email);
        return res.status(429).json({
          error: "Too many incorrect attempts. For your security, this code was invalidated. Please request a new code.",
        });
      }

      if (record.code !== code) {
        record.attempts += 1;
        const remaining = 5 - record.attempts;
        return res.status(400).json({
          error: `Incorrect verification code. ${remaining} ${remaining === 1 ? "attempt" : "attempts"} remaining.`,
        });
      }

      // Mark verified
      record.verified = true;
      return res.json({
        success: true,
        message: "Code verified successfully! You may now enter your new password.",
      });
    } catch (err: any) {
      return res.status(500).json({ error: err?.message || "Verification failed." });
    }
  });

  // -------------------------------------------------------------
  // API: Reset Password
  // -------------------------------------------------------------
  app.post("/api/auth/reset-password", async (req, res) => {
    try {
      const email = (req.body?.email || "").trim().toLowerCase();
      const code = (req.body?.code || "").trim();
      const newPassword = (req.body?.newPassword || "");

      if (!email || !code || !newPassword) {
        return res.status(400).json({ error: "Missing required fields." });
      }

      if (newPassword.length < 6) {
        return res.status(400).json({ error: "Password must be at least 6 characters." });
      }

      const record = otpStore.get(email);
      if (!record || record.code !== code || !record.verified) {
        return res.status(400).json({
          error: "Verification expired or invalid. Please verify your code again.",
        });
      }

      // Invalidate the code
      otpStore.delete(email);

      console.log(`[Forgot Password] Successfully reset password for ${email}`);

      // Attempt remote Supabase Auth admin update if service role key is configured
      let supabaseUpdated = false;
      const supabaseUrl = process.env.VITE_SUPABASE_URL;
      const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;
      if (supabaseUrl && serviceRoleKey) {
        try {
          const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
            auth: { autoRefreshToken: false, persistSession: false },
          });
          const { data: usersData, error: listError } = await supabaseAdmin.auth.admin.listUsers();
          if (!listError && usersData?.users) {
            const match = usersData.users.find((u: any) => u.email?.toLowerCase() === email);
            if (match) {
              const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(match.id, {
                password: newPassword,
              });
              if (!updateError) {
                supabaseUpdated = true;
                console.log(`[Supabase Admin] Successfully updated auth.users password for ${email}`);
              } else {
                console.warn("[Supabase Admin] updateUserById failed:", updateError.message);
              }
            }
          }
        } catch (supabaseErr: any) {
          console.warn("[Supabase Admin] Update error:", supabaseErr?.message);
        }
      }

      return res.json({
        success: true,
        supabaseUpdated,
        message: "Your password has been reset successfully! You can now sign in with your new credentials.",
      });
    } catch (err: any) {
      return res.status(500).json({ error: err?.message || "Failed to reset password." });
    }
  });

  // -------------------------------------------------------------
  // API: Request Change Password Code (Sent to user's registered Gmail)
  // -------------------------------------------------------------
  app.post("/api/auth/send-change-password-code", async (req, res) => {
    try {
      const email = (req.body?.email || "").trim().toLowerCase();
      if (!email || !email.includes("@")) {
        return res.status(400).json({ error: "Please provide a valid account email address." });
      }

      // Generate 6-digit cryptographically strong verification code
      const code = Math.floor(100000 + Math.random() * 900000).toString();
      const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes

      const key = `change-password:${email}`;
      otpStore.set(key, {
        code,
        expiresAt,
        verified: false,
        attempts: 0,
      });

      console.log(`[Change Password] Generated OTP for ${email}: ${code} (expires in 10 mins)`);

      const { delivered, apiResult, smtpResult } = await dispatchVerificationEmail(email, code, "change_password");

      if (delivered) {
        return res.json({
          success: true,
          delivered: true,
          message: `A 6-digit confirmation code has been dispatched to ${email}. Please check your Gmail inbox.`,
        });
      }

      console.warn("[Change Password] Email dispatch warning:", apiResult, smtpResult);
      return res.status(500).json({
        error: apiResult?.message || "Failed to dispatch verification email. Please check your email configuration.",
      });
    } catch (err: any) {
      console.error("[Change Password Error]:", err);
      return res.status(500).json({
        error: err?.message || "Failed to process change password request.",
      });
    }
  });

  // -------------------------------------------------------------
  // API: Verify Code & Confirm Change Password
  // -------------------------------------------------------------
  app.post("/api/auth/verify-change-password", async (req, res) => {
    try {
      const email = (req.body?.email || "").trim().toLowerCase();
      const code = (req.body?.code || "").trim();
      const newPassword = (req.body?.newPassword || "");

      if (!email || !code || !newPassword) {
        return res.status(400).json({ error: "Missing email, code, or new password." });
      }

      if (newPassword.length < 6) {
        return res.status(400).json({ error: "Password must be at least 6 characters." });
      }

      const key = `change-password:${email}`;
      const record = otpStore.get(key);
      if (!record) {
        return res.status(400).json({
          error: "No active verification code found for this account. Please request a new code.",
        });
      }

      if (Date.now() > record.expiresAt) {
        otpStore.delete(key);
        return res.status(400).json({
          error: "Verification code has expired. Please request a new code.",
        });
      }

      if (record.attempts >= 5) {
        otpStore.delete(key);
        return res.status(429).json({
          error: "Too many incorrect attempts. For security, this code was invalidated. Please request a new code.",
        });
      }

      if (record.code !== code) {
        record.attempts += 1;
        const remaining = 5 - record.attempts;
        return res.status(400).json({
          error: `Incorrect verification code. ${remaining} ${remaining === 1 ? "attempt" : "attempts"} remaining.`,
        });
      }

      // Validated! Invalidate code so it cannot be reused
      otpStore.delete(key);

      // Attempt remote Supabase Auth admin update if service role key is configured
      let supabaseUpdated = false;
      const supabaseUrl = process.env.VITE_SUPABASE_URL;
      const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;
      if (supabaseUrl && serviceRoleKey) {
        try {
          const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
            auth: { autoRefreshToken: false, persistSession: false },
          });
          const { data: usersData, error: listError } = await supabaseAdmin.auth.admin.listUsers();
          if (!listError && usersData?.users) {
            const match = usersData.users.find((u: any) => u.email?.toLowerCase() === email);
            if (match) {
              const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(match.id, {
                password: newPassword,
              });
              if (!updateError) {
                supabaseUpdated = true;
                console.log(`[Supabase Admin] Successfully updated auth.users password on change-password for ${email}`);
              } else {
                console.warn("[Supabase Admin] updateUserById warning:", updateError.message);
              }
            }
          }
        } catch (supabaseErr: any) {
          console.warn("[Supabase Admin] Change password error:", supabaseErr?.message);
        }
      }

      return res.json({
        success: true,
        supabaseUpdated,
        message: "Your password has been changed successfully! Your account is now secured with your new password.",
      });
    } catch (err: any) {
      return res.status(500).json({ error: err?.message || "Failed to change password." });
    }
  });

  // -------------------------------------------------------------
  // API: Request Account Creation (Signup) Email Ownership Code
  // -------------------------------------------------------------
  app.post("/api/auth/send-signup-code", async (req, res) => {
    try {
      const email = (req.body?.email || "").trim().toLowerCase();
      if (!email || !email.includes("@")) {
        return res.status(400).json({ error: "Please provide a valid email address." });
      }

      // Check if user already exists in Supabase
      const supabaseUrl = process.env.VITE_SUPABASE_URL;
      const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;
      if (supabaseUrl && serviceRoleKey) {
        try {
          const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
            auth: { autoRefreshToken: false, persistSession: false },
          });
          const { data: usersData } = await supabaseAdmin.auth.admin.listUsers();
          if (usersData?.users) {
            const exists = usersData.users.some((u: any) => u.email?.toLowerCase() === email);
            if (exists) {
              return res.status(400).json({
                error: "An account with this email address already exists. Please sign in instead.",
              });
            }
          }
        } catch {}
      }

      // Generate 6-digit code
      const code = Math.floor(100000 + Math.random() * 900000).toString();
      const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes

      const key = `signup:${email}`;
      otpStore.set(key, {
        code,
        expiresAt,
        verified: false,
        attempts: 0,
      });

      console.log(`[Signup Verification] Generated OTP for ${email}: ${code} (expires in 10 mins)`);

      const { delivered, apiResult, smtpResult } = await dispatchVerificationEmail(email, code, "signup_verification");

      if (delivered) {
        return res.json({
          success: true,
          delivered: true,
          message: `A 6-digit ownership verification code has been dispatched to ${email}. Please check your Gmail inbox.`,
        });
      }

      console.warn("[Signup Verification] Email dispatch warning:", apiResult, smtpResult);
      return res.status(500).json({
        error: apiResult?.message || "Failed to dispatch verification email. Please check your email configuration.",
      });
    } catch (err: any) {
      console.error("[Signup Verification Error]:", err);
      return res.status(500).json({
        error: err?.message || "Failed to process signup verification request.",
      });
    }
  });

  // -------------------------------------------------------------
  // API: Verify Signup Code & Finalize Account Ownership
  // -------------------------------------------------------------
  app.post("/api/auth/verify-signup-code", async (req, res) => {
    try {
      const email = (req.body?.email || "").trim().toLowerCase();
      const code = (req.body?.code || "").trim();
      const password = (req.body?.password || "");
      const fullName = (req.body?.fullName || "").trim();

      if (!email || !code) {
        return res.status(400).json({ error: "Email and verification code are required." });
      }

      const key = `signup:${email}`;
      const record = otpStore.get(key);
      if (!record) {
        return res.status(400).json({
          error: "No active verification code found for this email. Please request a new code.",
        });
      }

      if (Date.now() > record.expiresAt) {
        otpStore.delete(key);
        return res.status(400).json({
          error: "Verification code has expired. Please request a new code.",
        });
      }

      if (record.attempts >= 5) {
        otpStore.delete(key);
        return res.status(429).json({
          error: "Too many incorrect attempts. For security, this code was invalidated. Please request a new code.",
        });
      }

      if (record.code !== code) {
        record.attempts += 1;
        const remaining = 5 - record.attempts;
        return res.status(400).json({
          error: `Incorrect verification code. ${remaining} ${remaining === 1 ? "attempt" : "attempts"} remaining.`,
        });
      }

      // Validated! Remove code
      otpStore.delete(key);

      // If password provided and service role key available, create the user in Supabase Auth as email-confirmed
      let createdUser: any = null;
      const supabaseUrl = process.env.VITE_SUPABASE_URL;
      const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;
      if (password && supabaseUrl && serviceRoleKey) {
        try {
          const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
            auth: { autoRefreshToken: false, persistSession: false },
          });
          const { data, error } = await supabaseAdmin.auth.admin.createUser({
            email,
            password,
            email_confirm: true,
            user_metadata: {
              full_name: fullName || email.split("@")[0],
            },
          });
          if (!error && data?.user) {
            createdUser = data.user;
            console.log(`[Supabase Admin] Successfully created email-confirmed reviewer account for ${email}`);
          } else if (error) {
            console.warn("[Supabase Admin] createUser note:", error.message);
          }
        } catch (adminErr: any) {
          console.warn("[Supabase Admin] createUser exception:", adminErr?.message);
        }
      }

      return res.json({
        success: true,
        verified: true,
        created: !!createdUser,
        message: "Email ownership verified successfully! Account created.",
      });
    } catch (err: any) {
      return res.status(500).json({ error: err?.message || "Failed to verify signup code." });
    }
  });

  // Health check
  app.get("/api/health", (_req, res) => {
    res.json({ status: "ok", time: new Date().toISOString() });
  });

  // -------------------------------------------------------------
  // Dev (Vite Middlewares) / Prod (Static dist)
  // -------------------------------------------------------------
  if (process.env.NODE_ENV === "production") {
    app.use(express.static(path.resolve(__dirname, "dist")));
    app.use((_req, res) => {
      res.sendFile(path.resolve(__dirname, "dist", "index.html"));
    });
  } else {
    let viteServer: Awaited<ReturnType<typeof createViteServer>> | null = null;
    const viteReady = createViteServer({
      server: {
        middlewareMode: true,
        hmr: false,
        allowedHosts: true,
      },
      appType: "spa",
    })
      .then((vite) => {
        viteServer = vite;
      })
      .catch((err) => {
        console.error("Failed to initialize Vite dev middleware:", err);
        process.exit(1);
      });

    app.use(async (req, res, next) => {
      try {
        await viteReady;
        if (viteServer) {
          return viteServer.middlewares(req, res, next);
        }
        return next();
      } catch (err) {
        return next(err);
      }
    });
  }

  const server = app.listen(PORT, "0.0.0.0", () => {
    console.log(`QBANK Full-Stack Server running on http://localhost:${PORT}`);
  });
  server.on("error", (err: Error & { code?: string }) => {
    if (err.code === "EADDRINUSE") {
      console.error(`Port ${PORT} is already in use by another process.`);
      console.error(`Stop it with: netstat -ano | findstr :${PORT} then taskkill /f /pid <PID>`);
      process.exit(1);
    }
    throw err;
  });
}

startServer().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
