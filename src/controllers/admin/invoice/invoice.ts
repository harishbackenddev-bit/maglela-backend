// controllers/invoice/invoice.controller.ts
import { Request, Response } from "express";
import {
  createInvoiceService,
  getInvoicesService,
  getInvoiceService,
  updateInvoiceService,
  deleteInvoiceService,
  sendInvoiceService,
  saveDraftInvoiceService,
  updateInvoiceStatusService,
} from "../../../services/admin/invoice/invoice";

// ============================================
// CREATE INVOICE
// ============================================
export const createInvoice = async (req: Request, res: Response) => {
  try {
    const result = await createInvoiceService(req.body, res);
    res.status(result.success ? 201 : 400).json(result);
  } catch (error: any) {
    console.error("Error in createInvoice controller:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Internal server error",
      data: null,
    });
  }
};

// ============================================
// SAVE AS DRAFT
// ============================================
export const saveDraftInvoice = async (req: Request, res: Response) => {
  try {
    const result = await saveDraftInvoiceService(req.body, res);
    res.status(result.success ? 201 : 400).json(result);
  } catch (error: any) {
    console.error("Error in saveDraftInvoice controller:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Internal server error",
      data: null,
    });
  }
};

// ============================================
// GET ALL INVOICES
// ============================================
export const getInvoices = async (req: Request, res: Response) => {
  try {
    const result = await getInvoicesService(req.query, res);
    res.status(result.success ? 200 : 400).json(result);
  } catch (error: any) {
    console.error("Error in getInvoices controller:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Internal server error",
      data: null,
    });
  }
};

// ============================================
// GET SINGLE INVOICE
// ============================================
export const getInvoice = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const result = await getInvoiceService(id, res);
    res.status(result.success ? 200 : 404).json(result);
  } catch (error: any) {
    console.error("Error in getInvoice controller:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Internal server error",
      data: null,
    });
  }
};

// ============================================
// UPDATE INVOICE
// ============================================
export const updateInvoice = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const result = await updateInvoiceService(id, req.body, res);
    res.status(result.success ? 200 : 400).json(result);
  } catch (error: any) {
    console.error("Error in updateInvoice controller:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Internal server error",
      data: null,
    });
  }
};

// ============================================
// DELETE INVOICE
// ============================================
export const deleteInvoice = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const result = await deleteInvoiceService(id, res);
    res.status(result.success ? 200 : 400).json(result);
  } catch (error: any) {
    console.error("Error in deleteInvoice controller:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Internal server error",
      data: null,
    });
  }
};

// ============================================
// SEND INVOICE
// ============================================
export const sendInvoice = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const result = await sendInvoiceService(id, req.body, res);
    res.status(result.success ? 200 : 400).json(result);
  } catch (error: any) {
    console.error("Error in sendInvoice controller:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Internal server error",
      data: null,
    });
  }
};

// ============================================
// UPDATE INVOICE STATUS
// ============================================
export const updateInvoiceStatus = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const result = await updateInvoiceStatusService(id, req.body, res);
    res.status(result.success ? 200 : 400).json(result);
  } catch (error: any) {
    console.error("Error in updateInvoiceStatus controller:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Internal server error",
      data: null,
    });
  }
};