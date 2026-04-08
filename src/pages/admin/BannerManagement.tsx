import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import { Plus, Pencil, Trash2, ArrowUp, ArrowDown, Eye, EyeOff } from "lucide-react";
import { api } from "@/lib/api";
import { resolveAssetUrl } from "@/lib/assets";

interface BannerItem {
  id: string;
  title: string;
  image: string;
  link: string;
  sort: number;
  active: boolean;
}

const BannerManagement = () => {
  const [banners, setBanners] = useState<BannerItem[]>([]);
  const [editBanner, setEditBanner] = useState<BannerItem | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [form, setForm] = useState({ title: "", image: "", link: "" });
  const [uploading, setUploading] = useState(false);

  const refresh = async () => {
    const list = await api.adminListBanners();
    setBanners(list as BannerItem[]);
  };

  useEffect(() => {
    refresh().catch(() => setBanners([]));
  }, []);

  const openNew = () => {
    setForm({ title: "", image: "", link: "" });
    setEditBanner(null);
    setIsNew(true);
  };

  const openEdit = (item: BannerItem) => {
    setForm({ title: item.title, image: item.image, link: item.link });
    setEditBanner(item);
    setIsNew(false);
  };

  const handleSave = async () => {
    if (!form.title.trim() || !form.image.trim()) return;
    if (isNew) {
      await api.adminCreateBanner({ title: form.title, image: form.image, link: form.link || "/products" });
    } else if (editBanner) {
      await api.adminUpdateBanner(editBanner.id, { title: form.title, image: form.image, link: form.link });
    }
    await refresh();
    setEditBanner(null);
    setIsNew(false);
  };

  const handleDelete = async (id: string) => {
    await api.adminDeleteBanner(id);
    await refresh();
  };

  const toggleActive = async (id: string) => {
    const banner = banners.find((b) => b.id === id);
    if (!banner) return;
    await api.adminSetBannerStatus(id, !banner.active);
    await refresh();
  };

  const moveUp = async (index: number) => {
    if (index === 0) return;
    const arr = [...banners];
    [arr[index - 1], arr[index]] = [arr[index], arr[index - 1]];
    await api.adminSortBanners(arr.map((x) => x.id));
    await refresh();
  };

  const moveDown = async (index: number) => {
    if (index === banners.length - 1) return;
    const arr = [...banners];
    [arr[index], arr[index + 1]] = [arr[index + 1], arr[index]];
    await api.adminSortBanners(arr.map((x) => x.id));
    await refresh();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Badge variant="secondary">{banners.filter((b) => b.active).length}/{banners.length} 已上架</Badge>
        <Button size="sm" onClick={openNew} className="gap-1" disabled={banners.length >= 5}>
          <Plus className="h-4 w-4" /> 新增轮播图
        </Button>
      </div>

      <div className="grid gap-4">
        {banners.map((banner, index) => (
          <Card key={banner.id} className={!banner.active ? "opacity-60" : ""}>
            <CardContent className="p-4 flex items-center gap-4">
              <div className="flex flex-col gap-1 shrink-0">
                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => moveUp(index)} disabled={index === 0}>
                  <ArrowUp className="h-3 w-3" />
                </Button>
                <span className="text-xs text-center text-muted-foreground">{banner.sort}</span>
                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => moveDown(index)} disabled={index === banners.length - 1}>
                  <ArrowDown className="h-3 w-3" />
                </Button>
              </div>
              <img src={resolveAssetUrl(banner.image)} alt="" className="h-20 w-36 rounded-lg object-cover shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="font-medium text-foreground">{banner.title}</p>
                <p className="text-xs text-muted-foreground mt-1">链接：{banner.link}</p>
                <Badge variant={banner.active ? "default" : "secondary"} className="mt-2">
                  {banner.active ? "已上架" : "已下架"}
                </Badge>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => toggleActive(banner.id)} title={banner.active ? "下架" : "上架"}>
                  {banner.active ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(banner)}>
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleDelete(banner.id)}>
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Edit/New Dialog */}
      <Dialog open={isNew || !!editBanner} onOpenChange={() => { setEditBanner(null); setIsNew(false); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{isNew ? "新增轮播图" : "编辑轮播图"}</DialogTitle>
            <DialogDescription>{isNew ? "添加首页轮播图，最多5张" : "修改轮播图信息"}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-foreground mb-1 block">标题</label>
              <Input value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} placeholder="轮播图标题" />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground mb-1 block">轮播图图片</label>
              <div className="flex items-center gap-2">
                <Input
                  value={form.image}
                  onChange={(e) => setForm((f) => ({ ...f, image: e.target.value }))}
                  placeholder="上传后自动填充，或粘贴图片URL"
                />
                <Button
                  type="button"
                  variant="secondary"
                  disabled={uploading}
                  onClick={() => {
                    const el = document.getElementById("banner-image-file") as HTMLInputElement | null;
                    el?.click();
                  }}
                >
                  {uploading ? "上传中..." : "选择图片"}
                </Button>
                <input
                  id="banner-image-file"
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    setUploading(true);
                    try {
                      const r = await api.adminUploadBannerImage(file);
                      // 优先存相对路径，避免把 localhost 写进数据库
                      setForm((f) => ({ ...f, image: r.path || r.url }));
                    } finally {
                      setUploading(false);
                      e.target.value = "";
                    }
                  }}
                />
              </div>
              {form.image && <img src={resolveAssetUrl(form.image)} alt="" className="mt-2 h-24 w-full object-cover rounded-lg" />}
            </div>
            <div>
              <label className="text-sm font-medium text-foreground mb-1 block">跳转链接</label>
              <Input value={form.link} onChange={(e) => setForm((f) => ({ ...f, link: e.target.value }))} placeholder="/products" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setEditBanner(null); setIsNew(false); }}>取消</Button>
            <Button onClick={handleSave} disabled={!form.title.trim() || !form.image.trim()}>保存</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default BannerManagement;
