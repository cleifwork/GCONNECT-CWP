export function balance(voucher) {
  const status = ['unused', 'active', 'expired'][voucher.status] || 'unknown';
  const seconds = voucher.timeLeftSec;
  return {
    found: true, status,
    remainingSeconds: !voucher.timingByClientUsage && Number.isFinite(seconds) && seconds >= 0 ? seconds : null,
    deviceSpecific: voucher.timingByClientUsage === true,
    checkedAt: new Date().toISOString()
  };
}
