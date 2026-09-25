import '../../css/passwordchecklist.css';

// ─────────────────────────────────────────────────────────────
// PasswordChecklist (compact)
//
// Shows two small lines under a password input while the user types:
//   1. A thin strength bar with the level word beside it
//   2. One row of rule items that turn green with a check when met
//
// These checks MIRROR the Laravel rule in AppServiceProvider:
//   Password::min(8)->mixedCase()->numbers()->symbols()
// If you change the Laravel rule, change RULES below to match.
//
// This is only a helper for the user. Laravel is still the real
// guard — it re-checks everything when the form is submitted.
//
// Usage:
//   import PasswordChecklist, { isPasswordStrong } from '../../components/PasswordChecklist';
//
//   <PasswordChecklist password={newPassword} />
//   <button disabled={!isPasswordStrong(newPassword)}>Save</button>
// ─────────────────────────────────────────────────────────────

// Each rule: a short label, and a test that returns true/false.
// The \p{...} patterns are Unicode classes, the same ones Laravel uses,
// so the browser and the server agree on what counts as a symbol.
const RULES = [
  { label: '8+ chars',  test: (pw) => pw.length >= 8 },
  { label: 'Uppercase', test: (pw) => /\p{Lu}/u.test(pw) },
  { label: 'Lowercase', test: (pw) => /\p{Ll}/u.test(pw) },
  { label: 'Number',    test: (pw) => /\p{N}/u.test(pw) },
  { label: 'Symbol',    test: (pw) => /[\p{P}\p{S}]/u.test(pw) },
];

// Word shown for each number of rules passed (index = how many passed)
const LEVELS = ['Weak', 'Weak', 'Weak', 'Fair', 'Good', 'Strong'];

// Returns true only when EVERY rule passes.
// Use it to enable/disable the submit button.
export function isPasswordStrong(password = '') {
  return RULES.every((rule) => rule.test(password));
}

export default function PasswordChecklist({ password = '' }) {
  const results = RULES.map((rule) => rule.test(password));
  const passed  = results.filter(Boolean).length;

  // Color group: 0–2 passed → red, 3–4 → amber, all 5 → green
  const tone = passed === 5 ? 'good' : passed >= 3 ? 'mid' : 'bad';
  const isEmpty = password.length === 0;

  return (
    <div className="pwc">
      {/* ── Line 1: thin bar + level word ── */}
      <div className="pwc-meter">
        <div className="pwc-bar" aria-hidden="true">
          {RULES.map((_, i) => (
            <span
              key={i}
              className={`pwc-seg ${i < passed ? `pwc-seg-on pwc-${tone}` : ''}`}
            />
          ))}
        </div>
        <span
          className={`pwc-level ${isEmpty ? '' : `pwc-${tone}`}`}
          aria-live="polite"
        >
          {isEmpty ? '' : LEVELS[passed]}
        </span>
      </div>

      {/* ── Line 2: rule items ── */}
      <ul className="pwc-rules">
        {RULES.map((rule, i) => {
          const met = results[i];
          return (
            <li key={rule.label} className={`pwc-rule ${met ? 'pwc-rule-met' : ''}`}>
              <span className="pwc-icon" aria-hidden="true">
                {met && (
                  <svg viewBox="0 0 16 16" width="8" height="8">
                    <path
                      d="M3 8.5l3 3 7-7"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.6"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                )}
              </span>
              {rule.label}
              {/* Screen readers hear "met" / "not met" */}
              <span className="pwc-sr">{met ? ' (met)' : ' (not met)'}</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}