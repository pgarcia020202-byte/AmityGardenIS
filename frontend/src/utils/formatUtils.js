// Safe wrappers around Intl-based formatting.
//
// Some Android WebViews and in-app browsers (Facebook/Messenger/TikTok, some
// budget-phone stock browsers) ship with reduced ICU data and can throw a
// RangeError on locale tags like 'en-PH', even though the tag is valid.
// Because several components call toLocaleDateString/toLocaleTimeString/
// toLocaleString('en-PH', ...) directly during render with no try/catch,
// a throw there crashes the whole React tree -> white screen, on just the
// devices whose browser doesn't fully support that locale.
//
// These helpers try 'en-PH' first, then fall back to 'en-US', then to the
// engine's default locale, then finally to a plain non-Intl string so the
// UI never crashes because of formatting.

const LOCALE_FALLBACKS = ['en-PH', 'en-US', undefined]

function tryFormat(fn) {
  for (const locale of LOCALE_FALLBACKS) {
    try {
      return fn(locale)
    } catch (e) {
      // try next fallback
    }
  }
  return null
}

export function safeFormatDate(date, options) {
  const d = date instanceof Date ? date : new Date(date)
  if (isNaN(d.getTime())) return ''

  const result = tryFormat((locale) => d.toLocaleDateString(locale, options))
  if (result !== null) return result

  // Last-resort plain fallback, no Intl involved
  return d.toISOString().slice(0, 10)
}

export function safeFormatTime(date, options = { hour: '2-digit', minute: '2-digit' }) {
  const d = date instanceof Date ? date : new Date(date)
  if (isNaN(d.getTime())) return ''

  const result = tryFormat((locale) => d.toLocaleTimeString(locale, options))
  if (result !== null) return result

  return d.toTimeString().slice(0, 5)
}

export function safeFormatDateTime(date, options) {
  const d = date instanceof Date ? date : new Date(date)
  if (isNaN(d.getTime())) return ''

  const result = tryFormat((locale) => d.toLocaleString(locale, options))
  if (result !== null) return result

  return d.toISOString().replace('T', ' ').slice(0, 16)
}

export function safeFormatCurrency(amount, options = { minimumFractionDigits: 2 }) {
  const n = parseFloat(amount)
  if (isNaN(n)) return '₱0.00'

  const result = tryFormat((locale) => n.toLocaleString(locale, options))
  if (result !== null) return '₱' + result

  return '₱' + n.toFixed(options.maximumFractionDigits ?? options.minimumFractionDigits ?? 2)
}

export function safeFormatNumber(n) {
  const num = Number(n)
  if (isNaN(num)) return '0'

  const result = tryFormat((locale) => num.toLocaleString(locale))
  if (result !== null) return result

  return String(num)
}
