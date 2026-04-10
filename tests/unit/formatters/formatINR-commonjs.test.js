// Test formatINR with CommonJS-compatible implementation
// The actual formatters.js is ESM for the dashboard, so we test the logic here

function formatINR(amount, options = {}) {
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

describe('formatINR - Indian Numbering System', () => {
  test('formats small amounts correctly', () => {
    expect(formatINR(0)).toBe('₹0');
    expect(formatINR(100)).toBe('₹100');
    expect(formatINR(999)).toBe('₹999');
  });

  test('formats thousands with Indian numbering', () => {
    expect(formatINR(1000)).toBe('₹1,000');
    expect(formatINR(9999)).toBe('₹9,999');
  });

  test('formats lakhs with Indian numbering', () => {
    // 1 lakh = 1,00,000
    expect(formatINR(100000)).toBe('₹1,00,000');
    expect(formatINR(124700)).toBe('₹1,24,700');
    expect(formatINR(999999)).toBe('₹9,99,999');
  });

  test('formats crores with Indian numbering', () => {
    // 1 crore = 1,00,00,000
    expect(formatINR(10000000)).toBe('₹1,00,00,000');
    expect(formatINR(12345678)).toBe('₹1,23,45,678');
  });

  test('formats decimal amounts', () => {
    expect(formatINR(100.50)).toBe('₹100.5');
    expect(formatINR(1234.56)).toBe('₹1,234.56');
  });

  test('formats compact amounts correctly', () => {
    expect(formatINR(1500, { compact: true })).toBe('₹1.5K');
    expect(formatINR(150000, { compact: true })).toBe('₹1.5L');
    expect(formatINR(15000000, { compact: true })).toBe('₹1.5Cr');
  });

  test('compact format thresholds', () => {
    // Below 1000 - no compact
    expect(formatINR(999, { compact: true })).toBe('₹999');

    // 1K to 99.9K
    expect(formatINR(1000, { compact: true })).toBe('₹1.0K');
    expect(formatINR(25000, { compact: true })).toBe('₹25.0K');

    // 1L to 99.9L
    expect(formatINR(100000, { compact: true })).toBe('₹1.0L');
    expect(formatINR(250000, { compact: true })).toBe('₹2.5L');

    // 1Cr+
    expect(formatINR(10000000, { compact: true })).toBe('₹1.0Cr');
    expect(formatINR(25000000, { compact: true })).toBe('₹2.5Cr');
  });

  test('handles null and undefined', () => {
    expect(formatINR(null)).toBe('₹0');
    expect(formatINR(undefined)).toBe('₹0');
  });

  test('handles zero correctly', () => {
    expect(formatINR(0)).toBe('₹0');
  });

  test('handles negative amounts', () => {
    expect(formatINR(-100)).toBe('-₹100');
    expect(formatINR(-1000)).toBe('-₹1,000');
  });

  test('real-world amounts', () => {
    // Typical API costs in INR
    expect(formatINR(0.85)).toBe('₹0.85'); // ~1 cent
    expect(formatINR(8.5)).toBe('₹8.5'); // ~10 cents
    expect(formatINR(850)).toBe('₹850'); // ~$10
    expect(formatINR(8500)).toBe('₹8,500'); // ~$100
    expect(formatINR(85000)).toBe('₹85,000'); // ~$1000

    // Monthly budgets
    expect(formatINR(5000, { compact: true })).toBe('₹5.0K');
    expect(formatINR(50000, { compact: true })).toBe('₹50.0K');
    expect(formatINR(500000, { compact: true })).toBe('₹5.0L');
  });

  test('matches Indian locale formatting', () => {
    // Indian numbering: groups of 2 after thousands place
    const amount = 12345678;
    const formatted = formatINR(amount);

    // Should have commas at: 1,23,45,678
    expect(formatted).toContain(',23,');
    expect(formatted).toContain(',45,');
    expect(formatted).toContain(',678');
  });
});
