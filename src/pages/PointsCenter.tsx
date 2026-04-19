import Header from "@/features/public/components/Header";
import Footer from "@/features/public/components/Footer";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Coins, ArrowUpDown } from "lucide-react";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useUtc8Time } from "@/hooks/use-utc8-time";
import { toast } from "sonner";

export default function PointsCenter() {
  const { formatDateTime } = useUtc8Time();
  const [loading, setLoading] = useState(true);
  const [pointsData, setPointsData] = useState<{
    points: { points: number; total_points: number };
    logs: any[];
  } | null>(null);

  useEffect(() => {
    setLoading(true);
    api.getMyPoints()
      .then((data: any) => {
        setPointsData(data);
      })
      .catch((err) => {
        console.error("获取积分失败:", err);
        toast.error("获取积分信息失败");
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <main className="flex-1">
        <div className="container max-w-2xl py-6">
          <div className="flex items-center gap-2 mb-6">
            <Coins className="h-6 w-6 text-primary" />
            <h1 className="text-xl font-bold">积分中心</h1>
          </div>

          {loading ? (
            <div className="text-center py-16 text-muted-foreground">加载中...</div>
          ) : pointsData ? (
            <>
              <Card className="mb-6">
                <CardContent className="p-6">
                  <div className="text-center">
                    <div className="text-4xl font-bold text-primary mb-2">
                      {pointsData.points?.points ?? 0}
                    </div>
                    <div className="text-sm text-muted-foreground">当前可用积分</div>
                  </div>
                  <div className="grid grid-cols-2 gap-4 mt-6 pt-6 border-t border-border">
                    <div className="text-center">
                      <div className="text-lg font-semibold">{pointsData.points?.total_points ?? 0}</div>
                      <div className="text-xs text-muted-foreground">历史累计积分</div>
                    </div>
                    <div className="text-center">
                      <div className="text-lg font-semibold">
                        {(pointsData.points?.total_points ?? 0) - (pointsData.points?.points ?? 0)}
                      </div>
                      <div className="text-xs text-muted-foreground">已消耗积分</div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="py-4">
                  <CardTitle className="text-base flex items-center gap-2">
                    <ArrowUpDown className="h-4 w-4" />
                    积分记录
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  {pointsData.logs && pointsData.logs.length > 0 ? (
                    <div className="divide-y divide-border">
                      {pointsData.logs.map((log: any, index: number) => (
                        <div key={log.id || index} className="px-4 py-3 flex items-center justify-between">
                          <div>
                            <div className="text-sm font-medium text-foreground">
                              {log.description || log.rule_name || (log.type === "adjust" ? "积分调整" : "积分变动")}
                            </div>
                            <div className="text-xs text-muted-foreground mt-0.5">
                              {formatDateTime(log.created_at)}
                            </div>
                          </div>
                          <div className={`text-sm font-medium ${log.points >= 0 ? "text-green-600" : "text-red-600"}`}>
                            {log.points >= 0 ? "+" : ""}{log.points}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="py-12 text-center text-muted-foreground">暂无积分记录</div>
                  )}
                </CardContent>
              </Card>
            </>
          ) : (
            <div className="text-center py-16 text-muted-foreground">加载失败</div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}