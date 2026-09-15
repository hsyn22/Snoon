/**
 * Everything under `/student` wears the students' colour.
 *
 * Haider's instruction, after ClinMatch: orange for students, green for the
 * people they treat. The complaint behind it is older than the colour — سنون
 * had almost nothing on it that felt aimed at students, and a landing page
 * rewritten in the third person only stopped it saying the wrong thing. This is
 * the part that says the right one.
 *
 * It is a wrapper and one class rather than an edit to twenty components. The
 * class re-points the accent tokens at the orange ramp in `tokens.css`, so
 * every `text-accent`, every `tone="accent"` card and every primary button
 * inside turns orange on its own. No component knows that audiences have
 * colours, which is what keeps `tokens.css` the only place a colour lives.
 *
 * It wraps the chrome as well as the page, deliberately: a green header over an
 * orange dashboard would read as the student area being a guest on somebody
 * else's site, which is exactly the feeling this is meant to fix.
 */
export default function StudentLayout({ children }: { children: React.ReactNode }) {
  return <div className="student-area">{children}</div>
}
