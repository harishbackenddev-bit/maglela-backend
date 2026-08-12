// services/invoice/quote.service.ts
import { QuoteModel } from "../../../models/invoice/quote-schema";
import { Response } from "express";
import { sendQuoteEmail } from "../../../utils/mails/invoiceemail";

export const createQuoteService = async (body: any, res: Response) => {
  try {
    const { 
      clientInfo, 
      validUntil, 
      items, 
      additionalNotes, 
      createdBy, 
      createdByEmail,
      status = "sent" // Default to sent
    } = body;

    // Validate required fields
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

    // Generate quote number
    const quoteNumber = await QuoteModel.generateQuoteNumber();

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

    // Create quote
    const quote = await QuoteModel.create({
      quoteNumber,
      clientInfo,
      validUntil: validUntil || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
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
        await sendQuoteEmail({
          to: clientInfo.email,
          clientName: clientInfo.clientName,
          quoteNumber: quote.quoteNumber,
          amount: quote.subtotal,        // ✅ From DB
          taxAmount: quote.taxTotal,     // ✅ From DB
          totalAmount: quote.grandTotal, // ✅ From DB
          validUntil: quote.validUntil,
          items: itemsWithTotals,
        });
        console.log(`📧 Quote email sent to ${clientInfo.email}`);
      } catch (emailError) {
        console.error("Error sending quote email:", emailError);
        // Don't fail the request if email fails
      }
    }

    return {
      success: true,
      message: status === "sent" ? "Quote created and sent successfully" : "Quote saved as draft",
      data: quote,
    };
  } catch (error: any) {
    console.error("Error creating quote:", error);
    return {
      success: false,
      message: error.message || "Failed to create quote",
      data: null,
    };
  }
};

export const saveDraftQuoteService = async (body: any, res: Response) => {
  try {
    const { clientInfo, validUntil, items, additionalNotes, createdBy, createdByEmail } = body;

    if (!clientInfo?.clientName || !clientInfo?.email) {
      return {
        success: false,
        message: "Client name and email are required",
        data: null,
      };
    }

    const quoteNumber = await QuoteModel.generateQuoteNumber();

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

    const quote = await QuoteModel.create({
      quoteNumber,
      clientInfo,
      validUntil: validUntil || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
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
      message: "Quote saved as draft",
      data: quote,
    };
  } catch (error: any) {
    console.error("Error saving draft:", error);
    return {
      success: false,
      message: error.message || "Failed to save draft",
      data: null
    };
  }
};

export const sendQuoteService = async (id: string, body: any, res: Response) => {
  try {
    const quote = await QuoteModel.findById(id);
    
    if (!quote) {
      return {
        success: false,
        message: "Quote not found",
        data: null,
      };
    }

    if (quote.status === 'sent' || quote.status === 'accepted') {
      return {
        success: false,
        message: `Quote is already ${quote.status}`,
        data: null,
      };
    }

    // Update status to sent
    quote.status = 'sent';
    quote.sentAt = new Date();
    await quote.save();

    // Send email
    try {
      await sendQuoteEmail({
        to: quote.clientInfo.email,
        clientName: quote.clientInfo.clientName,
        quoteNumber: quote.quoteNumber,
        amount: quote.subtotal,        // ✅ From DB
        taxAmount: quote.taxTotal,     // ✅ From DB
        totalAmount: quote.grandTotal, // ✅ From DB
        validUntil: quote.validUntil,
        items: quote.items || [],
      });
      console.log(`📧 Quote email sent to ${quote.clientInfo.email}`);
    } catch (emailError) {
      console.error("Error sending quote email:", emailError);
      // Don't fail the request if email fails
    }

    return {
      success: true,
      message: "Quote sent successfully",
      data: quote,
    };
  } catch (error: any) {
    console.error("Error sending quote:", error);
    return {
      success: false,
      message: error.message || "Failed to send quote",
      data: null,
    };
  }
};

export const getQuotesService = async (payload: any, res: Response) => {
  try {
    const { status, clientEmail } = payload;
    const filter: any = {};

    if (status) filter.status = status;
    if (clientEmail) filter['clientInfo.email'] = clientEmail;

    const quotes = await QuoteModel.find(filter)
      .sort({ createdAt: -1 });

    return {
      success: true,
      message: "Quotes fetched successfully",
      data: quotes,
    };
  } catch (error: any) {
    console.error("Error fetching quotes:", error);
    return {
      success: false,
      message: error.message || "Failed to fetch quotes",
      data: null,
    };
  }
};

export const getQuoteService = async (id: string, res: Response) => {
  try {
    const quote = await QuoteModel.findById(id);
    
    if (!quote) {
      return {
        success: false,
        message: "Quote not found",
        data: null,
      };
    }

    return {
      success: true,
      message: "Quote fetched successfully",
      data: quote,
    };
  } catch (error: any) {
    console.error("Error fetching quote:", error);
    return {
      success: false,
      message: error.message || "Failed to fetch quote",
      data: null,
    };
  }
};

export const updateQuoteService = async (id: string, body: any, res: Response) => {
  try {
    const quote = await QuoteModel.findById(id);
    
    if (!quote) {
      return {
        success: false,
        message: "Quote not found",
        data: null,
      };
    }

    if (quote.status !== 'draft') {
      return {
        success: false,
        message: `Cannot update quote in "${quote.status}" status`,
        data: null,
      };
    }

    const updatedQuote = await QuoteModel.findByIdAndUpdate(
      id,
      { $set: body },
      { new: true, runValidators: true }
    );

    return {
      success: true,
      message: "Quote updated successfully",
      data: updatedQuote,
    };
  } catch (error: any) {
    console.error("Error updating quote:", error);
    return {
      success: false,
      message: error.message || "Failed to update quote",
      data: null,
    };
  }
};

export const deleteQuoteService = async (id: string, res: Response) => {
  try {
    const quote = await QuoteModel.findById(id);
    
    if (!quote) {
      return {
        success: false,
        message: "Quote not found",
        data: null,
      };
    }

    if (!['draft', 'rejected'].includes(quote.status)) {
      return {
        success: false,
        message: `Cannot delete quote in "${quote.status}" status`,
        data: null,
      };
    }

    await QuoteModel.findByIdAndDelete(id);

    return {
      success: true,
      message: "Quote deleted successfully",
      data: null,
    };
  } catch (error: any) {
    console.error("Error deleting quote:", error);
    return {
      success: false,
      message: error.message || "Failed to delete quote",
      data: null,
    };
  }
};

export const updateQuoteStatusService = async (id: string, body: any, res: Response) => {
  try {
    const { status } = body;
    const quote = await QuoteModel.findById(id);
    
    if (!quote) {
      return {
        success: false,
        message: "Quote not found",
        data: null,
      };
    }

    let updatedQuote;
    switch (status) {
      case 'accepted':
        updatedQuote = await quote.acceptQuote();
        break;
      case 'rejected':
        updatedQuote = await quote.rejectQuote();
        break;
      case 'sent':
        updatedQuote = await quote.sendQuote();
        // Send email when marking as sent
        try {
          await sendQuoteEmail({
            to: quote.clientInfo.email,
            clientName: quote.clientInfo.clientName,
            quoteNumber: quote.quoteNumber,
            amount: quote.subtotal,        // ✅ From DB
            taxAmount: quote.taxTotal,     // ✅ From DB
            totalAmount: quote.grandTotal, // ✅ From DB
            validUntil: quote.validUntil,
            items: quote.items || [],
          });
        } catch (emailError) {
          console.error("Error sending quote email:", emailError);
        }
        break;
      default:
        quote.status = status;
        updatedQuote = await quote.save();
    }

    return {
      success: true,
      message: `Quote ${status} successfully`,
      data: updatedQuote,
    };
  } catch (error: any) {
    console.error("Error updating quote status:", error);
    return {
      success: false,
      message: error.message || "Failed to update quote status",
      data: null,
    };
  }
};