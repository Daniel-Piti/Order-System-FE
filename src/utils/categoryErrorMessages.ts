/**
 * Maps category API error messages (from backend) to Hebrew for display in the FE.
 */
const CATEGORY_MESSAGE_MAP: Record<string, string> = {
  'Category already exists': 'הקטגוריה כבר קיימת',
  'Category not found': 'הקטגוריה לא נמצאה',
  'Category limit exceeded': 'הוגדר מכסה מקסימלית של קטגוריות',
};

export function toHebrewCategoryMessage(apiMessage: string | undefined): string {
  if (!apiMessage) return apiMessage ?? '';
  return CATEGORY_MESSAGE_MAP[apiMessage] ?? apiMessage;
}
