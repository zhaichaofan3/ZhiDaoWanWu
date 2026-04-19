import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useUtc8Time } from "@/hooks/use-utc8-time";
import { toast } from "sonner";
import { ArrowUpDown } from "lucide-react";

export default function PointsCenterContent() {
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
    <div>
      {loading ? (
        <div className="text-center py-16 text-muted-foreground">加载中...</div>
      ) : pointsData ? (
        <>
          <div className="text-center mb-8">
            <div className="text-4xl font-bold text-primary mb-2">
              {pointsData.points?.points ?? 0}
            </div>
            <div className="text-sm text-muted-foreground">当前可用积分</div>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-8 pt-6 border-t border-border">
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

          <div>
            <h4 className="text-sm font-medium text-foreground mb-4 flex items-center gap-2">
              <ArrowUpDown className="h-4 w-4" />
              积分记录
            </h4>
            {pointsData.logs && pointsData.logs.length > 0 ? (
              <div className="divide-y divide-border">
                {pointsData.logs.map((log: any, index: number) => (
                  <div key={log.id || index} className="py-3 flex items-center justify-between">
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
              <div className="py-8 text-center text-muted-foreground">暂无积分记录</div>
            )}
          </div>
        </>
      ) : (
        <div className="text-center py-16 text-muted-foreground">加载失败</div>
      )}
    </div>
  );
}