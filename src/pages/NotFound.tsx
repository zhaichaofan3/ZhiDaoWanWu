import { useLocation, Link } from "react-router-dom";
import { useEffect } from "react";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted py-12 px-4">
      <div className="text-center max-w-md">
        <div className="mb-8">
          <h1 className="mb-4 text-6xl font-bold text-primary">404</h1>
          <p className="text-2xl font-semibold mb-2">页面不存在</p>
          <p className="text-muted-foreground mb-6">
            抱歉，您访问的页面不存在或已被移除
          </p>
          <p className="text-sm text-muted-foreground mb-8">
            您尝试访问的地址: <span className="font-mono bg-muted-foreground/10 px-2 py-1 rounded">{location.pathname}</span>
          </p>
        </div>
        <div className="flex flex-col gap-4">
          <Link 
            to="/" 
            className="inline-flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-primary hover:bg-primary/90 transition-colors"
          >
            返回首页
          </Link>
          <Link 
            to="/products" 
            className="inline-flex items-center justify-center px-6 py-3 border border-gray-300 text-base font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 transition-colors"
          >
            浏览商品
          </Link>
        </div>
      </div>
    </div>
  );
};

export default NotFound;
