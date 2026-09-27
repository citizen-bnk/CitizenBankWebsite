import { toast } from 'sonner';

/**
 * Centralized error handling utility
 * Converts technical errors into user-friendly, actionable messages
 */

interface ErrorResponse {
  message?: string;
  detail?: string;
  status?: number;
  [key: string]: any;
}

/**
 * Error categories with user-friendly messages
 */
const ERROR_MESSAGES = {
  // Network Errors
  NETWORK_ERROR: 'Unable to connect. Please check your internet connection and try again.',
  TIMEOUT_ERROR: 'The request took too long. Please try again.',
  
  // Authentication Errors
  UNAUTHORIZED: 'Your session has expired. Please log in again.',
  FORBIDDEN: "You don't have permission to access this. Please contact your administrator.",
  
  // Validation Errors
  VALIDATION_ERROR: 'Please check that all required fields are filled correctly.',
  INVALID_INPUT: 'Some information is invalid. Please review and try again.',
  
  // File Upload Errors
  FILE_TOO_LARGE: 'The file is too large. Please upload a smaller file.',
  FILE_INVALID_TYPE: 'This file type is not supported. Please upload a valid file.',
  FILE_UPLOAD_FAILED: 'Failed to upload the file. Please try again.',
  
  // Server Errors
  SERVER_ERROR: "Something went wrong on our end. We're looking into it.",
  DATABASE_ERROR: 'Unable to save your changes. Please try again.',
  
  // Payment Errors
  PAYMENT_FAILED: 'Payment could not be processed. Please check your payment details and try again.',
  PAYMENT_DECLINED: 'Your payment was declined. Please use a different payment method.',
  
  // Document Errors
  DOCUMENT_NOT_FOUND: 'The document could not be found. It may have been deleted.',
  DOCUMENT_REVIEW_FAILED: 'Unable to submit the review. Please try again.',
  
  // Generic
  UNKNOWN_ERROR: 'Something went wrong. Please try again or contact support if the problem persists.',
};

/**
 * Maps HTTP status codes to user-friendly messages
 */
function getMessageForStatus(status: number): string {
  switch (status) {
    case 400:
      return ERROR_MESSAGES.VALIDATION_ERROR;
    case 401:
      return ERROR_MESSAGES.UNAUTHORIZED;
    case 403:
      return ERROR_MESSAGES.FORBIDDEN;
    case 404:
      return ERROR_MESSAGES.DOCUMENT_NOT_FOUND;
    case 408:
      return ERROR_MESSAGES.TIMEOUT_ERROR;
    case 413:
      return ERROR_MESSAGES.FILE_TOO_LARGE;
    case 422:
      return ERROR_MESSAGES.INVALID_INPUT;
    case 500:
    case 502:
    case 503:
    case 504:
      return ERROR_MESSAGES.SERVER_ERROR;
    default:
      return ERROR_MESSAGES.UNKNOWN_ERROR;
  }
}

/**
 * Extracts user-friendly error message from various error formats
 */
export function getErrorMessage(error: any): string {
  // If it's already a string, return it
  if (typeof error === 'string') {
    return error;
  }

  // Network errors (fetch failed)
  if (error instanceof TypeError && error.message.includes('fetch')) {
    return ERROR_MESSAGES.NETWORK_ERROR;
  }

  // HTTP Response errors
  if (error?.status) {
    // Check if there's a custom message from the backend
    const backendMessage = error?.detail || error?.message;
    
    // If backend provides a user-friendly message, use it
    if (backendMessage && typeof backendMessage === 'string' && backendMessage.length < 200) {
      return backendMessage;
    }

    // Otherwise, use status code mapping
    return getMessageForStatus(error.status);
  }

  // Axios-style errors
  if (error?.response?.status) {
    return getMessageForStatus(error.response.status);
  }

  // Error object with message
  if (error?.message) {
    // Filter out technical messages
    const msg = error.message;
    if (msg.includes('fetch') || msg.includes('NetworkError')) {
      return ERROR_MESSAGES.NETWORK_ERROR;
    }
    if (msg.length < 200) {
      return msg;
    }
  }

  return ERROR_MESSAGES.UNKNOWN_ERROR;
}

/**
 * Shows an error toast with user-friendly message
 */
export function showErrorToast(error: any, fallbackMessage?: string) {
  const message = fallbackMessage || getErrorMessage(error);
  toast.error(message, {
    duration: 5000,
    description: 'Please try again or contact support if the issue persists.',
  });
}

/**
 * Shows a success toast
 */
export function showSuccessToast(message: string, description?: string) {
  toast.success(message, {
    duration: 3000,
    description,
  });
}

/**
 * Shows a warning toast
 */
export function showWarningToast(message: string, description?: string) {
  toast.warning(message, {
    duration: 4000,
    description,
  });
}

/**
 * Shows an info toast
 */
export function showInfoToast(message: string, description?: string) {
  toast.info(message, {
    duration: 3000,
    description,
  });
}

/**
 * Handles API errors with retry functionality
 */
export function handleApiError(
  error: any,
  options?: {
    onRetry?: () => void;
    customMessage?: string;
    silent?: boolean;
  }
) {
  const message = options?.customMessage || getErrorMessage(error);

  if (options?.silent) {
    console.error('API Error:', error);
    return;
  }

  if (options?.onRetry) {
    toast.error(message, {
      duration: 6000,
      action: {
        label: 'Retry',
        onClick: options.onRetry,
      },
    });
  } else {
    showErrorToast(error, message);
  }

  // Log to console for debugging
  console.error('API Error:', error);
}

/**
 * Validates file upload
 */
export function validateFileUpload(
  file: File,
  options: {
    maxSizeMB?: number;
    allowedTypes?: string[];
  } = {}
): { valid: boolean; error?: string } {
  const { maxSizeMB = 10, allowedTypes } = options;

  // Check file size
  const fileSizeMB = file.size / (1024 * 1024);
  if (fileSizeMB > maxSizeMB) {
    return {
      valid: false,
      error: `File is too large (${fileSizeMB.toFixed(1)}MB). Maximum size is ${maxSizeMB}MB.`,
    };
  }

  // Check file type
  if (allowedTypes && allowedTypes.length > 0) {
    const fileExtension = file.name.split('.').pop()?.toLowerCase();
    const isAllowed = allowedTypes.some(type => 
      type.toLowerCase() === fileExtension || 
      file.type.includes(type.toLowerCase())
    );

    if (!isAllowed) {
      return {
        valid: false,
        error: `File type not supported. Please upload: ${allowedTypes.join(', ')}`,
      };
    }
  }

  return { valid: true };
}
