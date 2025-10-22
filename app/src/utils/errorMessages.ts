/**
 * Maps Firebase error codes and other errors to user-friendly messages
 */

export interface FriendlyError {
  title: string;
  message: string;
  retryable: boolean;
}

export function getFirebaseErrorMessage(error: any): FriendlyError {
  const code = error?.code || '';
  
  // Firebase Auth errors
  if (code.startsWith('auth/')) {
    return getAuthErrorMessage(code);
  }
  
  // Firebase Firestore errors
  if (code.startsWith('firestore/')) {
    return getFirestoreErrorMessage(code);
  }
  
  // Firebase Storage errors
  if (code.startsWith('storage/')) {
    return getStorageErrorMessage(code);
  }
  
  // Network errors
  if (error?.message?.includes('network') || error?.message?.includes('offline')) {
    return {
      title: 'No Internet Connection',
      message: 'Please check your connection and try again.',
      retryable: true,
    };
  }
  
  // Generic error
  return {
    title: 'Something went wrong',
    message: error?.message || 'An unexpected error occurred. Please try again.',
    retryable: true,
  };
}

function getAuthErrorMessage(code: string): FriendlyError {
  switch (code) {
    case 'auth/invalid-email':
      return {
        title: 'Invalid Email',
        message: 'Please enter a valid email address.',
        retryable: false,
      };
    
    case 'auth/user-disabled':
      return {
        title: 'Account Disabled',
        message: 'This account has been disabled. Please contact support.',
        retryable: false,
      };
    
    case 'auth/user-not-found':
    case 'auth/wrong-password':
      return {
        title: 'Login Failed',
        message: 'Invalid email or password. Please try again.',
        retryable: false,
      };
    
    case 'auth/email-already-in-use':
      return {
        title: 'Email Already Registered',
        message: 'An account with this email already exists. Please log in instead or use a different email.',
        retryable: false,
      };
    
    case 'auth/weak-password':
      return {
        title: 'Weak Password',
        message: 'Password should be at least 6 characters long.',
        retryable: false,
      };
    
    case 'auth/network-request-failed':
      return {
        title: 'Network Error',
        message: 'Please check your internet connection and try again.',
        retryable: true,
      };
    
    case 'auth/too-many-requests':
      return {
        title: 'Too Many Attempts',
        message: 'Too many failed attempts. Please try again later.',
        retryable: true,
      };
    
    case 'auth/operation-not-allowed':
      return {
        title: 'Operation Not Allowed',
        message: 'This sign-in method is not enabled. Please contact support.',
        retryable: false,
      };
    
    case 'auth/popup-blocked':
      return {
        title: 'Popup Blocked',
        message: 'Please allow popups for this site and try again.',
        retryable: true,
      };
    
    case 'auth/popup-closed-by-user':
      return {
        title: 'Sign In Cancelled',
        message: 'You closed the sign-in window. Please try again.',
        retryable: true,
      };
    
    default:
      return {
        title: 'Authentication Error',
        message: 'Unable to sign in. Please try again.',
        retryable: true,
      };
  }
}

function getFirestoreErrorMessage(code: string): FriendlyError {
  switch (code) {
    case 'firestore/permission-denied':
      return {
        title: 'Access Denied',
        message: 'You don\'t have permission to access this data.',
        retryable: false,
      };
    
    case 'firestore/not-found':
      return {
        title: 'Not Found',
        message: 'The requested data could not be found.',
        retryable: false,
      };
    
    case 'firestore/already-exists':
      return {
        title: 'Already Exists',
        message: 'This item already exists.',
        retryable: false,
      };
    
    case 'firestore/aborted':
      return {
        title: 'Operation Cancelled',
        message: 'The operation was cancelled. Please try again.',
        retryable: true,
      };
    
    case 'firestore/unavailable':
      return {
        title: 'Service Unavailable',
        message: 'The service is temporarily unavailable. Please try again.',
        retryable: true,
      };
    
    case 'firestore/deadline-exceeded':
      return {
        title: 'Request Timeout',
        message: 'The request took too long. Please try again.',
        retryable: true,
      };
    
    default:
      return {
        title: 'Database Error',
        message: 'Unable to access data. Please try again.',
        retryable: true,
      };
  }
}

function getStorageErrorMessage(code: string): FriendlyError {
  switch (code) {
    case 'storage/unauthorized':
      return {
        title: 'Upload Failed',
        message: 'You don\'t have permission to upload files.',
        retryable: false,
      };
    
    case 'storage/canceled':
      return {
        title: 'Upload Cancelled',
        message: 'The upload was cancelled.',
        retryable: true,
      };
    
    case 'storage/unknown':
      return {
        title: 'Upload Failed',
        message: 'An unknown error occurred. Please try again.',
        retryable: true,
      };
    
    case 'storage/object-not-found':
      return {
        title: 'File Not Found',
        message: 'The requested file could not be found.',
        retryable: false,
      };
    
    case 'storage/bucket-not-found':
      return {
        title: 'Configuration Error',
        message: 'Storage is not properly configured. Please contact support.',
        retryable: false,
      };
    
    case 'storage/project-not-found':
      return {
        title: 'Configuration Error',
        message: 'Project is not properly configured. Please contact support.',
        retryable: false,
      };
    
    case 'storage/quota-exceeded':
      return {
        title: 'Storage Full',
        message: 'Storage quota has been exceeded. Please contact support.',
        retryable: false,
      };
    
    case 'storage/unauthenticated':
      return {
        title: 'Not Signed In',
        message: 'Please sign in to upload files.',
        retryable: false,
      };
    
    case 'storage/retry-limit-exceeded':
      return {
        title: 'Upload Failed',
        message: 'Too many failed attempts. Please try again later.',
        retryable: true,
      };
    
    case 'storage/invalid-checksum':
      return {
        title: 'Upload Failed',
        message: 'File upload was corrupted. Please try again.',
        retryable: true,
      };
    
    case 'storage/canceled':
      return {
        title: 'Upload Cancelled',
        message: 'The file upload was cancelled.',
        retryable: true,
      };
    
    default:
      return {
        title: 'Upload Error',
        message: 'Unable to upload file. Please try again.',
        retryable: true,
      };
  }
}

/**
 * Format error for display in UI
 */
export function formatErrorForDisplay(error: any): string {
  const friendly = getFirebaseErrorMessage(error);
  return friendly.message;
}

/**
 * Check if error is retryable
 */
export function isRetryableError(error: any): boolean {
  const friendly = getFirebaseErrorMessage(error);
  return friendly.retryable;
}

