/**
 * Mirrors backend `ApiErrorCode` (Kotlin). Keep in sync when BE adds/removes codes.
 * Display: prefer mapped Hebrew; unknown codes fall back to `userMessage` then `fallback`.
 */
export type ApiErrorCode =
  | 'INVALID_EMAIL_FORMAT'
  | 'INVALID_PHONE_NUMBER'
  | 'FIXED_DIGIT_LENGTH_REQUIRED'
  | 'FIELD_CANNOT_BE_BLANK'
  | 'DATE_CANNOT_BE_IN_FUTURE'
  | 'VALUE_MUST_BE_NON_NEGATIVE'
  | 'DECIMAL_PLACES_EXCEEDED'
  | 'PRICE_NOT_IN_RANGE'
  | 'PASSWORD_CONFIRMATION_MISMATCH'
  | 'NEW_PASSWORD_EQUALS_OLD_PASSWORD'
  | 'LOGIN_INVALID_EMAIL_OR_PASSWORD'
  | 'ADMIN_LOGIN_INVALID_CREDENTIALS'
  | 'ORDER_NOT_FOUND'
  | 'ORDER_STATUS_NOT_DONE'
  | 'ORDER_STATUS_NOT_PLACED'
  | 'ORDER_STATUS_NOT_CANCELLED'
  | 'ORDER_STATUS_NOT_AS_EXPECTED'
  | 'ORDER_STATUS_NOT_ALLOWED'
  | 'INVOICE_ALREADY_EXISTS_FOR_ORDER'
  | 'INVOICE_ORDER_IDS_BATCH_SIZE_EXCEEDED'
  | 'INVALID_DATE_RANGE'
  | 'CREDIT_AMOUNT_EXCEEDS_ORDER_TOTAL'
  | 'CREDIT_AMOUNT_MUST_BE_POSITIVE'
  | 'CREDIT_NOTE_DUPLICATE_PRODUCTS'
  | 'CREDIT_NOTE_PRODUCT_NOT_IN_ORDER'
  | 'CREDIT_NOTE_UNIT_PRICE_MISMATCH'
  | 'CREDIT_NOTE_QUANTITY_EXCEEDS_REMAINING'
  | 'CREDIT_NOTE_NOTES_TOO_LONG'
  | 'CREDIT_NOTE_AT_LEAST_ONE_PRODUCT_REQUIRED'
  | 'CREDIT_NOTE_QUANTITY_MUST_BE_POSITIVE'
  | 'CREDIT_NOTE_PRODUCT_ID_REQUIRED'
  | 'PRICE_CANT_BE_UNDER_PRODUCT_MIN_PRICE'
  | 'MANAGER_NOT_FOUND'
  | 'AGENT_NOT_FOUND'
  | 'PRODUCT_NOT_FOUND'
  | 'CATEGORY_NOT_FOUND'
  | 'BRAND_NOT_FOUND'
  | 'BRAND_ALREADY_EXISTS'
  | 'BRAND_LIMIT_EXCEEDED'
  | 'BUSINESS_NOT_FOUND'
  | 'CUSTOMER_NOT_FOUND'
  | 'INVOICE_NOT_FOUND'
  | 'CATEGORY_ALREADY_EXISTS'
  | 'CATEGORY_LIMIT_EXCEEDED'
  | 'BUSINESS_ALREADY_EXISTS'
  | 'CUSTOMER_LIMIT_EXCEEDED'
  | 'LOCATION_NOT_FOUND'
  | 'NO_LOCATIONS'
  | 'TOO_MANY_LOCATIONS'
  | 'CANNOT_DELETE_LAST_LOCATION'
  | 'AGENTS_LIMIT_REACHED'
  | 'PRODUCT_LIMIT_REACHED'
  | 'PRODUCT_IMAGES_LIMIT_REACHED'
  | 'EMAIL_ALREADY_EXISTS'
  | 'PASSWORD_MISMATCH'
  | 'PASSWORD_TOO_WEAK'
  | 'MIME_TYPE_NOT_SUPPORTED'
  | 'FILE_SIZE_NEED_TO_BE_POSITIVE'
  | 'FILE_NAME_CANT_BE_EMPTY'
  | 'FILE_TOO_LARGE'
  | 'INTERNAL_ERROR'
  | 'ALLOCATION_NUMBER_REQUIRED'
  | 'PAYMENT_PROOF_REQUIRED'
  | 'CREDIT_NOTE_ALLOCATION_MISMATCH'
  | 'NO_PRODUCTS_IN_ORDER'
  | 'ERROR_GENERATING_UPLOAD_URL'
  | 'FAILED_UPLOAD_FILE'
  | 'OVERRIDE_PRICE_LESS_THAN_MIN_PRICE'
  | 'PRODUCT_OVERRIDE_NOT_FOUND'
  | 'PRODUCT_OVERRIDE_ALREADY_EXISTS'
  | 'ORDER_CREDIT_EXCEEDS_PRODUCTS_TOTAL';

export const API_ERROR_MESSAGES: Record<ApiErrorCode, string> = {
  INVALID_EMAIL_FORMAT: 'פורמט אימייל לא תקין',
  INVALID_PHONE_NUMBER: 'מספר טלפון לא תקין (8–10 ספרות)',
  FIXED_DIGIT_LENGTH_REQUIRED: 'הערך חייב להיות מספר באורך המדויק שנדרש',
  FIELD_CANNOT_BE_BLANK: 'שדה חובה ריק',
  DATE_CANNOT_BE_IN_FUTURE: 'תאריך לא יכול להיות בעתיד',
  VALUE_MUST_BE_NON_NEGATIVE: 'הערך חייב להיות אפס או חיובי',
  DECIMAL_PLACES_EXCEEDED: 'יותר מדי ספרות אחרי הנקודה (מקסימום 2)',
  PRICE_NOT_IN_RANGE: 'מחיר מחוץ לטווח המותר',
  PASSWORD_CONFIRMATION_MISMATCH: 'הסיסמה החדשה והאישור אינם תואמים',
  NEW_PASSWORD_EQUALS_OLD_PASSWORD: 'הסיסמה החדשה לא יכולה להיות זהה לישנה',
  LOGIN_INVALID_EMAIL_OR_PASSWORD: 'אימייל או סיסמה שגויים',
  ADMIN_LOGIN_INVALID_CREDENTIALS: 'פרטי מנהל לא תקינים',
  ORDER_NOT_FOUND: 'ההזמנה לא נמצאה',
  ORDER_STATUS_NOT_DONE: 'ההזמנה חייבת להיות בסטטוס הושלמה',
  ORDER_STATUS_NOT_PLACED: 'ההזמנה חייבת להיות בסטטוס הוזמנה',
  ORDER_STATUS_NOT_CANCELLED: 'ההזמנה חייבת להיות בסטטוס בוטלה',
  ORDER_STATUS_NOT_AS_EXPECTED: 'סטטוס ההזמנה אינו מתאים לפעולה',
  ORDER_STATUS_NOT_ALLOWED: 'סטטוס ההזמנה אינו מאפשר את הפעולה',
  INVOICE_ALREADY_EXISTS_FOR_ORDER: 'כבר קיימת חשבונית להזמנה זו',
  INVOICE_ORDER_IDS_BATCH_SIZE_EXCEEDED: 'יותר מדי מזהי הזמנות בבקשה',
  INVALID_DATE_RANGE: 'טווח תאריכים לא תקין',
  CREDIT_AMOUNT_EXCEEDS_ORDER_TOTAL: 'סכום הזיכוי חורג מהסכום שניתן לזכות',
  CREDIT_AMOUNT_MUST_BE_POSITIVE: 'סכום הזיכוי חייב להיות חיובי',
  CREDIT_NOTE_DUPLICATE_PRODUCTS: 'אותו מוצר הופיע יותר מפעם אחת בזיכוי',
  CREDIT_NOTE_PRODUCT_NOT_IN_ORDER: 'מוצר בזיכוי שאינו בהזמנה',
  CREDIT_NOTE_UNIT_PRICE_MISMATCH: 'מחיר ליחידה אינו תואם להזמנה',
  CREDIT_NOTE_QUANTITY_EXCEEDS_REMAINING: 'כמות לזיכוי חורגת מהכמות הזמינה',
  CREDIT_NOTE_NOTES_TOO_LONG: 'הערות ארוכות מדי (מקסימום 1000 תווים)',
  CREDIT_NOTE_AT_LEAST_ONE_PRODUCT_REQUIRED: 'נדרש לפחות מוצר אחד לזיכוי',
  CREDIT_NOTE_QUANTITY_MUST_BE_POSITIVE: 'כמות לזיכוי חייבת להיות חיובית',
  CREDIT_NOTE_PRODUCT_ID_REQUIRED: 'מזהה מוצר חסר',
  PRICE_CANT_BE_UNDER_PRODUCT_MIN_PRICE: 'המחיר לא יכול להיות נמוך ממחיר מינימום המוצר',
  MANAGER_NOT_FOUND: 'מנהל לא נמצא',
  AGENT_NOT_FOUND: 'סוכן לא נמצא',
  PRODUCT_NOT_FOUND: 'מוצר לא נמצא',
  CATEGORY_NOT_FOUND: 'קטגוריה לא נמצאה',
  BRAND_NOT_FOUND: 'מותג לא נמצא',
  BRAND_ALREADY_EXISTS: 'מותג בשם זה כבר קיים',
  BRAND_LIMIT_EXCEEDED: 'הגעת למגבלת המותגים',
  BUSINESS_NOT_FOUND: 'פרטי עסק לא נמצאו',
  CUSTOMER_NOT_FOUND: 'לקוח לא נמצא',
  INVOICE_NOT_FOUND: 'חשבונית לא נמצאה',
  CATEGORY_ALREADY_EXISTS: 'קטגוריה בשם זה כבר קיימת',
  CATEGORY_LIMIT_EXCEEDED: 'הגעת למגבלת הקטגוריות',
  BUSINESS_ALREADY_EXISTS: 'כבר קיים עסק למנהל זה',
  CUSTOMER_LIMIT_EXCEEDED: 'הגעת למגבלת הלקוחות',
  LOCATION_NOT_FOUND: 'מיקום לא נמצא',
  NO_LOCATIONS: 'יש להוסיף לפחות מיקום אחד',
  TOO_MANY_LOCATIONS: 'הגעת למגבלת המיקומים',
  CANNOT_DELETE_LAST_LOCATION: 'לא ניתן למחוק את המיקום האחרון',
  AGENTS_LIMIT_REACHED: 'הגעת למגבלת הסוכנים',
  PRODUCT_LIMIT_REACHED: 'הגעת למגבלת המוצרים',
  PRODUCT_IMAGES_LIMIT_REACHED: 'הגעת למגבלת תמונות המוצר',
  EMAIL_ALREADY_EXISTS: 'כתובת האימייל כבר קיימת במערכת',
  PASSWORD_MISMATCH: 'סיסמה שגויה',
  PASSWORD_TOO_WEAK: 'הסיסמה חלשה מדי',
  MIME_TYPE_NOT_SUPPORTED: 'סוג קובץ לא נתמך',
  FILE_SIZE_NEED_TO_BE_POSITIVE: 'גודל קובץ לא תקין',
  FILE_NAME_CANT_BE_EMPTY: 'שם קובץ חסר',
  FILE_TOO_LARGE: 'הקובץ גדול מדי',
  INTERNAL_ERROR: 'שגיאת שרת. נסה שוב מאוחר יותר',
  ALLOCATION_NUMBER_REQUIRED: 'נדרש מספר הקצאה',
  PAYMENT_PROOF_REQUIRED: 'נדרש אסמכתא לתשלום',
  CREDIT_NOTE_ALLOCATION_MISMATCH: 'מספר הקצאה בזיכוי אינו תואם לחשבונית המקורית',
  NO_PRODUCTS_IN_ORDER: 'אין מוצרים בהזמנה',
  ERROR_GENERATING_UPLOAD_URL: 'שגיאה ביצירת קישור להעלאה',
  FAILED_UPLOAD_FILE: 'העלאת הקובץ נכשלה',
  OVERRIDE_PRICE_LESS_THAN_MIN_PRICE: 'מחיר העדכון נמוך ממחיר המינימום של המוצר',
  PRODUCT_OVERRIDE_NOT_FOUND: 'התאמת מחיר לא נמצאה',
  PRODUCT_OVERRIDE_ALREADY_EXISTS: 'כבר קיימת התאמת מחיר למוצר ולקוח אלה',
  ORDER_CREDIT_EXCEEDS_PRODUCTS_TOTAL: 'סכום הזיכוי גדול מסכום המוצרים',
};

export interface FailureResponseBody {
  status?: string | number;
  userMessage?: string;
  /** Some endpoints use `message` instead of `userMessage`. */
  message?: string;
  technicalMessage?: string;
  severity?: string;
  errorCode?: string;
}

function parseFailureBody(error: unknown): FailureResponseBody | undefined {
  if (!error || typeof error !== 'object') return undefined;
  const res = (error as { response?: { data?: unknown } }).response;
  const data = res?.data;
  if (!data || typeof data !== 'object') return undefined;
  return data as FailureResponseBody;
}

/** When no contextual Hebrew string is provided (e.g. empty fallback). */
export const DEFAULT_API_ERROR_HEBREW = 'אירעה שגיאה. נסה שוב מאוחר יותר.';

function getAxiosResponseStatus(error: unknown): number | undefined {
  const s = (error as { response?: { status?: number } })?.response?.status;
  return typeof s === 'number' ? s : undefined;
}

/**
 * Single catalog of Hebrew fallback strings for API errors (avoids repeating literals across the app).
 * Use {@link resolveApiErr} or {@link msgFromBody} instead of `resolveApiErrorMessage(err, '…')`.
 */
export const fallbackHe = {
  adminLoadManagers: 'נכשל בטעינת רשימת המנהלים',
  adminDeleteManager: 'נכשל במחיקת המנהל',
  adminResetPassword: 'נכשל באיפוס הסיסמה',

  createManagerAndBusiness: 'נכשל ביצירת מנהל ועסק',

  loadAgentsList: 'נכשל בטעינת רשימת הסוכנים',
  agentCreate: 'נכשל ביצירת הסוכן',
  agentUpdate: 'נכשל בעדכון הסוכן',
  agentDelete: 'נכשל במחיקת הסוכן',

  agentLoadProfile: 'נכשל בטעינת פרופיל הסוכן',
  agentLoadForProducts: 'נכשל בטעינת פרטי הסוכן',
  agentCustomersLoad: 'נכשל בטעינת לקוחות',
  agentProductsLoad: 'נכשל בטעינת מוצרים',

  overridesLoad: 'נכשל בטעינת התאמות המחיר',
  overridesCreate: 'נכשל ביצירת התאמת המחיר',
  overridesUpdate: 'נכשל בעדכון התאמת המחיר',
  overridesDelete: 'נכשל במחיקת התאמת המחיר',

  agentPriceOverrideCreate: 'נכשל ביצירת מחיר מיוחד',
  agentPriceOverrideUpdate: 'נכשל בעדכון מחיר מיוחד',
  agentPriceOverrideDelete: 'נכשל במחיקת מחיר מיוחד',

  customersLoad: 'נכשל בטעינת הלקוחות',
  customerDelete: 'נכשל במחיקת הלקוח',
  customerCreate: 'נכשל ביצירת הלקוח',
  /** Customers list / table flows */
  customerUpdate: 'נכשל בעדכון הלקוח',
  /** CustomerEditModal (manager) & AgentCustomerEditModal */
  customerModalUpdate: 'נכשל בעדכון לקוח',

  agentCustomerCreate: 'נכשל ביצירת לקוח',

  productLoad: 'נכשל בטעינת המוצרים',
  productCreate: 'נכשל ביצירת המוצר',
  productUpdate: 'נכשל בעדכון המוצר',
  productDelete: 'נכשל במחיקת המוצר',

  brandsLoad: 'נכשל בטעינת המותגים',
  brandCreate: 'נכשל ביצירת המותג',
  brandUpdate: 'נכשל בעדכון המותג',
  brandDelete: 'נכשל במחיקת המותג',

  businessUpdate: 'נכשל בעדכון פרטי העסק',

  managerProfileLoad: 'נכשל בטעינת הפרופיל',
  managerProfileUpdate: 'נכשל בעדכון הפרופיל',
  changePassword: 'נכשל בעדכון הסיסמה',

  agentProfileUpdate: 'נכשל בעדכון הפרופיל',

  businessDataLoad: 'נכשל בטעינת נתוני העסק',

  categoriesLoad: 'נכשל בטעינת הקטגוריות',
  categoryCreate: 'נכשל ביצירת קטגוריה',
  categoryUpdate: 'נכשל בעדכון קטגוריה',
  categoryDelete: 'נכשל במחיקת קטגוריה',

  locationsLoad: 'נכשל בטעינת הסניפים',
  locationCreate: 'נכשל ביצירת הסניף',
  locationUpdate: 'נכשל בעדכון הסניף',
  locationDelete: 'נכשל במחיקת הסניף',

  orderCreate: 'נכשל ביצירת הזמנה',
  orderCancel: 'נכשל בביטול ההזמנה',
  orderMarkDone: 'נכשל בסימון ההזמנה כהושלמה',
  orderDiscount: 'נכשל בעדכון ההנחה',
  orderLoadDetails: 'נכשל בטעינת פרטי ההזמנה',
  orderLoadStore: 'נכשל בטעינת ההזמנה',
  orderLinkGenerate: 'שגיאה ביצירת קישור',
  orderCheckoutCreate: 'נכשל ביצירת ההזמנה',
  orderCheckoutUpdate: 'נכשל בעדכון ההזמנה',

  invoiceCreate: 'נכשל ביצירת החשבונית',
  creditNoteCreate: 'נכשל ביצירת הזיכוי',

  overrideEditFailed: 'עדכון נכשל',
  overrideCreateFailed: 'יצירה נכשלה',
} as const;

export type FallbackHeKey = keyof typeof fallbackHe;

/** Map `errorCode` / `userMessage` from a parsed API error JSON body (e.g. raw `fetch` response). */
export function messageFromFailureBody(data: unknown, fallback: string): string {
  const fb = fallback.trim() ? fallback : DEFAULT_API_ERROR_HEBREW;
  if (!data || typeof data !== 'object') return fb;
  const d = data as FailureResponseBody;
  if (d.errorCode && typeof d.errorCode === 'string') {
    const mapped = API_ERROR_MESSAGES[d.errorCode as ApiErrorCode];
    if (mapped) return mapped;
  }
  const um = d.userMessage?.trim();
  if (um) return um;
  const msg = d.message?.trim();
  if (msg) return msg;
  return fb;
}

/**
 * Prefer mapped message for `errorCode`, else backend `userMessage` / `message`, else contextual `fallback`.
 * Unparsable axios bodies (HTML, empty) and generic "Request failed with status code" use Hebrew, not English.
 */
export function resolveApiErrorMessage(error: unknown, fallback: string): string {
  const fb = fallback.trim() ? fallback : DEFAULT_API_ERROR_HEBREW;
  const data = parseFailureBody(error);
  if (data) return messageFromFailureBody(data, fb);
  const status = getAxiosResponseStatus(error);
  if (error instanceof Error && error.message.trim()) {
    const m = error.message;
    if (m.startsWith('Request failed')) {
      return status !== undefined
        ? `הבקשה נכשלה (קוד ${status}). נסה שוב.`
        : 'הבקשה נכשלה. נסה שוב.';
    }
    return m;
  }
  return fb;
}

/** Shorthand: `resolveApiErrorMessage(err, fallbackHe[key])` — keeps fallback copy in one place. */
export function resolveApiErr(err: unknown, key: FallbackHeKey): string {
  return resolveApiErrorMessage(err, fallbackHe[key]);
}

/** Shorthand for raw `fetch` JSON bodies: `messageFromFailureBody(data, fallbackHe[key])`. */
export function msgFromBody(data: unknown, key: FallbackHeKey): string {
  return messageFromFailureBody(data, fallbackHe[key]);
}

/** Use after `resolveApiErrorMessage` when UI should show Hebrew for axios/offline network failures. */
export function preferHebrewNetworkMessage(error: unknown, message: string): string {
  const ax = error as { code?: string };
  if (
    message === 'Network Error' ||
    message.includes('Network Error') ||
    ax.code === 'ERR_NETWORK' ||
    ax.code === 'ECONNABORTED'
  ) {
    return 'שגיאת רשת';
  }
  return message;
}
