import { describe, it, expect, vi, beforeEach } from "vitest";
import fs from "fs";
import { mockReq, mockRes } from "../setup/express";

const { orderModel } = vi.hoisted(() => {
  const find = vi.fn();
  const sort = vi.fn();
  return { orderModel: { find, sort, findOne: vi.fn(), findByIdAndUpdate: vi.fn() } };
});
vi.mock("src/models/orders/order-schema", () => ({ orderModel }));
vi.mock("src/services/payfast/payfast");

import { getUserOrders, downloadProduct, cancelOrder } from "src/controllers/payfast/payfast";

beforeEach(() => { vi.clearAllMocks(); });

describe("getUserOrders", () => {
  it("400 when email missing", async () => {
    const res = mockRes();
    await getUserOrders(mockReq({ params: {} }), res);
    expect(res.status).toHaveBeenCalledWith(400);
  });
  it("returns the user's orders newest first", async () => {
    const sort = vi.fn().mockResolvedValue([{ orderNumber: "A" }]);
    orderModel.find.mockReturnValue({ sort });
    const res = mockRes();
    await getUserOrders(mockReq({ params: { email: "a@b.com" } }), res);
    expect(orderModel.find).toHaveBeenCalledWith({ userEmail: "a@b.com" });
    expect(sort).toHaveBeenCalledWith({ createdAt: -1 });
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ success: true, message: "Orders fetched successfully", data: [{ orderNumber: "A" }] });
  });
  it("500 when the query fails", async () => {
    orderModel.find.mockReturnValue({ sort: vi.fn().mockRejectedValue(new Error("db")) });
    const res = mockRes();
    await getUserOrders(mockReq({ params: { email: "a@b.com" } }), res);
    expect(res.status).toHaveBeenCalledWith(500);
  });
});

describe("cancelOrder", () => {
  const run = async (order: any, params: any = { orderId: "ORD-1" }) => {
    orderModel.findOne.mockResolvedValue(order);
    orderModel.findByIdAndUpdate.mockResolvedValue({ ...order, status: "cancelled" });
    const res = mockRes();
    await cancelOrder(mockReq({ params }), res);
    return res;
  };
  it("400 without orderId", async () => expect((await run(null, {})).status).toHaveBeenCalledWith(400));
  it("404 when the order does not exist", async () => expect((await run(null)).status).toHaveBeenCalledWith(404));
  it.each(["paid", "completed"])("400 'Cannot cancel a paid order' for %s orders", async (status) => {
    const res = await run({ _id: "1", orderNumber: "ORD-1", status });
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ success: false, message: "Cannot cancel a paid order" });
    expect(orderModel.findByIdAndUpdate).not.toHaveBeenCalled();
  });
  it("400 when already cancelled", async () => {
    const res = await run({ _id: "1", orderNumber: "ORD-1", status: "cancelled" });
    expect(res.json).toHaveBeenCalledWith({ success: false, message: "Order is already cancelled" });
  });
  it("cancels a pending order", async () => {
    const res = await run({ _id: "1", orderNumber: "ORD-1", status: "pending" });
    expect(orderModel.findByIdAndUpdate).toHaveBeenCalledWith("1", { status: "cancelled" }, { new: true });
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true, message: "Order cancelled successfully" }));
  });
  it("looks the order up by _id OR orderNumber", async () => {
    await run({ _id: "1", status: "pending" }, { orderId: "XYZ" });
    expect(orderModel.findOne).toHaveBeenCalledWith({ $or: [{ _id: "XYZ" }, { orderNumber: "XYZ" }] });
  });
});

describe("downloadProduct", () => {
  const run = async (order: any, params: any = { orderNumber: "ORD-1", productId: "1" }) => {
    orderModel.findOne.mockResolvedValue(order);
    const res = mockRes();
    await downloadProduct(mockReq({ params }), res);
    return res;
  };
  const paid = (item: any = { productId: "1", title: "Playbook", fileUrl: "/uploads/pdfs/a.pdf" }) => ({ status: "paid", items: [item] });

  it("400 when params missing", async () => expect((await run(null, { orderNumber: "x" })).status).toHaveBeenCalledWith(400));
  it("404 when order missing", async () => expect((await run(null)).status).toHaveBeenCalledWith(404));
  it("403 when the order is not paid", async () => {
    const res = await run({ status: "pending", items: [] });
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ orderStatus: "pending" }));
  });
  it("404 when the product is not in the order", async () => {
    const res = await run(paid({ productId: "9", fileUrl: "/x.pdf" }));
    expect(res.json).toHaveBeenCalledWith({ success: false, message: "Product not found in this order" });
  });
  it("404 when the item has no fileUrl", async () => {
    const res = await run(paid({ productId: "1", title: "T" }));
    expect(res.json).toHaveBeenCalledWith({ success: false, message: "File URL not found for this product" });
  });
  it("404 when the file is not on disk", async () => {
    vi.spyOn(fs, "existsSync").mockReturnValue(false);
    const res = await run(paid());
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ message: "File not found on server" }));
    vi.restoreAllMocks();
  });
  it("streams the pdf with download headers when everything is fine", async () => {
    vi.spyOn(fs, "existsSync").mockReturnValue(true);
    vi.spyOn(fs, "statSync").mockReturnValue({ size: 1234 } as any);
    const pipe = vi.fn();
    vi.spyOn(fs, "createReadStream").mockReturnValue({ pipe } as any);
    const res = await run(paid({ productId: "1", title: "Playbook", fileUrl: "/uploads/pdfs/a.pdf", fileName: "Playbook.pdf" }));
    expect(res.setHeader).toHaveBeenCalledWith("Content-Type", "application/pdf");
    expect(res.setHeader).toHaveBeenCalledWith("Content-Disposition", 'attachment; filename="Playbook.pdf"');
    expect(res.setHeader).toHaveBeenCalledWith("Content-Length", 1234);
    expect(pipe).toHaveBeenCalledWith(res);
    vi.restoreAllMocks();
  });
  it("falls back to '<title>.pdf' when fileName is missing", async () => {
    vi.spyOn(fs, "existsSync").mockReturnValue(true);
    vi.spyOn(fs, "statSync").mockReturnValue({ size: 1 } as any);
    vi.spyOn(fs, "createReadStream").mockReturnValue({ pipe: vi.fn() } as any);
    const res = await run(paid({ productId: "1", title: "Kit", fileUrl: "/a.pdf" }));
    expect(res.setHeader).toHaveBeenCalledWith("Content-Disposition", 'attachment; filename="Kit.pdf"');
    vi.restoreAllMocks();
  });
});
