/**
 * Generate vCard content from contact data
 */
export interface VCardContact {
  name: string;
  email?: string;
  mobile?: string;
  linkedin?: string;
  whatsapp?: string;
  organization?: string;
}

export function generateVCard(contact: VCardContact): string {
  const lines = [
    'BEGIN:VCARD',
    'VERSION:3.0',
    `FN:${contact.name}`,
    `N:${contact.name};;;;`,
  ];

  if (contact.organization) {
    lines.push(`ORG:${contact.organization}`);
  }

  if (contact.email) {
    lines.push(`EMAIL;TYPE=INTERNET:${contact.email}`);
  }

  if (contact.mobile) {
    lines.push(`TEL;TYPE=CELL:${contact.mobile}`);
  }

  if (contact.whatsapp) {
    lines.push(`TEL;TYPE=WHATSAPP:${contact.whatsapp}`);
  }

  if (contact.linkedin) {
    lines.push(`URL:${contact.linkedin}`);
  }

  lines.push('END:VCARD');

  return lines.join('\r\n');
}

/**
 * Download vCard file
 */
export function downloadVCard(contact: VCardContact) {
  const vcard = generateVCard(contact);
  const blob = new Blob([vcard], { type: 'text/vcard;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.href = url;
  link.download = `${contact.name.replace(/\s+/g, '_')}.vcf`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
