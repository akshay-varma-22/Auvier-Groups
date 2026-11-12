/* Cross-page links. Each HTML page declares where the site root is relative
   to itself (<meta name="auvier-root">), so links work at a domain root, in a
   subfolder, and on the dev server alike. */

const root = document.querySelector<HTMLMetaElement>('meta[name="auvier-root"]')?.content ?? "./";

export const routes = {
  group: root,
  technologies: `${root}technologies/`,
  clothing: `${root}clothing/`,
};
