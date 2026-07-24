// services/product/product-mapping.service.ts

// ✅ Map product IDs directly to PDF files
const PRODUCT_PDF_MAP: Record<string, { fileUrl: string; fileName: string }> = {
  // Strategy Products
  '1': {
    fileUrl: '/uploads/pdfs/1-media-strategy-playbook.pdf',
    fileName: 'Media-Strategy-Playbook.pdf'
  },
  '2': {
    fileUrl: '/uploads/pdfs/2-crisis-communication-pack.pdf',
    fileName: 'Crisis-Communication-Pack.pdf'
  },
  '6': {
    fileUrl: '/uploads/pdfs/6-stakeholder-mapping-toolkit.pdf',
    fileName: 'Stakeholder-Mapping-Toolkit.pdf'
  },
  
  // Templates
  '4': {
    fileUrl: '/uploads/pdfs/4-pr-pitch-deck-template.pdf',
    fileName: 'PR-Pitch-Deck-Template.pdf'
  },
  '3': {
    fileUrl: '/uploads/pdfs/3-brand-voice-guide.pdf',
    fileName: 'Brand-Voice-Guide-Template.pdf'
  },
  '7': {
    fileUrl: '/uploads/pdfs/7-executive-messaging-framework.pdf',
    fileName: 'Executive-Messaging-Framework.pdf'
  },
  
  // Content
  '5': {
    fileUrl: '/uploads/pdfs/5-content-calendar.pdf',
    fileName: 'Institutional-Content-Calendar.pdf'
  },
  '8': {
    fileUrl: '/uploads/pdfs/8-digital-pr-starter-kit.pdf',
    fileName: 'Digital-PR-Starter-Kit.pdf'
  }
};

/**
 * Get PDF file info by product ID
 */
export const getPDFFileInfoById = (productId: string): { fileUrl: string; fileName: string } | null => {
  return PRODUCT_PDF_MAP[productId] || null;
};

/**
 * Get PDF file info for multiple products
 */
export const getPDFFileInfoBulk = (products: Array<{ productId: string }>) => {
  return products.map(product => {
    const fileInfo = getPDFFileInfoById(product.productId);
    return fileInfo || {
      fileUrl: `/uploads/pdfs/${product.productId}-default.pdf`,
      fileName: `Product-${product.productId}.pdf`
    };
  });
};

/**
 * Get product details with PDF info
 */
export const getProductWithPDFInfo = (productId: string, productTitle: string) => {
  const fileInfo = getPDFFileInfoById(productId);
  return {
    productId,
    title: productTitle,
    fileUrl: fileInfo?.fileUrl || `/uploads/pdfs/${productId}-default.pdf`,
    fileName: fileInfo?.fileName || `${productTitle || 'Product'}.pdf`
  };
};

export default {
  getPDFFileInfoById,
  getPDFFileInfoBulk,
  getProductWithPDFInfo,
  PRODUCT_PDF_MAP
};