/**
 * Format INR amount with Indian numbering system
 * @param {number} amount - Amount in INR
 * @param {object} options - Formatting options
 * @returns {string} Formatted string (e.g., "₹1,24,700" or "₹1.2L")
 */
export function formatINR(amount, options = {}) {
  const { compact = false } = options;

  if (!amount && amount !== 0) return '₹0';

  // Compact format: ₹1.2K, ₹1.2L, ₹1.2Cr
  if (compact && amount >= 1000) {
    if (amount >= 10000000) { // 1 crore
      return `₹${(amount / 10000000).toFixed(1)}Cr`;
    }
    if (amount >= 100000) { // 1 lakh
      return `₹${(amount / 100000).toFixed(1)}L`;
    }
    return `₹${(amount / 1000).toFixed(1)}K`;
  }

  // Full format: ₹1,24,700
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
  }).format(amount);
}

/**
 * Format USD amount
 * @param {number} amount - Amount in USD
 * @returns {string} Formatted string (e.g., "$146.70")
 */
export function formatUSD(amount) {
  if (!amount && amount !== 0) return '$0.00';

  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount);
}

/**
 * Format relative time (2m ago, 1h ago, yesterday)
 * @param {string|Date} timestamp - ISO timestamp or Date object
 * @returns {string} Relative time string
 */
export function formatRelativeTime(timestamp) {
  if (!timestamp) return 'never';

  const date = typeof timestamp === 'string' ? new Date(timestamp) : timestamp;
  const diff = Date.now() - date.getTime();

  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (seconds < 60) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days === 1) return 'yesterday';
  if (days < 7) return `${days}d ago`;

  // More than a week: show date
  return new Intl.DateTimeFormat('en-IN', {
    month: 'short',
    day: 'numeric'
  }).format(date);
}

/**
 * Format absolute date/time
 * @param {string|Date} timestamp - ISO timestamp or Date object
 * @returns {string} Formatted date string
 */
export function formatDateTime(timestamp) {
  if (!timestamp) return '';

  const date = typeof timestamp === 'string' ? new Date(timestamp) : timestamp;

  return new Intl.DateTimeFormat('en-IN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(date);
}

/**
 * Format number with commas
 * @param {number} num - Number to format
 * @returns {string} Formatted number
 */
export function formatNumber(num) {
  if (!num && num !== 0) return '0';

  return new Intl.NumberFormat('en-IN').format(num);
}

/**
 * Format percentage
 * @param {number} value - Percentage value (0-100)
 * @returns {string} Formatted percentage
 */
export function formatPercent(value) {
  if (!value && value !== 0) return '0%';

  return `${Math.round(value)}%`;
}

/**
 * Calculate percentage with safe division
 * @param {number} value - Current value
 * @param {number} total - Total value
 * @returns {number} Percentage (0-100)
 */
export function calculatePercent(value, total) {
  if (!total || total === 0) return 0;
  return Math.round((value / total) * 100);
}

/**
 * Mask API key (show first 7 chars + last 4 chars)
 * @param {string} key - Full API key
 * @returns {string} Masked key (e.g., "sk-proj...a1b2")
 */
export function maskApiKey(key) {
  if (!key || key.length < 12) return '***';

  const start = key.substring(0, 7);
  const end = key.substring(key.length - 4);

  return `${start}...${end}`;
}
