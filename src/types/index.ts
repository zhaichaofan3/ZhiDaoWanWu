export interface User {
  id: string;
  nickname: string;
  avatar: string;
  gender: "male" | "female" | "other";
  grade: string;
  major: string;
  bio: string;
  phone: string;
  studentId: string;
  createdAt: string;
}

export interface Category {
  id: string;
  name: string;
  icon: string;
  children?: Category[];
}

export interface Product {
  id: string;
  title: string;
  description: string;
  price: number;
  originalPrice?: number;
  condition: "全新" | "几乎全新" | "轻微使用" | "明显使用";
  images: string[];
  category: string;
  categoryId: string;
  seller: {
    id: string;
    nickname: string;
    avatar: string;
  };
  status: "审核中" | "已上架" | "已下架" | "已驳回" | "已售出";
  views: number;
  favorites: number;
  isFavorited?: boolean;
  campus: string;
  createdAt: string;
}

export interface Order {
  id: string;
  orderNo: string;
  product: Product;
  buyer: { id: string; nickname: string; avatar: string };
  seller: { id: string; nickname: string; avatar: string };
  status: "待确认" | "待交付" | "已完成" | "已取消";
  amount: number;
  createdAt: string;
  deliveryAddress?: string;
  deliveryTime?: string;
  timeline: { content: string; time: string }[];
}

export interface Address {
  id: string | number;
  contact: string;
  phone: string;
  campus: string;
  building: string;
  detail: string;
  isDefault: boolean;
}

export interface Announcement {
  id: string;
  title: string;
  content: string;
  isTop: boolean;
  createdAt: string;
}
