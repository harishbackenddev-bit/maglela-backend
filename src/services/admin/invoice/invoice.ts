// services/invoice/invoice.service.ts
import { InvoiceModel } from "../../../models/invoice/invoice-schema";
import { Response } from "express";
import { sendInvoiceEmail } from "../../../utils/mails/invoiceemail";

export const createInvoiceService = async (body: any, res: Response) => {
  try {
    const {
      clientInfo,
      issueDate,
      dueDate,
      currency,
      paymentTerms,
      items,
      additionalNotes,
      createdBy,
      createdByEmail,
      status = "sent" // Default to sent
    } = body;

    if (!clientInfo?.clientName || !clientInfo?.email) {
      return {
        success: false,
        message: "Client name and email are required",
        data: null,
      };
    }

    if (!items || items.length === 0) {
      return {
        success: false,
        message: "At least one line item is required",
        data: null,
      };
    }

    const invoiceNumber = await InvoiceModel.generateInvoiceNumber();

    // Calculate totals
    let subtotal = 0;
    const itemsWithTotals = items.map((item: any, index: number) => {
      const lineTotal = item.quantity * item.rate;
      subtotal += lineTotal;
      return {
        ...item,
        itemNumber: index + 1,
        lineTotal: lineTotal,
      };
    });

    const taxTotal = subtotal * 0.15; // 15% VAT
    const grandTotal = subtotal + taxTotal;

    const invoice = await InvoiceModel.create({
      invoiceNumber,
      clientInfo,
      issueDate: issueDate || new Date(),
      dueDate: dueDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      currency: currency || "ZAR (R)",
      paymentTerms: paymentTerms || "Net 30",
      items: itemsWithTotals,
      subtotal,
      taxTotal,
      grandTotal,
      additionalNotes: additionalNotes || "",
      createdBy,
      createdByEmail,
      status: status,
      sentAt: status === "sent" ? new Date() : null,
    });

    // Send email if status is "sent"
    if (status === "sent") {
      try {
        await sendInvoiceEmail({
          to: clientInfo.email,
          clientName: clientInfo.clientName,
          invoiceNumber: invoice.invoiceNumber,
          amount: invoice.subtotal,        // ✅ From DB
          taxAmount: invoice.taxTotal,     // ✅ From DB
          totalAmount: invoice.grandTotal, // ✅ From DB
          dueDate: invoice.dueDate,
          items: itemsWithTotals,
        });

        console.log(`📧 Invoice email sent to ${clientInfo.email}`);
      } catch (emailError) {
        console.error("Error sending invoice email:", emailError);
        // Don't fail the request if email fails
      }
    }

    return {
      success: true,
      message: status === "sent" ? "Invoice created and sent successfully" : "Invoice saved as draft",
      data: invoice,
    };
  } catch (error: any) {
    console.error("Error creating invoice:", error);
    return {
      success: false,
      message: error.message || "Failed to create invoice",
      data: null,
    };
  }
};

export const saveDraftInvoiceService = async (body: any, res: Response) => {
  try {
    const { clientInfo, issueDate, dueDate, currency, paymentTerms, items, additionalNotes, createdBy, createdByEmail } = body;

    if (!clientInfo?.clientName || !clientInfo?.email) {
      return {
        success: false,
        message: "Client name and email are required",
        data: null,
      };
    }

    const invoiceNumber = await InvoiceModel.generateInvoiceNumber();

    // Calculate totals for draft
    let subtotal = 0;
    const itemsWithTotals = (items || []).map((item: any, index: number) => {
      const lineTotal = item.quantity * item.rate;
      subtotal += lineTotal;
      return {
        ...item,
        itemNumber: index + 1,
        lineTotal: lineTotal,
      };
    });

    const taxTotal = subtotal * 0.15;
    const grandTotal = subtotal + taxTotal;

    const invoice = await InvoiceModel.create({
      invoiceNumber,
      clientInfo,
      issueDate: issueDate || new Date(),
      dueDate: dueDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      currency: currency || "ZAR (R)",
      paymentTerms: paymentTerms || "Net 30",
      items: itemsWithTotals,
      subtotal,
      taxTotal,
      grandTotal,
      additionalNotes: additionalNotes || "",
      createdBy,
      createdByEmail,
      status: "draft",
      sentAt: null,
    });

    return {
      success: true,
      message: "Invoice saved as draft",
      data: invoice,
    };
  } catch (error: any) {
    console.error("Error saving draft:", error);
    return {
      success: false,
      message: error.message || "Failed to save draft",
      data: null,
    };
  }
};

export const sendInvoiceService = async (id: string, body: any, res: Response) => {
  try {
    const invoice = await InvoiceModel.findById(id);

    if (!invoice) {
      return {
        success: false,
        message: "Invoice not found",
        data: null,
      };
    }

    if (invoice.status === 'sent' || invoice.status === 'paid') {
      return {
        success: false,
        message: `Invoice is already ${invoice.status}`,
        data: null,
      };
    }

    // Update status to sent
    invoice.status = 'sent';
    invoice.sentAt = new Date();
    await invoice.save();

    // Send email
    try {
      await sendInvoiceEmail({
        to: invoice.clientInfo.email,
        clientName: invoice.clientInfo.clientName,
        invoiceNumber: invoice.invoiceNumber,
        amount: invoice.subtotal,        // ✅ From DB
        taxAmount: invoice.taxTotal,     // ✅ From DB
        totalAmount: invoice.grandTotal, // ✅ From DB
        dueDate: invoice.dueDate,
        items: invoice.items || [],
      });
      console.log(`📧 Invoice email sent to ${invoice.clientInfo.email}`);
    } catch (emailError) {
      console.error("Error sending invoice email:", emailError);
      // Don't fail the request if email fails
    }

    return {
      success: true,
      message: "Invoice sent successfully",
      data: invoice,
    };
  } catch (error: any) {
    console.error("Error sending invoice:", error);
    return {
      success: false,
      message: error.message || "Failed to send invoice",
      data: null,
    };
  }
};

export const getInvoicesService = async (payload: any, res: Response) => {
  try {
    const { status, clientEmail } = payload;
    const filter: any = {};

    if (status) filter.status = status;
    if (clientEmail) filter['clientInfo.email'] = clientEmail;

    const invoices = await InvoiceModel.find(filter)
      .sort({ createdAt: -1 });

    return {
      success: true,
      message: "Invoices fetched successfully",
      data: invoices,
    };
  } catch (error: any) {
    console.error("Error fetching invoices:", error);
    return {
      success: false,
      message: error.message || "Failed to fetch invoices",
      data: null,
    };
  }
};

export const getInvoiceService = async (id: string, res: Response) => {
  try {
    const invoice = await InvoiceModel.findById(id);

    if (!invoice) {
      return {
        success: false,
        message: "Invoice not found",
        data: null,
      };
    }

    return {
      success: true,
      message: "Invoice fetched successfully",
      data: invoice,
    };
  } catch (error: any) {
    console.error("Error fetching invoice:", error);
    return {
      success: false,
      message: error.message || "Failed to fetch invoice",
      data: null,
    };
  }
};

export const updateInvoiceService = async (id: string, body: any, res: Response) => {
  try {
    const invoice = await InvoiceModel.findById(id);

    if (!invoice) {
      return {
        success: false,
        message: "Invoice not found",
        data: null,
      };
    }

    if (invoice.status !== 'draft') {
      return {
        success: false,
        message: `Cannot update invoice in "${invoice.status}" status`,
        data: null,
      };
    }

    const updatedInvoice = await InvoiceModel.findByIdAndUpdate(
      id,
      { $set: body },
      { new: true, runValidators: true }
    );

    return {
      success: true,
      message: "Invoice updated successfully",
      data: updatedInvoice,
    };
  } catch (error: any) {
    console.error("Error updating invoice:", error);
    return {
      success: false,
      message: error.message || "Failed to update invoice",
      data: null,
    };
  }
};

export const deleteInvoiceService = async (id: string, res: Response) => {
  try {
    const invoice = await InvoiceModel.findById(id);

    if (!invoice) {
      return {
        success: false,
        message: "Invoice not found",
        data: null,
      };
    }

    if (!['draft', 'cancelled'].includes(invoice.status)) {
      return {
        success: false,
        message: `Cannot delete invoice in "${invoice.status}" status`,
        data: null,
      };
    }

    await InvoiceModel.findByIdAndDelete(id);

    return {
      success: true,
      message: "Invoice deleted successfully",
      data: null,
    };
  } catch (error: any) {
    console.error("Error deleting invoice:", error);
    return {
      success: false,
      message: error.message || "Failed to delete invoice",
      data: null,
    };
  }
};

export const updateInvoiceStatusService = async (id: string, body: any, res: Response) => {
  try {
    const { status } = body;
    const invoice = await InvoiceModel.findById(id);

    if (!invoice) {
      return {
        success: false,
        message: "Invoice not found",
        data: null,
      };
    }

    let updatedInvoice;
    switch (status) {
      case 'paid':
        updatedInvoice = await invoice.markAsPaid();
        break;
      case 'sent':
        updatedInvoice = await invoice.sendInvoice();
        // Send email when marking as sent
        try {
          await sendInvoiceEmail({
            to: invoice.clientInfo.email,
            clientName: invoice.clientInfo.clientName,
            invoiceNumber: invoice.invoiceNumber,
            amount: invoice.subtotal,        // ✅ From DB
            taxAmount: invoice.taxTotal,     // ✅ From DB
            totalAmount: invoice.grandTotal, // ✅ From DB
            dueDate: invoice.dueDate,
            items: invoice.items || [],
          });
        } catch (emailError) {
          console.error("Error sending invoice email:", emailError);
        }
        break;
      case 'viewed':
        updatedInvoice = await invoice.markAsViewed();
        break;
      default:
        invoice.status = status;
        updatedInvoice = await invoice.save();
    }

    return {
      success: true,
      message: `Invoice ${status} successfully`,
      data: updatedInvoice,
    };
  } catch (error: any) {
    console.error("Error updating invoice status:", error);
    return {
      success: false,
      message: error.message || "Failed to update invoice status",
      data: null,
    };
  }
};