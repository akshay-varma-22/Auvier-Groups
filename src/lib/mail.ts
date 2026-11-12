/** Opens the visitor's email app with a pre-filled message. The site has no
    backend yet; swap this for a form service (Formspree, Netlify Forms…) to
    collect submissions directly. */
export function composeMail(to: string, subject: string, body: string) {
  window.location.href = `mailto:${to}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}
