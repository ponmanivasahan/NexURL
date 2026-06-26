// ─── Validation helpers matching backend rules ─────────────────────────────

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

// ─── Username ───────────────────────────────────────────────────────────────

export function validateUsername(username: string): ValidationResult {
  const errors: string[] = [];

  if (!username || typeof username !== 'string') {
    errors.push('Username is required');
  } else if (username.length < 3) {
    errors.push('Username must be at least 3 characters');
  } else if (username.length > 30) {
    errors.push('Username must be less than 30 characters');
  } else if (!/^[a-zA-Z0-9_]+$/.test(username)) {
    errors.push('Username can only contain letters, numbers, and underscores');
  }

  return { valid: errors.length === 0, errors };
}

// ─── Email ──────────────────────────────────────────────────────────────────

export function validateEmail(email: string): ValidationResult {
  const errors: string[] = [];

  if (!email || typeof email !== 'string') {
    errors.push('Email is required');
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    errors.push('Invalid email format');
  }

  return { valid: errors.length === 0, errors };
}

// ─── Password ───────────────────────────────────────────────────────────────

export interface PasswordStrength {
  score: number;       // 0-5
  label: string;       // Weak / Fair / Good / Strong / Excellent
  checks: PasswordCheck[];
}

export interface PasswordCheck {
  label: string;
  passed: boolean;
}

export function validatePassword(password: string): ValidationResult {
  const errors: string[] = [];

  if (!password || typeof password !== 'string') {
    errors.push('Password is required');
  } else if (password.length < 8) {
    errors.push('Password must be at least 8 characters');
  } else if (password.length > 128) {
    errors.push('Password must be less than 128 characters');
  } else {
    if (!/[A-Z]/.test(password)) {
      errors.push('Password must contain at least one uppercase letter');
    }
    if (!/[a-z]/.test(password)) {
      errors.push('Password must contain at least one lowercase letter');
    }
    if (!/[0-9]/.test(password)) {
      errors.push('Password must contain at least one number');
    }
    if (!/[!@#$%^&*]/.test(password)) {
      errors.push('Password must contain at least one special character (!@#$%^&*)');
    }
  }

  return { valid: errors.length === 0, errors };
}

export function getPasswordStrength(password: string): PasswordStrength {
  const checks: PasswordCheck[] = [
    { label: 'At least 8 characters', passed: password.length >= 8 },
    { label: 'Uppercase letter', passed: /[A-Z]/.test(password) },
    { label: 'Lowercase letter', passed: /[a-z]/.test(password) },
    { label: 'Number', passed: /[0-9]/.test(password) },
    { label: 'Special character (!@#$%^&*)', passed: /[!@#$%^&*]/.test(password) },
  ];

  const score = checks.filter(c => c.passed).length;

  const labels = ['Very Weak', 'Weak', 'Fair', 'Good', 'Strong', 'Excellent'];

  return { score, label: labels[score], checks };
}

// ─── URL ────────────────────────────────────────────────────────────────────

export function validateUrl(url: string): ValidationResult {
  const errors: string[] = [];

  if (!url) {
    errors.push('URL is required');
    return { valid: false, errors };
  }

  try {
    const urlObj = new URL(url);
    if (!['http:', 'https:'].includes(urlObj.protocol)) {
      errors.push('Only HTTP and HTTPS URLs are allowed');
    }
  } catch {
    errors.push('Invalid URL format');
  }

  if (url.length > 2048) {
    errors.push('URL is too long (max 2048 characters)');
  }

  return { valid: errors.length === 0, errors };
}

// ─── Custom Alias ───────────────────────────────────────────────────────────

export function validateCustomAlias(alias: string): ValidationResult {
  const errors: string[] = [];

  if (!alias) {
    return { valid: true, errors }; // alias is optional
  }

  if (alias.length < 4) {
    errors.push('Custom alias must be at least 4 characters');
  }
  if (alias.length > 30) {
    errors.push('Custom alias must be less than 30 characters');
  }
  if (!/^[a-zA-Z0-9_-]+$/.test(alias)) {
    errors.push('Custom alias can only contain letters, numbers, hyphens, and underscores');
  }
  if (alias.startsWith('-') || alias.startsWith('_')) {
    errors.push('Custom alias cannot start with hyphens or underscores');
  }

  const reserved = new Set([
    'api', 'admin', 'login', 'logout', 'register', 'health', 'status',
    'dashboard', 'analytics', 'short', 'url', 'link', 'redirect', 'go',
  ]);
  if (reserved.has(alias.toLowerCase())) {
    errors.push('This alias is reserved');
  }

  return { valid: errors.length === 0, errors };
}
