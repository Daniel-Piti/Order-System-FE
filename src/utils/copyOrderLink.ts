/**
 * Copy store order link to clipboard. Used by OrdersPage and AgentOrdersPage.
 * Returns true if copy succeeded, false otherwise.
 */

const STORE_ORDER_PATH = '/store/order/';

export function getOrderStoreLink(orderId: string): string {
  const baseUrl = import.meta.env.VITE_FRONTEND_URL || (typeof window !== 'undefined' ? window.location.origin : '');
  return `${baseUrl}${STORE_ORDER_PATH}${orderId}`;
}

export async function copyOrderLink(orderId: string): Promise<boolean> {
  const fullLink = getOrderStoreLink(orderId);
  try {
    await navigator.clipboard.writeText(fullLink);
    return true;
  } catch {
    try {
      const textArea = document.createElement('textarea');
      textArea.value = fullLink;
      textArea.style.position = 'fixed';
      textArea.style.opacity = '0';
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      return true;
    } catch {
      return false;
    }
  }
}
