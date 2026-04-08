import { Link } from "react-router-dom";

const Footer = () => (
  <footer className="border-t border-border bg-card mt-12">
    <div className="container py-8">
      <div className="pt-6 mb-6 flex justify-center">
        <img src="/logos/logo_with_slogan_black.svg" alt="校园二手交易平台" className="h-10 w-auto dark:hidden" loading="lazy" decoding="async" />
        <img src="/logos/logo_with_slogan_white.svg" alt="校园二手交易平台" className="h-10 w-auto hidden dark:block" loading="lazy" decoding="async" />
      </div>
      <div className="text-center text-sm text-muted-foreground">
        © {new Date().getFullYear()} 拾物社
      </div>
    </div>
  </footer>
);

export default Footer;
