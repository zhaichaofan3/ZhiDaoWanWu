import { Link } from "react-router-dom";

const Footer = () => (
  <footer className="border-t border-border bg-card mt-12">
    <div className="container py-8">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
        <div>
          <h4 className="font-semibold text-foreground mb-3">关于平台</h4>
          <div className="flex flex-col gap-2 text-sm text-muted-foreground">
            <Link to="/" className="hover:text-foreground transition-colors">关于我们</Link>
            <Link to="/" className="hover:text-foreground transition-colors">使用协议</Link>
            <Link to="/" className="hover:text-foreground transition-colors">隐私政策</Link>
          </div>
        </div>
        <div>
          <h4 className="font-semibold text-foreground mb-3">交易指南</h4>
          <div className="flex flex-col gap-2 text-sm text-muted-foreground">
            <Link to="/" className="hover:text-foreground transition-colors">如何发布</Link>
            <Link to="/" className="hover:text-foreground transition-colors">交易流程</Link>
            <Link to="/" className="hover:text-foreground transition-colors">安全须知</Link>
          </div>
        </div>
        <div>
          <h4 className="font-semibold text-foreground mb-3">帮助中心</h4>
          <div className="flex flex-col gap-2 text-sm text-muted-foreground">
            <Link to="/" className="hover:text-foreground transition-colors">常见问题</Link>
            <Link to="/" className="hover:text-foreground transition-colors">联系客服</Link>
            <Link to="/" className="hover:text-foreground transition-colors">意见反馈</Link>
          </div>
        </div>
        <div>
          <h4 className="font-semibold text-foreground mb-3">关注我们</h4>
          <p className="text-sm text-muted-foreground">校园二手交易平台</p>
          <p className="text-sm text-muted-foreground mt-1">让闲置流转，让价值延续</p>
        </div>
      </div>
      <div className="border-t border-border mt-6 pt-6 text-center text-sm text-muted-foreground">
        © 2024 校园二手交易平台 · 仅供校内同学使用
      </div>
    </div>
  </footer>
);

export default Footer;
