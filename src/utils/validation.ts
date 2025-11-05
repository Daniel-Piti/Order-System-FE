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
    return `${fieldName} is required`;
  }
  return null;
}

/**
 * Validates email format
 */
export function validateEmail(email: string): string | null {
  if (!email.trim()) {
    return 'Email is required';
  }
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email.trim())) {
    return 'Please enter a valid email';
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
export const userFormValidations = {
  firstName: (value: string) => validateRequired(value, 'First name'),
  lastName: (value: string) => validateRequired(value, 'Last name'),
  email: (value: string) => validateEmail(value),
  password: (value: string) => validatePassword(value),
  phoneNumber: (value: string) => validateRequired(value, 'Phone number'),
  dateOfBirth: (value: string) => validateDate(value, 'Date of birth'),
  streetAddress: (value: string) => validateRequired(value, 'Street address'),
  city: (value: string) => validateRequired(value, 'City'),
};

/**
 * Validate user profile form (without password)
 */
export function validateUserProfileForm(formData: {
  firstName: string;
  lastName: string;
  phoneNumber: string;
  dateOfBirth: string;
  streetAddress: string;
  city: string;
}): ValidationResult {
  return validateFields([
    { field: 'firstName', error: userFormValidations.firstName(formData.firstName) },
    { field: 'lastName', error: userFormValidations.lastName(formData.lastName) },
    { field: 'phoneNumber', error: userFormValidations.phoneNumber(formData.phoneNumber) },
    { field: 'dateOfBirth', error: userFormValidations.dateOfBirth(formData.dateOfBirth) },
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
    { field: 'email', error: userFormValidations.email(formData.email) },
    { field: 'password', error: userFormValidations.password(formData.password) },
    { field: 'phoneNumber', error: userFormValidations.phoneNumber(formData.phoneNumber) },
    { field: 'dateOfBirth', error: userFormValidations.dateOfBirth(formData.dateOfBirth) },
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
    { field: 'name', error: validateRequired(formData.name, 'Location name') },
    { field: 'streetAddress', error: validateRequired(formData.streetAddress, 'Street address') },
    { field: 'city', error: validateRequired(formData.city, 'City') },
    { field: 'phoneNumber', error: validateRequired(formData.phoneNumber, 'Phone number') },
  ]);
}

