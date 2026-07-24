// utils/mails/orders/orderconfirmation.ts
import nodemailer from 'nodemailer';

// ✅ Define proper types with non-nullable properties
interface OrderItem {
  productId: string;
  title: string;
  price: number;
  quantity: number;
  subtotal: number;
}

interface DownloadLink {
  productId: string;
  link: string;
  expiresAt: Date;
}

interface OrderConfirmationEmailData {
  to: string;
  name: string;
  orderNumber: string;
  items: OrderItem[];
  totalAmount: string;
  downloadLinks: DownloadLink[]; // ✅ Now expects non-nullable DownloadLink[]
}

interface AdminOrderNotificationData {
  orderNumber: string;
  name: string;
  email: string;
  items: OrderItem[];
  totalAmount: string;
  transactionId: string;
}

// Configure email transporter
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

// Send order confirmation email to customer
export const sendOrderConfirmationEmail = async (data: OrderConfirmationEmailData) => {
  const { to, name, orderNumber, items, totalAmount, downloadLinks } = data;

  // Generate items HTML
  const itemsHtml = items.map(item => `
    <tr>
      <td style="padding: 10px; border-bottom: 1px solid #e5e7eb;">${item.title}</td>
      <td style="padding: 10px; border-bottom: 1px solid #e5e7eb; text-align: center;">${item.quantity}</td>
      <td style="padding: 10px; border-bottom: 1px solid #e5e7eb; text-align: right;">R${item.price.toFixed(2)}</td>
    </tr>
  `).join('');

  // Generate download links HTML
  const downloadLinksHtml = downloadLinks.map(link => {
    // Find the product title from items
    const product = items.find(item => item.productId === link.productId);
    const productTitle = product?.title || 'Download';
    
    return `
    <tr>
      <td style="padding: 10px; border-bottom: 1px solid #e5e7eb;">
        <a href="${process.env.FRONTEND_URL}${link.link}" style="color: #C85A32; text-decoration: none;">
          ${productTitle}
        </a>
      </td>
      <td style="padding: 10px; border-bottom: 1px solid #e5e7eb; text-align: center;">
        Expires: ${new Date(link.expiresAt).toLocaleDateString()}
      </td>
    </tr>
  `}).join('');

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; }
        .header { background: #0F2D63; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { padding: 30px; background: #f9fafb; }
        .footer { background: #f3f4f6; padding: 20px; text-align: center; border-radius: 0 0 8px 8px; font-size: 12px; color: #6b7280; }
        table { width: 100%; border-collapse: collapse; background: white; border-radius: 8px; overflow: hidden; }
        th { background: #1C1C1C; color: white; padding: 12px; text-align: left; }
        td { padding: 12px; border-bottom: 1px solid #e5e7eb; }
        .total { font-size: 18px; font-weight: bold; color: #0F2D63; }
        .button { display: inline-block; background: #C85A32; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; margin-top: 10px; }
        .download-link { color: #C85A32; text-decoration: none; font-weight: bold; }
        .download-link:hover { text-decoration: underline; }
      </style>
    </head>
    <body>
      <div class="header">
        <h1 style="margin: 0;">Order Confirmation</h1>
        <p style="margin: 5px 0 0;">Order #${orderNumber}</p>
      </div>
      
      <div class="content">
        <h2>Hi ${name},</h2>
        <p>Thank you for your order! Your payment has been confirmed and your downloads are ready.</p>
        
        <h3>Order Summary</h3>
        <table>
          <thead>
            <tr>
              <th>Item</th>
              <th style="text-align: center;">Qty</th>
              <th style="text-align: right;">Price</th>
            </tr>
          </thead>
          <tbody>
            ${itemsHtml}
            <tr>
              <td colspan="2" style="text-align: right; font-weight: bold;">Total</td>
              <td style="text-align: right; font-weight: bold;">${totalAmount}</td>
            </tr>
          </tbody>
        </table>

        ${downloadLinks.length > 0 ? `
        <h3 style="margin-top: 30px;">Your Downloads</h3>
        <p>Click the links below to download your purchased items. Links expire after 7 days.</p>
        <table>
          <thead>
            <tr>
              <th>Product</th>
              <th style="text-align: center;">Expires</th>
            </tr>
          </thead>
          <tbody>
            ${downloadLinksHtml}
          </tbody>
        </table>
        ` : `
        <p style="margin-top: 30px;">Your download links will be available shortly.</p>
        `}

        <p style="margin-top: 30px;">If you have any questions, please reply to this email.</p>
        <p>Thanks,<br><strong>Digital Toolkit Team</strong></p>
      </div>
      
      <div class="footer">
        <p>This is an automated confirmation. Please do not reply to this email.</p>
        <p>&copy; ${new Date().getFullYear()} Digital Toolkit. All rights reserved.</p>
      </div>
    </body>
    </html>
  `;

  await transporter.sendMail({
    from: process.env.SMTP_FROM || 'noreply@digitaltoolkit.com',
    to,
    subject: `Order Confirmation #${orderNumber}`,
    html,
  });
};

// Send admin order notification
export const sendAdminOrderNotification = async (data: AdminOrderNotificationData) => {
  const { orderNumber, name, email, items, totalAmount, transactionId } = data;

  const itemsHtml = items.map(item => `
    <tr>
      <td style="padding: 10px; border-bottom: 1px solid #e5e7eb;">${item.title}</td>
      <td style="padding: 10px; border-bottom: 1px solid #e5e7eb; text-align: center;">${item.quantity}</td>
      <td style="padding: 10px; border-bottom: 1px solid #e5e7eb; text-align: right;">R${item.price.toFixed(2)}</td>
    </tr>
  `).join('');

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; }
        .header { background: #0F2D63; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { padding: 30px; background: #f9fafb; }
        .footer { background: #f3f4f6; padding: 20px; text-align: center; border-radius: 0 0 8px 8px; font-size: 12px; color: #6b7280; }
        table { width: 100%; border-collapse: collapse; background: white; border-radius: 8px; overflow: hidden; }
        th { background: #1C1C1C; color: white; padding: 12px; text-align: left; }
        td { padding: 12px; border-bottom: 1px solid #e5e7eb; }
      </style>
    </head>
    <body>
      <div class="header">
        <h1 style="margin: 0;">New Order Received</h1>
        <p style="margin: 5px 0 0;">Order #${orderNumber}</p>
      </div>
      
      <div class="content">
        <h2>New Order Details</h2>
        
        <h3>Customer Information</h3>
        <p><strong>Name:</strong> ${name}</p>
        <p><strong>Email:</strong> ${email}</p>
        <p><strong>Transaction ID:</strong> ${transactionId}</p>

        <h3>Order Items</h3>
        <table>
          <thead>
            <tr>
              <th>Item</th>
              <th style="text-align: center;">Qty</th>
              <th style="text-align: right;">Price</th>
            </tr>
          </thead>
          <tbody>
            ${itemsHtml}
            <tr>
              <td colspan="2" style="text-align: right; font-weight: bold;">Total</td>
              <td style="text-align: right; font-weight: bold;">${totalAmount}</td>
            </tr>
          </tbody>
        </table>

        <p style="margin-top: 30px;">View this order in the admin dashboard.</p>
      </div>
      
      <div class="footer">
        <p>This is an automated notification.</p>
      </div>
    </body>
    </html>
  `;

  await transporter.sendMail({
    from: process.env.SMTP_FROM || 'noreply@digitaltoolkit.com',
    to: process.env.ADMIN_EMAIL || 'admin@digitaltoolkit.com',
    subject: `New Order #${orderNumber} - Payment Confirmed`,
    html,
  });
};