export type NavBarLink = {
  href: string;
};

export type NavBarLinks = {
  post: NavBarLink;
  diary: NavBarLink;
};

export type Localization = {
  navBarLinks: NavBarLinks;
};
