import { vi } from "vitest";

export const mockRes = () => {
  const res: any = {};
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  res.send = vi.fn().mockReturnValue(res);
  res.cookie = vi.fn().mockReturnValue(res);
  res.clearCookie = vi.fn().mockReturnValue(res);
  res.redirect = vi.fn().mockReturnValue(res);
  res.setHeader = vi.fn().mockReturnValue(res);
  res.download = vi.fn();
  return res;
};
export const mockReq = (over: any = {}) => ({ body: {}, params: {}, query: {}, headers: {}, ...over } as any);
