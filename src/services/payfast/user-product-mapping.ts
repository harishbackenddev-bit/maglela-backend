// services/product/toolkit-mapping.ts

// ✅ Toolkit PDF Mapping
const TOOLKIT_PDF_MAP: Record<string, { fileUrl: string; fileName: string }> = {
  '1': {
    fileUrl: '/uploads/toolkits/101-communications-playbook.pdf',
    fileName: 'Communications-Playbook.pdf'
  },
  '2': {
    fileUrl: '/uploads/toolkits/102-press-release-templates.pdf',
    fileName: 'Press-Release-Templates.pdf'
  },
  '3': {
    fileUrl: '/uploads/toolkits/103-annual-report-kit.pdf',
    fileName: 'Annual-Report-Kit.pdf'
  },
  '4': {
    fileUrl: '/uploads/toolkits/104-crisis-framework.pdf',
    fileName: 'Crisis-Communications.pdf'
  },
  '5': {
    fileUrl: '/uploads/toolkits/105-content-calendar.pdf',
    fileName: 'Social-Media-Calendar.pdf'
  },
  '6': {
    fileUrl: '/uploads/toolkits/106-stakeholder-engagement.pdf',
    fileName: 'Stakeholder-Engagement.pdf'
  },
  '7': {
    fileUrl: '/uploads/toolkits/107-research-communications.pdf',
    fileName: 'Research-Communications.pdf'
  },
  '8': {
    fileUrl: '/uploads/toolkits/108-brand-voice-guide.pdf',
    fileName: 'Brand-Voice-Guide.pdf'
  }
};

/**
 * Get toolkit PDF file info by ID
 */
export const getToolkitFileInfoById = (toolkitId: string): { fileUrl: string; fileName: string } | null => {
  return TOOLKIT_PDF_MAP[toolkitId] || null;
};

export default {
  getToolkitFileInfoById,
  TOOLKIT_PDF_MAP
};