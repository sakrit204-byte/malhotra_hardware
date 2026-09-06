/**
 * Every public page arrives rather than appears.
 *
 * A template is remounted on each navigation, which is what lets one small
 * entrance animation play again for every page without any page knowing about
 * it. The header and footer sit outside it in the layout and stay put, so the
 * movement is the content changing under a fixed frame, not the whole screen
 * flashing.
 */
export default function PublicTemplate({ children }: { children: React.ReactNode }) {
  return <div className="page-in">{children}</div>;
}
