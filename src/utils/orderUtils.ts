/**
 * Shared order UI helpers: status labels/colors, date formatting, card/row styles.
 * Single source of truth for order status display across OrdersPage, AgentOrdersPage,
 * OrderViewModal, CustomerDetailPage, AgentCustomerDetailPage.
 */

export type OrderStatus = 'EMPTY' | 'PLACED' | 'DONE' | 'EXPIRED' | 'CANCELLED';

export function getStatusLabel(status: string): string {
  switch (status) {
    case 'EMPTY': return 'ריק';
    case 'PLACED': return 'הוזמן';
    case 'DONE': return 'הושלם';
    case 'EXPIRED': return 'פג תוקף';
    case 'CANCELLED': return 'בוטל';
    default: return status;
  }
}

export function getStatusColor(status: string): string {
  switch (status) {
    case 'EMPTY': return 'bg-gray-100 text-gray-700 border-2 border-gray-700';
    case 'PLACED': return 'bg-blue-100 text-blue-700 border-2 border-blue-700';
    case 'DONE': return 'bg-green-100 text-green-700 border-2 border-green-700';
    case 'EXPIRED': return 'bg-orange-100 text-orange-700 border-2 border-orange-700';
    case 'CANCELLED': return 'bg-red-100 text-red-700 border-2 border-red-700';
    default: return 'bg-gray-100 text-gray-700 border-2 border-gray-700';
  }
}

/** Date for list/card (e.g. "15 בינו׳ 2025") */
export function formatOrderDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('he-IL', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

/** Short date (e.g. "15/01/25") */
export function formatOrderDateShort(dateString: string): string {
  const date = new Date(dateString);
  const day = date.getDate().toString().padStart(2, '0');
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const year = date.getFullYear().toString().slice(-2);
  return `${day}/${month}/${year}`;
}

export interface OrderCardDateInfo {
  label: string;
  date: string;
}

/** Minimal order shape for getOrderCardDate */
export interface OrderForCardDate {
  status: string;
  createdAt: string;
  placedAt?: string | null;
  doneAt?: string | null;
  linkExpiresAt?: string;
}

export function getOrderCardDate(order: OrderForCardDate): OrderCardDateInfo | null {
  switch (order.status) {
    case 'EMPTY':
      return { label: 'נוצר ב:\u00A0', date: order.createdAt };
    case 'PLACED':
      return { label: 'הוזמן ב:\u00A0', date: order.placedAt || order.createdAt };
    case 'DONE':
      return { label: 'הושלם ב:\u00A0', date: order.doneAt || order.placedAt || order.createdAt };
    case 'EXPIRED':
      return order.linkExpiresAt ? { label: 'פג תוקף ב:\u00A0', date: order.linkExpiresAt } : null;
    case 'CANCELLED':
      return null;
    default:
      return { label: 'נוצר ב:\u00A0', date: order.createdAt };
  }
}

export function getCardStyles(status: string): { container: string; accent: string } {
  switch (status) {
    case 'EMPTY':
      return {
        container: 'bg-gradient-to-br from-gray-50/90 via-gray-100/80 to-gray-50/90 border-2 border-gray-300/60 shadow-md hover:shadow-xl hover:border-gray-400/80',
        accent: 'bg-gray-200/50',
      };
    case 'PLACED':
      return {
        container: 'bg-gradient-to-br from-blue-50/90 via-indigo-50/80 to-blue-50/90 border-2 border-blue-300/60 shadow-md hover:shadow-xl hover:border-blue-400/80 hover:shadow-blue-200/50',
        accent: 'bg-blue-200/50',
      };
    case 'DONE':
      return {
        container: 'bg-gradient-to-br from-green-50/90 via-emerald-50/80 to-green-50/90 border-2 border-green-300/60 shadow-md hover:shadow-xl hover:border-green-400/80 hover:shadow-green-200/50',
        accent: 'bg-green-200/50',
      };
    case 'EXPIRED':
      return {
        container: 'bg-gradient-to-br from-orange-50/90 via-amber-50/80 to-orange-50/90 border-2 border-orange-300/60 shadow-md hover:shadow-xl hover:border-orange-400/80 hover:shadow-orange-200/50',
        accent: 'bg-orange-200/50',
      };
    case 'CANCELLED':
      return {
        container: 'bg-gradient-to-br from-red-50/90 via-rose-50/80 to-red-50/90 border-2 border-red-300/60 shadow-md hover:shadow-xl hover:border-red-400/80 hover:shadow-red-200/50',
        accent: 'bg-red-200/50',
      };
    default:
      return {
        container: 'bg-gradient-to-br from-gray-50/90 via-gray-100/80 to-gray-50/90 border-2 border-gray-300/60 shadow-md hover:shadow-xl hover:border-gray-400/80',
        accent: 'bg-gray-200/50',
      };
}

export function getLabelStyles(status: string): { bg: string; border: string; borderHover: string; text: string } {
  switch (status) {
    case 'EMPTY':
      return { bg: 'bg-gradient-to-r from-gray-100/90 to-gray-100/90', border: 'border-gray-300/60', borderHover: 'group-hover:border-gray-400/80', text: 'text-gray-900' };
    case 'PLACED':
      return { bg: 'bg-gradient-to-r from-blue-100/90 to-indigo-100/90', border: 'border-blue-300/60', borderHover: 'group-hover:border-blue-400/80', text: 'text-blue-900' };
    case 'DONE':
      return { bg: 'bg-gradient-to-r from-green-100/90 to-emerald-100/90', border: 'border-green-300/60', borderHover: 'group-hover:border-green-400/80', text: 'text-green-900' };
    case 'EXPIRED':
      return { bg: 'bg-gradient-to-r from-orange-100/90 to-amber-100/90', border: 'border-orange-300/60', borderHover: 'group-hover:border-orange-400/80', text: 'text-orange-900' };
    case 'CANCELLED':
      return { bg: 'bg-gradient-to-r from-red-100/90 to-rose-100/90', border: 'border-red-300/60', borderHover: 'group-hover:border-red-400/80', text: 'text-red-900' };
    default:
      return { bg: 'bg-gradient-to-r from-gray-100/90 to-gray-100/90', border: 'border-gray-300/60', borderHover: 'group-hover:border-gray-400/80', text: 'text-gray-900' };
  }
}

/** Row background for table/list rows by status */
export function getOrderRowClass(status: string): string {
  switch (status) {
    case 'EMPTY': return 'bg-gray-50/90 hover:bg-gray-100/90';
    case 'PLACED': return 'bg-blue-50/80 hover:bg-blue-100/80';
    case 'DONE': return 'bg-green-50/80 hover:bg-green-100/80';
    case 'EXPIRED': return 'bg-orange-50/80 hover:bg-orange-100/80';
    case 'CANCELLED': return 'bg-red-50/80 hover:bg-red-100/80';
    default: return 'bg-gray-50/90 hover:bg-gray-100/90';
  }
}

/** Translate backend discount error messages to Hebrew (shared by OrdersPage, AgentOrdersPage, CustomerDetailPage, AgentCustomerDetailPage). */
export function translateDiscountErrorMessage(errorMessage: string): string {
  if (errorMessage.includes('can have at most 2 decimal places')) return 'הנחה יכולה לכלול עד 2 ספרות אחרי הנקודה';
  if (errorMessage.includes('cannot exceed the total price')) return 'הנחה לא יכולה לעלות על סכום ההזמנה';
  if (errorMessage.includes('must be greater than or equal to 0')) return 'הנחה חייבת להיות מספר חיובי';
  return errorMessage;
}
