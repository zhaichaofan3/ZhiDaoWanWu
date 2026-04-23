import { Link } from "react-router-dom";

const Footer = () => (
  <footer className="border-t border-border bg-card mt-12">
    <div className="container py-8">
      <div className="pt-6 mb-6 flex justify-center">
        <img src="/logos/logo.png" alt="校园二手交易平台" className="h-20 w-auto" loading="lazy" decoding="async" />
      </div>
      <div className="text-center text-sm text-muted-foreground">
        © {new Date().getFullYear()} 智达万物
      </div>
    </div>
  </footer>
);

export default Footer;
