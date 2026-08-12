// controllers/invoice/quote.controller.ts
import { Request, Response } from "express";
import {
  createQuoteService,
  getQuotesService,
  getQuoteService,
  updateQuoteService,
  deleteQuoteService,
  sendQuoteService,
  saveDraftQuoteService,
  updateQuoteStatusService,
} from "../../../services/admin/invoice/quote";

// ============================================
// CREATE QUOTE
// ============================================
export const createQuote = async (req: Request, res: Response) => {
  try {
    const result = await createQuoteService(req.body, res);
    res.status(result.success ? 201 : 400).json(result);
  } catch (error: any) {
    console.error("Error in createQuote controller:", error);
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
export const saveDraftQuote = async (req: Request, res: Response) => {
  try {
    const result = await saveDraftQuoteService(req.body, res);
    res.status(result.success ? 201 : 400).json(result);
  } catch (error: any) {
    console.error("Error in saveDraftQuote controller:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Internal server error",
      data: null,
    });
  }
};

// ============================================
// GET ALL QUOTES
// ============================================
export const getQuotes = async (req: Request, res: Response) => {
  try {
    const result = await getQuotesService(req.query, res);
    res.status(result.success ? 200 : 400).json(result);
  } catch (error: any) {
    console.error("Error in getQuotes controller:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Internal server error",
      data: null,
    });
  }
};

// ============================================
// GET SINGLE QUOTE
// ============================================
export const getQuote = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const result = await getQuoteService(id, res);
    res.status(result.success ? 200 : 404).json(result);
  } catch (error: any) {
    console.error("Error in getQuote controller:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Internal server error",
      data: null,
    });
  }
};

// ============================================
// UPDATE QUOTE
// ============================================
export const updateQuote = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const result = await updateQuoteService(id, req.body, res);
    res.status(result.success ? 200 : 400).json(result);
  } catch (error: any) {
    console.error("Error in updateQuote controller:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Internal server error",
      data: null,
    });
  }
};

// ============================================
// DELETE QUOTE
// ============================================
export const deleteQuote = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const result = await deleteQuoteService(id, res);
    res.status(result.success ? 200 : 400).json(result);
  } catch (error: any) {
    console.error("Error in deleteQuote controller:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Internal server error",
      data: null,
    });
  }
};

// ============================================
// SEND QUOTE
// ============================================
export const sendQuote = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const result = await sendQuoteService(id, req.body, res);
    res.status(result.success ? 200 : 400).json(result);
  } catch (error: any) {
    console.error("Error in sendQuote controller:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Internal server error",
      data: null,
    });
  }
};

// ============================================
// UPDATE QUOTE STATUS
// ============================================
export const updateQuoteStatus = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const result = await updateQuoteStatusService(id, req.body, res);
    res.status(result.success ? 200 : 400).json(result);
  } catch (error: any) {
    console.error("Error in updateQuoteStatus controller:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Internal server error",
      data: null,
    });
  }
};