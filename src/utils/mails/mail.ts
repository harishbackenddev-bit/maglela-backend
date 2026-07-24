import nodemailer from 'nodemailer';
import { configDotenv } from "dotenv";

configDotenv();
// At the top of your mail.ts file
console.log('SMTP_USER:', process.env.SMTP_USER);
console.log('SMTP_PASSWORD:', process.env.SMTP_PASSWORD ? '***SET***' : 'NOT SET');
console.log('SMTP_HOST:', process.env.SMTP_HOST);
// Create transporter
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASSWORD,
  },
});

// Verify connection
transporter.verify((error, success) => {
  if (error) {
    console.log('SMTP connection error:', error);
  } else {
    console.log('SMTP server is ready to send emails');
  }
});

export const sendPasswordResetEmail = async (email: string, resetLink: string) => {
  try {
    const info = await transporter.sendMail({
      from: process.env.COMPANY_EMAIL || process.env.SMTP_USER,
      to: email,
      subject: "Reset Your Password",
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
          </head>
          <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background-color: #f8f9fa; border-radius: 8px; padding: 30px;">
              <h1 style="color: #2c3e50; margin-bottom: 20px;">Reset Your Password</h1>
              
              <p style="font-size: 16px;">Hello,</p>
              
              <p style="font-size: 16px;">We received a request to reset your password. Click the button below to reset it:</p>
              
              <div style="text-align: center; margin: 30px 0;">
                <a href="${resetLink}" 
                   style="background-color: #007bff; 
                          color: white; 
                          padding: 12px 30px; 
                          text-decoration: none; 
                          border-radius: 5px; 
                          font-weight: bold;
                          display: inline-block;">
                  Reset Password
                </a>
              </div>
              
              <p style="font-size: 14px; color: #6c757d;">
                Or copy and paste this link into your browser:<br>
                <span style="word-break: break-all; color: #007bff;">${resetLink}</span>
              </p>
              
              <hr style="border: none; border-top: 1px solid #dee2e6; margin: 20px 0;">
              
              <p style="font-size: 14px; color: #6c757d;">
                This link will expire in 1 hour.<br>
                If you didn't request a password reset, please ignore this email or 
                <a href="mailto:${process.env.COMPANY_SUPPORT_EMAIL || 'support@example.com'}" 
                   style="color: #007bff; text-decoration: none;">
                  contact support
                </a>.
              </p>
            </div>
          </body>
        </html>
      `,
    });

    console.log('Password reset email sent:', info.messageId);
    return info;
  } catch (error) {
    console.error('Error sending password reset email:', error);
    throw new Error('Failed to send password reset email');
  }
};

export const sendContactMailToAdmin = async (payload: { 
  name: string; 
  email: string; 
  message: string; 
  phoneNumber: string;
}) => {
  try {
    const info = await transporter.sendMail({
      from: process.env.COMPANY_EMAIL || process.env.SMTP_USER,
      to: process.env.ADMIN_EMAIL || process.env.SMTP_USER,
      subject: "Contact Us | New Message",
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px;">
          <h2>New Contact Form Submission</h2>
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 8px; border: 1px solid #ddd;"><strong>Name:</strong></td>
              <td style="padding: 8px; border: 1px solid #ddd;">${payload.name}</td>
            </tr>
            <tr>
              <td style="padding: 8px; border: 1px solid #ddd;"><strong>Email:</strong></td>
              <td style="padding: 8px; border: 1px solid #ddd;">${payload.email}</td>
            </tr>
            <tr>
              <td style="padding: 8px; border: 1px solid #ddd;"><strong>Phone:</strong></td>
              <td style="padding: 8px; border: 1px solid #ddd;">${payload.phoneNumber}</td>
            </tr>
            <tr>
              <td style="padding: 8px; border: 1px solid #ddd;"><strong>Message:</strong></td>
              <td style="padding: 8px; border: 1px solid #ddd;">${payload.message}</td>
            </tr>
          </table>
          <p style="margin-top: 20px; color: #6c757d;">
            <small>Sent from contact form on ${new Date().toLocaleString()}</small>
          </p>
        </div>
      `,
    });

    console.log('Contact email sent:', info.messageId);
    return info;
  } catch (error) {
    console.error('Error sending contact email:', error);
    throw new Error('Failed to send contact email');
  }
};

export const sendLatestUpdatesEmail = async (
  email: string, 
  title: string, 
  message: string
) => {
  try {
    const info = await transporter.sendMail({
      from: process.env.COMPANY_EMAIL || process.env.SMTP_USER,
      to: email,
      subject: title,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #2c3e50;">${title}</h2>
          <div style="background-color: #f8f9fa; padding: 20px; border-radius: 5px;">
            <p style="font-size: 16px; line-height: 1.6;">${message}</p>
          </div>
          <hr style="border: none; border-top: 1px solid #dee2e6; margin: 20px 0;">
          <p style="font-size: 12px; color: #6c757d;">
            You're receiving this email because you subscribed to updates.
            <br>To unsubscribe, <a href="#" style="color: #007bff;">click here</a>.
          </p>
        </div>
      `,
    });

    console.log('Update email sent:', info.messageId);
    return info;
  } catch (error) {
    console.error('Error sending update email:', error);
    throw new Error('Failed to send update email');
  }
};