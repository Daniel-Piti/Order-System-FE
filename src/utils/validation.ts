// Shared validation utilities for forms

export type ValidationErrors = Record<string, string>;

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationErrors;
}

/**
 * Validates that a field is not empty (after trimming)
 */
export function validateRequired(value: string, fieldName: string): string | null {
  if (!value.trim()) {
    return `${fieldName} נדרש`;
  }
  return null;
}

/**
 * Validates maximum length for a field (after trimming)
 */
export function validateMaxLength(value: string, maxLength: number, fieldName: string): string | null {
  if (value.trim().length > maxLength) {
    return `${fieldName} חייב להיות ${maxLength} תווים או פחות`;
  }
  return null;
}

/**
 * Convenience helper for required fields with maximum length
 */
export function validateRequiredWithMaxLength(
  value: string,
  fieldName: string,
  maxLength: number
): string | null {
  const requiredError = validateRequired(value, fieldName);
  if (requiredError) {
    return requiredError;
  }
  return validateMaxLength(value, maxLength, fieldName);
}

/**
 * Validates phone numbers to ensure they contain digits only and respect length constraints
 */
export function validatePhoneNumberDigitsOnly(
  value: string,
  maxLength: number,
  fieldName: string = 'Phone number'
): string | null {
  const trimmed = value.trim();
  const requiredError = validateRequired(trimmed, fieldName);
  if (requiredError) {
    return requiredError;
  }

  if (!/^\d+$/.test(trimmed)) {
    return `${fieldName} חייב להכיל ספרות בלבד`;
  }

  return validateMaxLength(trimmed, maxLength, fieldName);
}

/**
 * Validates email format
 */
export function validateEmail(email: string, maxLength: number = 100): string | null {
  const trimmed = email.trim();
  if (!trimmed) {
    return 'אימייל נדרש';
  }
  if (trimmed.length > maxLength) {
    return `אימייל חייב להיות ${maxLength} תווים או פחות`;
  }
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(trimmed)) {
    return 'אנא הזן אימייל תקין';
  }
  return null;
}

/**
 * Validates discount percentage (0-100)
 */
export function validateDiscountPercentage(value: string | number, fieldName: string = 'אחוז הנחה'): string | null {
  const numValue = typeof value === 'string' ? parseFloat(value) : value;
  
  if (isNaN(numValue)) {
    return `${fieldName} חייב להיות מספר תקין`;
  }
  
  if (numValue < 0 || numValue > 100) {
    return `${fieldName} חייב להיות בין 0 ל-100`;
  }
  
  return null;
}

/**
 * Validates password length
 */
export function validatePassword(password: string, minLength: number = 8): string | null {
  if (!password.trim()) {
    return 'Password is required';
  }
  if (password.length < minLength) {
    return `Password must be at least ${minLength} characters`;
  }
  return null;
}

/**
 * Validates password confirmation matches password
 */
export function validatePasswordConfirmation(password: string, confirmation: string): string | null {
  if (!confirmation.trim()) {
    return 'Please confirm your password';
  }
  if (password !== confirmation) {
    return 'Passwords do not match';
  }
  return null;
}

/**
 * Validates that a date is provided
 */
export function validateDate(date: string, fieldName: string = 'Date'): string | null {
  if (!date) {
    return `${fieldName} is required`;
  }
  return null;
}

/**
 * Helper to run multiple validations and collect errors
 */
export function validateFields(
  validations: Array<{ field: string; error: string | null }>
): ValidationResult {
  const errors: ValidationErrors = {};
  
  validations.forEach(({ field, error }) => {
    if (error) {
      errors[field] = error;
    }
  });

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
}

/**
 * Common validation schemas for forms
 */
const MAX_NAME_LENGTH = 50;
const MAX_PHONE_LENGTH = 10;
const MAX_STREET_ADDRESS_LENGTH = 120;
const MAX_CITY_LENGTH = 60;
const MAX_EMAIL_LENGTH = 100;
const MAX_LOCATION_NAME_LENGTH = 60;
const MAX_LOCATION_STREET_LENGTH = 120;
const MAX_LOCATION_CITY_LENGTH = 60;
const MAX_LOCATION_PHONE_LENGTH = 10;

export const AGENT_FIELD_LIMITS = {
  firstName: MAX_NAME_LENGTH,
  lastName: MAX_NAME_LENGTH,
  email: MAX_EMAIL_LENGTH,
  password: 100,
  phoneNumber: MAX_PHONE_LENGTH,
  streetAddress: MAX_STREET_ADDRESS_LENGTH,
  city: MAX_CITY_LENGTH,
} as const;

export const userFormValidations = {
  firstName: (value: string) => validateRequiredWithMaxLength(value, 'First name', MAX_NAME_LENGTH),
  lastName: (value: string) => validateRequiredWithMaxLength(value, 'Last name', MAX_NAME_LENGTH),
  businessName: (value: string) => validateRequiredWithMaxLength(value, 'Business name', MAX_NAME_LENGTH),
  email: (value: string) => validateEmail(value, MAX_EMAIL_LENGTH),
  password: (value: string) => validatePassword(value),
  phoneNumber: (value: string) => validatePhoneNumberDigitsOnly(value, MAX_PHONE_LENGTH),
  dateOfBirth: (value: string) => validateDate(value, 'Date of birth'),
  streetAddress: (value: string) => validateRequiredWithMaxLength(value, 'Street address', MAX_STREET_ADDRESS_LENGTH),
  city: (value: string) => validateRequiredWithMaxLength(value, 'City', MAX_CITY_LENGTH),
};

/**
 * Validate user profile form (without password)
 */
export function validateUserProfileForm(formData: {
  firstName: string;
  lastName: string;
  businessName: string;
  phoneNumber: string;
  dateOfBirth: string;
  streetAddress: string;
  city: string;
}): ValidationResult {
  return validateFields([
    { field: 'firstName', error: userFormValidations.firstName(formData.firstName) },
    { field: 'lastName', error: userFormValidations.lastName(formData.lastName) },
    { field: 'businessName', error: userFormValidations.businessName(formData.businessName) },
    { field: 'phoneNumber', error: userFormValidations.phoneNumber(formData.phoneNumber) },
    { field: 'dateOfBirth', error: userFormValidations.dateOfBirth(formData.dateOfBirth) },
    { field: 'streetAddress', error: userFormValidations.streetAddress(formData.streetAddress) },
    { field: 'city', error: userFormValidations.city(formData.city) },
  ]);
}

export function validateAgentProfileForm(formData: {
  firstName: string;
  lastName: string;
  phoneNumber: string;
  streetAddress: string;
  city: string;
}): ValidationResult {
  return validateFields([
    { field: 'firstName', error: userFormValidations.firstName(formData.firstName) },
    { field: 'lastName', error: userFormValidations.lastName(formData.lastName) },
    { field: 'phoneNumber', error: userFormValidations.phoneNumber(formData.phoneNumber) },
    { field: 'streetAddress', error: userFormValidations.streetAddress(formData.streetAddress) },
    { field: 'city', error: userFormValidations.city(formData.city) },
  ]);
}

/**
 * Validate user creation form (with email and password)
 */
export function validateUserCreationForm(formData: {
  firstName: string;
  lastName: string;
  businessName: string;
  email: string;
  password: string;
  phoneNumber: string;
  dateOfBirth: string;
  streetAddress: string;
  city: string;
}): ValidationResult {
  return validateFields([
    { field: 'firstName', error: userFormValidations.firstName(formData.firstName) },
    { field: 'lastName', error: userFormValidations.lastName(formData.lastName) },
    { field: 'businessName', error: userFormValidations.businessName(formData.businessName) },
    { field: 'email', error: userFormValidations.email(formData.email) },
    { field: 'password', error: userFormValidations.password(formData.password) },
    { field: 'phoneNumber', error: userFormValidations.phoneNumber(formData.phoneNumber) },
    { field: 'dateOfBirth', error: userFormValidations.dateOfBirth(formData.dateOfBirth) },
    { field: 'streetAddress', error: userFormValidations.streetAddress(formData.streetAddress) },
    { field: 'city', error: userFormValidations.city(formData.city) },
  ]);
}

export function validateAgentCreationForm(formData: {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  phoneNumber: string;
  streetAddress: string;
  city: string;
}): ValidationResult {
  return validateFields([
    { field: 'firstName', error: userFormValidations.firstName(formData.firstName) },
    { field: 'lastName', error: userFormValidations.lastName(formData.lastName) },
    { field: 'email', error: userFormValidations.email(formData.email) },
    { field: 'password', error: userFormValidations.password(formData.password) },
    { field: 'phoneNumber', error: userFormValidations.phoneNumber(formData.phoneNumber) },
    { field: 'streetAddress', error: userFormValidations.streetAddress(formData.streetAddress) },
    { field: 'city', error: userFormValidations.city(formData.city) },
  ]);
}

/**
 * Validate password change form
 */
export function validatePasswordChangeForm(formData: {
  oldPassword: string;
  newPassword: string;
  newPasswordConfirmation: string;
}): ValidationResult {
  const newPasswordError = validatePassword(formData.newPassword);
  const confirmationError = newPasswordError 
    ? null 
    : validatePasswordConfirmation(formData.newPassword, formData.newPasswordConfirmation);

  return validateFields([
    { field: 'oldPassword', error: validateRequired(formData.oldPassword, 'Current password') },
    { field: 'newPassword', error: newPasswordError },
    { field: 'newPasswordConfirmation', error: confirmationError },
  ]);
}

/**
 * Validate location form
 */
export function validateLocationForm(formData: {
  name: string;
  streetAddress: string;
  city: string;
  phoneNumber: string;
}): ValidationResult {
  return validateFields([
    {
      field: 'name',
      error: validateRequiredWithMaxLength(formData.name, 'שם הסניף', MAX_LOCATION_NAME_LENGTH),
    },
    {
      field: 'streetAddress',
      error: validateRequiredWithMaxLength(
        formData.streetAddress,
        'כתובת',
        MAX_LOCATION_STREET_LENGTH
      ),
    },
    { field: 'city', error: validateRequiredWithMaxLength(formData.city, 'עיר', MAX_LOCATION_CITY_LENGTH) },
    {
      field: 'phoneNumber',
      error: validatePhoneNumberDigitsOnly(
        formData.phoneNumber,
        MAX_LOCATION_PHONE_LENGTH,
        'מספר טלפון'
      ),
    },
  ]);
}

export const LOCATION_FIELD_LIMITS = {
  name: MAX_LOCATION_NAME_LENGTH,
  streetAddress: MAX_LOCATION_STREET_LENGTH,
  city: MAX_LOCATION_CITY_LENGTH,
  phoneNumber: MAX_LOCATION_PHONE_LENGTH,
} as const;

