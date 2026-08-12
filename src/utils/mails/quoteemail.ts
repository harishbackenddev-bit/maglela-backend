// utils/email.utils.ts
import nodemailer from "nodemailer";

interface InvoiceEmailData {
  to: string;
  clientName: string;
  invoiceNumber: string;
  amount: number;
  dueDate: Date;
  items: Array<{
    description: string;
    quantity: number;
    rate: number;
    lineTotal: number;
  }>;
}

interface QuoteEmailData {
  to: string;
  clientName: string;
  quoteNumber: string;
  amount: number;
  validUntil: Date;
  items: Array<{
    description: string;
    quantity: number;
    rate: number;
    lineTotal: number;
  }>;
}

// Configure email transporter
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || "smtp.gmail.com",
  port: parseInt(process.env.SMTP_PORT || "587"),
  secure: process.env.SMTP_SECURE === "true",
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

export const sendInvoiceEmail = async (data: InvoiceEmailData) => {
  // ... existing invoice email code ...
};

export const sendQuoteEmail = async (data: QuoteEmailData) => {
  const { to, clientName, quoteNumber, amount, validUntil, items } = data;

  // Generate items HTML
  const itemsHtml = items.map((item: any) => `
    <tr>
      <td style="padding: 10px 8px; border-bottom: 1px solid #eee;">${item.description || 'N/A'}</td>
      <td style="padding: 10px 8px; border-bottom: 1px solid #eee; text-align: center;">${item.quantity || 0}</td>
      <td style="padding: 10px 8px; border-bottom: 1px solid #eee; text-align: right;">R ${(item.rate || 0).toFixed(2)}</td>
      <td style="padding: 10px 8px; border-bottom: 1px solid #eee; text-align: right;">R ${(item.lineTotal || 0).toFixed(2)}</td>
    </tr>
  `).join('');

  const totalWithVat = amount * 1.15;

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Quote ${quoteNumber}</title>
      <style>
        body {
          font-family: 'Segoe UI', Arial, sans-serif;
          line-height: 1.6;
          color: #333;
          margin: 0;
          padding: 0;
          background-color: #f5f5f5;
        }
        .container {
          max-width: 650px;
          margin: 0 auto;
          padding: 20px;
          background-color: #ffffff;
        }
        .header {
          background: #0F2D63;
          color: white;
          padding: 30px 20px;
          text-align: center;
          border-radius: 8px 8px 0 0;
        }
        .header h1 {
          margin: 0;
          font-size: 24px;
          font-weight: 700;
          letter-spacing: 1px;
        }
        .header p {
          margin: 5px 0 0;
          opacity: 0.8;
          font-size: 14px;
        }
        .content {
          padding: 30px 25px;
          background: #ffffff;
          border: 1px solid #e8e8e8;
          border-top: none;
          border-radius: 0 0 8px 8px;
        }
        .greeting {
          font-size: 16px;
          margin-bottom: 20px;
        }
        .greeting strong {
          color: #0F2D63;
        }
        .summary-title {
          font-size: 18px;
          font-weight: 700;
          color: #0F2D63;
          margin: 25px 0 15px;
          border-bottom: 2px solid #0F2D63;
          padding-bottom: 8px;
        }
        .amount-box {
          background: #fff4f0;
          border: 1px solid #f5c9b8;
          border-radius: 8px;
          padding: 15px 20px;
          margin: 20px 0;
          display: inline-block;
        }
        .amount-box .label {
          font-size: 14px;
          color: #666;
          display: block;
        }
        .amount-box .value {
          font-size: 32px;
          font-weight: 700;
          color: #C85A32;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          margin: 15px 0;
          font-size: 14px;
        }
        th {
          background: #0F2D63;
          color: white;
          padding: 10px 8px;
          text-align: left;
          font-weight: 600;
        }
        td {
          padding: 10px 8px;
          border-bottom: 1px solid #eee;
        }
        .total-row td {
          font-weight: 700;
          font-size: 15px;
          border-bottom: none;
          padding-top: 12px;
        }
        .total-row td:last-child {
          color: #C85A32;
          font-size: 18px;
        }
        .badge {
          display: inline-block;
          background: #fff3e0;
          color: #e65100;
          padding: 4px 16px;
          border-radius: 20px;
          font-size: 12px;
          font-weight: 600;
        }
        .valid-date {
          color: #C85A32;
          font-weight: 600;
        }
        .footer {
          margin-top: 30px;
          padding-top: 20px;
          border-top: 1px solid #eee;
          font-size: 12px;
          color: #999;
          text-align: center;
        }
        .footer a {
          color: #0F2D63;
          text-decoration: none;
        }
        @media (max-width: 480px) {
          .container { padding: 10px; }
          .content { padding: 20px 15px; }
          .header h1 { font-size: 20px; }
          .amount-box .value { font-size: 26px; }
          table { font-size: 12px; }
          th, td { padding: 6px 4px; }
        }
      </style>
    </head>
    <body>
      <div class="container">
        <!-- Header -->
        <div class="header">
          <h1>📄 Quote ${quoteNumber}</h1>
          <p>Magalela · Science Communication</p>
        </div>

        <!-- Content -->
        <div class="content">
          <!-- Greeting -->
          <div class="greeting">
            Dear <strong>${clientName}</strong>,
          </div>
          <p style="color: #555; font-size: 15px;">
            Thank you for considering Magalela. Please find the details of your quote below.
          </p>

          <!-- Amount Box -->
          <div style="text-align: center; margin: 25px 0;">
            <div class="amount-box">
              <span class="label">Total Amount</span>
              <span class="value">R ${totalWithVat.toFixed(2)}</span>
            </div>
          </div>

          <!-- Valid Until Badge -->
          <div style="text-align: center; margin: 10px 0 20px;">
            <span class="badge">⏳ Valid until ${new Date(validUntil).toLocaleDateString('en-ZA', { day: '2-digit', month: 'long', year: 'numeric' })}</span>
          </div>

          <!-- Quote Summary Title -->
          <div class="summary-title">📋 Quote Summary</div>

          <!-- Items Table -->
          <table>
            <thead>
              <tr>
                <th style="width: 45%;">Description</th>
                <th style="width: 15%; text-align: center;">Qty</th>
                <th style="width: 20%; text-align: right;">Rate</th>
                <th style="width: 20%; text-align: right;">Total</th>
              </tr>
            </thead>
            <tbody>
              ${itemsHtml}
              <tr class="total-row">
                <td colspan="3" style="text-align: right; font-size: 15px;">Subtotal:</td>
                <td style="text-align: right; font-size: 15px;">R ${amount.toFixed(2)}</td>
              </tr>
              <tr class="total-row">
                <td colspan="3" style="text-align: right; font-size: 15px;">VAT (15%):</td>
                <td style="text-align: right; font-size: 15px;">R ${(amount * 0.15).toFixed(2)}</td>
              </tr>
              <tr class="total-row" style="border-top: 2px solid #0F2D63;">
                <td colspan="3" style="text-align: right; font-size: 18px; color: #0F2D63;">Total:</td>
                <td style="text-align: right; font-size: 20px; color: #C85A32;">R ${totalWithVat.toFixed(2)}</td>
              </tr>
            </tbody>
          </table>

          <!-- Valid Until -->
          <div style="margin: 20px 0 10px; padding: 12px 16px; background: #f9f9f9; border-radius: 6px; border-left: 4px solid #C85A32;">
            <span style="font-weight: 600;">📅 Valid Until:</span>
            <span class="valid-date">${new Date(validUntil).toLocaleDateString('en-ZA', { day: '2-digit', month: 'long', year: 'numeric' })}</span>
          </div>

          <!-- Next Steps -->
          <div style="background: #f0f7ff; padding: 15px 18px; border-radius: 8px; margin: 20px 0;">
            <p style="margin: 0 0 5px; font-weight: 600; color: #0F2D63;">📌 Next Steps</p>
            <p style="margin: 0; font-size: 14px; color: #555;">
              To accept this quote, please reply to this email or contact us at 
              <a href="mailto:info@magalela.com" style="color: #C85A32; text-decoration: none; font-weight: 500;">info@magalela.com</a>
            </p>
          </div>

          <!-- Footer Text -->
          <div style="margin-top: 20px; padding-top: 20px; border-top: 1px solid #eee;">
            <p style="margin: 0; font-size: 14px; color: #666;">
              This quote is valid for 30 days from the date of issue.
            </p>
          </div>
        </div>

        <!-- Footer -->
        <div class="footer">
          <p style="margin: 0 0 5px;">
            © ${new Date().getFullYear()} <strong>Magalela</strong> · Science Communication
          </p>
          <p style="margin: 0; font-size: 11px; color: #aaa;">
            This is an automated email. Please do not reply directly to this message.
          </p>
          <p style="margin: 5px 0 0; font-size: 11px; color: #bbb;">
            <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}" style="color: #0F2D63; text-decoration: none;">Visit our website</a>
          </p>
        </div>
      </div>
    </body>
    </html>
  `;

  await transporter.sendMail({
    from: process.env.SMTP_FROM || "noreply@magalela.com",
    to,
    subject: `Quote ${quoteNumber} from Magalela`,
    html,
  });
};