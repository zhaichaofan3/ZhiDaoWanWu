import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ShoppingBag, Package } from "lucide-react";
import { api } from "@/lib/api";
import { getMe } from "@/lib/auth";
import type { Order } from "@/types";

const statusVariant = (status: string) => {
  switch (status) {
    case "pending": return "secondary";
    case "confirmed": return "default";
    case "completed": return "outline";
    case "cancelled": return "destructive";
    default: return "secondary";
  }
};

const statusText = (status: string) => {
  switch (status) {
    case "pending": return "待确认";
    case "confirmed": return "待交付";
    case "completed": return "已完成";
    case "cancelled": return "已取消";
    default: return status;
  }
};

const Orders = () => {
  const [tab, setTab] = useState<"bought" | "sold">("bought");
  const [statusFilter, setStatusFilter] = useState("全部");
  const [buyerOrders, setBuyerOrders] = useState<Order[]>([]);
  const [sellerOrders, setSellerOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchOrders = async () => {
      const user = getMe();
      if (!user) return;
      
      setLoading(true);
      try {
        const response = await api.listOrders(user.id);
        // 转换API返回的数据格式以匹配前端类型
        const formattedOrders: Order[] = response.map((o: any) => ({
          id: o.id.toString(),
          orderNo: o.orderNo || `TX${new Date().toISOString().slice(0, 10).replace(/-/g, "")}${String(o.id).padStart(3, "0")}`,
          product: {
            id: o.product?.id?.toString() || "",
            title: o.product?.title || o.title || "",
            images: o.product?.images || (o.product?.image_url ? [o.product.image_url] : []),
            price: o.product?.price || o.price || 0,
            // 其他字段使用默认值
            description: "",
            originalPrice: 0,
            condition: "轻微使用",
            category: "",
            categoryId: "",
            seller: {
              id: "",
              nickname: "",
              avatar: ""
            },
            status: "已上架",
            views: 0,
            favorites: 0,
            campus: "",
            createdAt: ""
          },
          buyer: {
            id: o.buyer?.id?.toString() || o.buyer_id?.toString() || "",
            nickname: o.buyer?.nickname || "未知买家",
            avatar: o.buyer?.avatar || ""
          },
          seller: {
            id: o.seller?.id?.toString() || o.seller_id?.toString() || "",
            nickname: o.seller?.nickname || "未知卖家",
            avatar: o.seller?.avatar || ""
          },
          status: o.status,
          amount: o.amount || o.price || 0,
          createdAt: o.created_at || new Date().toISOString().split('T')[0],
          deliveryAddress: o.deliveryAddress || "",
          deliveryTime: o.deliveryTime || "",
          timeline: o.timeline || []
        }));
        
        // 分离买家和卖家订单
        setBuyerOrders(formattedOrders.filter(o => o.buyer.id === user.id.toString()));
        setSellerOrders(formattedOrders.filter(o => o.seller.id === user.id.toString()));
      } catch (error) {
        console.error("获取订单失败", error);
        setBuyerOrders([]);
        setSellerOrders([]);
      } finally {
        setLoading(false);
      }
    };

    fetchOrders();
  }, []);

  const orders = tab === "bought" ? buyerOrders : sellerOrders;
  const statuses = ["全部", "待确认", "待交付", "已完成", "已取消"];
  const filtered = statusFilter === "全部" ? orders : orders.filter((o) => {
    const statusMap: Record<string, string> = {
      "待确认": "pending",
      "待交付": "confirmed",
      "已完成": "completed",
      "已取消": "cancelled"
    };
    return o.status === statusMap[statusFilter];
  });

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <main className="flex-1 container py-6 max-w-3xl">
        <h1 className="text-xl font-bold text-foreground mb-4">我的订单</h1>

        <Tabs value={tab} onValueChange={(v) => { setTab(v as "bought" | "sold"); setStatusFilter("全部"); }}>
          <TabsList className="w-full">
            <TabsTrigger value="bought" className="flex-1 gap-1.5">
              <ShoppingBag className="h-4 w-4" /> 我买到的
            </TabsTrigger>
            <TabsTrigger value="sold" className="flex-1 gap-1.5">
              <Package className="h-4 w-4" /> 我卖出的
            </TabsTrigger>
          </TabsList>

          <div className="flex gap-1 mt-4 mb-3 flex-wrap">
            {statuses.map((s) => (
              <Button key={s} variant={statusFilter === s ? "default" : "outline"} size="sm" onClick={() => setStatusFilter(s)}>
                {s}
              </Button>
            ))}
          </div>

          <TabsContent value="bought" className="mt-0">
            <OrderList orders={filtered} role="buyer" loading={loading} />
          </TabsContent>
          <TabsContent value="sold" className="mt-0">
            <OrderList orders={filtered} role="seller" loading={loading} />
          </TabsContent>
        </Tabs>
      </main>
      <Footer />
    </div>
  );
};

interface OrderListProps {
  orders: Order[];
  role: "buyer" | "seller";
  loading: boolean;
}

const OrderList = ({ orders, role, loading }: OrderListProps) => {
  if (loading) {
    return (
      <div className="flex flex-col items-center py-16 text-muted-foreground">
        <ShoppingBag className="h-12 w-12 mb-3" />
        <p>加载中...</p>
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <div className="flex flex-col items-center py-16 text-muted-foreground">
        <ShoppingBag className="h-12 w-12 mb-3" />
        <p>暂无订单</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {orders.map((order) => (
        <Link key={order.id} to={`/order/${order.id}`}>
          <Card className="hover:shadow-md transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs text-muted-foreground">订单号：{order.orderNo}</span>
                <Badge variant={statusVariant(order.status)}>{statusText(order.status)}</Badge>
              </div>
              <div className="flex gap-3">
                <img
                  src={order.product.images[0] || "https://via.placeholder.com/100"}
                  alt=""
                  className="h-16 w-16 rounded-lg object-cover shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{order.product.title}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {role === "buyer" ? `卖家：${order.seller.nickname}` : `买家：${order.buyer.nickname}`}
                  </p>
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-sm font-bold text-primary">¥{order.amount}</span>
                    <span className="text-xs text-muted-foreground">{order.createdAt}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </Link>
      ))}
    </div>
  );
};

export default Orders;
