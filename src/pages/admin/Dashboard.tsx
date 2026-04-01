import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Package, ShoppingCart, TrendingUp, Heart, Eye } from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell, Legend,
} from "recharts";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";

const statsCards = [
  { label: "总用户数", value: "3,256", icon: Users, change: "+12%", color: "text-primary" },
  { label: "总商品数", value: "1,847", icon: Package, change: "+8%", color: "text-accent" },
  { label: "总订单数", value: "926", icon: ShoppingCart, change: "+15%", color: "text-success" },
  { label: "总浏览量", value: "52.3K", icon: Eye, change: "+22%", color: "text-warning" },
  { label: "总收藏数", value: "4,128", icon: Heart, change: "+10%", color: "text-destructive" },
  { label: "交易额", value: "¥186,420", icon: TrendingUp, change: "+18%", color: "text-primary" },
];

const userTrend = [
  { date: "3/1", 新增用户: 45, 活跃用户: 320 },
  { date: "3/5", 新增用户: 62, 活跃用户: 380 },
  { date: "3/10", 新增用户: 38, 活跃用户: 350 },
  { date: "3/15", 新增用户: 85, 活跃用户: 420 },
  { date: "3/20", 新增用户: 53, 活跃用户: 390 },
  { date: "3/25", 新增用户: 72, 活跃用户: 450 },
  { date: "3/30", 新增用户: 90, 活跃用户: 480 },
];

const orderTrend = [
  { date: "3/1", 订单量: 18 },
  { date: "3/5", 订单量: 25 },
  { date: "3/10", 订单量: 22 },
  { date: "3/15", 订单量: 35 },
  { date: "3/20", 订单量: 28 },
  { date: "3/25", 订单量: 42 },
  { date: "3/30", 订单量: 38 },
];

const categoryData = [
  { name: "数码产品", value: 35 },
  { name: "教材书籍", value: 25 },
  { name: "生活用品", value: 18 },
  { name: "服饰鞋包", value: 12 },
  { name: "运动户外", value: 10 },
];

const COLORS = [
  "hsl(160, 84%, 39%)",
  "hsl(28, 90%, 55%)",
  "hsl(210, 60%, 50%)",
  "hsl(340, 70%, 55%)",
  "hsl(45, 80%, 50%)",
];

const Dashboard = () => {
  const [stats, setStats] = useState<any>(null);

  useEffect(() => {
    api.adminStats().then(setStats).catch(() => setStats(null));
  }, []);

  const cards = [
    { label: "总用户数", value: stats?.totalUsers ?? "-", icon: Users, change: "", color: "text-primary" },
    { label: "总商品数", value: stats?.totalProducts ?? "-", icon: Package, change: "", color: "text-accent" },
    { label: "总订单数", value: stats?.totalOrders ?? "-", icon: ShoppingCart, change: "", color: "text-success" },
    { label: "总收藏数", value: stats?.totalFavorites ?? "-", icon: Heart, change: "", color: "text-destructive" },
    { label: "交易额", value: stats?.totalAmount != null ? `¥${stats.totalAmount}` : "-", icon: TrendingUp, change: "", color: "text-primary" },
    { label: "总浏览量", value: "-", icon: Eye, change: "", color: "text-warning" },
  ];

  const hotList = (stats?.topFavoritedProducts || []).slice(0, 5).map((x: any, idx: number) => ({
    rank: idx + 1,
    title: x.title,
    views: "-",
    favs: x.favorites,
  }));

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {cards.map((stat) => (
          <Card key={stat.label}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <stat.icon className={`h-5 w-5 ${stat.color}`} />
                <span className="text-xs text-success font-medium">{stat.change}</span>
              </div>
              <p className="text-2xl font-bold text-foreground">{stat.value}</p>
              <p className="text-xs text-muted-foreground mt-1">{stat.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* User Trend */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">用户增长趋势</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={userTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(210,20%,91%)" />
                <XAxis dataKey="date" fontSize={12} />
                <YAxis fontSize={12} />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="新增用户" stroke="hsl(160,84%,39%)" strokeWidth={2} dot={{ r: 3 }} />
                <Line type="monotone" dataKey="活跃用户" stroke="hsl(28,90%,55%)" strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Order Trend */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">订单趋势</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={orderTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(210,20%,91%)" />
                <XAxis dataKey="date" fontSize={12} />
                <YAxis fontSize={12} />
                <Tooltip />
                <Bar dataKey="订单量" fill="hsl(160,84%,39%)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Category Pie */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">分类交易占比</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie data={categoryData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} fontSize={12}>
                  {categoryData.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">热门商品排行</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {hotList.map((item: any) => (
                <div key={item.rank} className="flex items-center gap-3">
                  <span className={`h-6 w-6 rounded-full flex items-center justify-center text-xs font-bold ${item.rank <= 3 ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
                    {item.rank}
                  </span>
                  <span className="flex-1 text-sm text-foreground truncate">{item.title}</span>
                  <span className="text-xs text-muted-foreground">{item.views}浏览</span>
                  <span className="text-xs text-muted-foreground">{item.favs}收藏</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;
