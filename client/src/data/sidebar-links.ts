
// import REACT_COMPONENTS from './components/react'
// import SHADCN_COMPONENTS from './components/shadcn'

// const REACT_LINKS = REACT_COMPONENTS.map((component) => {
//   return {
//     href: `/react/components/${component.name}`,
//     text: addSpaces(component.name),
//   }
// })

// const SHADCN_LINKS = SHADCN_COMPONENTS.map((component) => {
//   return {
//     href: `/shadcn/components/${transformToSlug(component.name)}`,
//     text: component.name,
//   }
// })

type SidebarItem = string | { href: string; text: string };

const MAIN_SIDEBAR: SidebarItem[] = [
  "Menu",
  {
    href: "/docs",
    text: "New Generation",
  },
  {
    href: "/docs/styling",
    text: "Docs",
  },
  {
    href: "/docs/resources",
    text: "Grants",
  },
];

export { MAIN_SIDEBAR };
