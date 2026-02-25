export type Category = {
  id: string;
  name: string;
  icon: string;
};

export type Product = {
  id: string;
  name: string;
  price: number;
  categoryId: string;
  image?: string;
  inStock: boolean;
  stockQty: number;
};

export type OrderItem = {
  product: Product;
  quantity: number;
  notes?: string;
};

export type OrderChannel = "balcao" | "garcom" | "delivery";

export type Order = {
  id: string;
  items: OrderItem[];
  channel: OrderChannel;
  tableNumber?: number;
  customerName?: string;
  status: "aberto" | "preparando" | "pronto" | "entregue" | "pago";
  createdAt: Date;
  total: number;
};

export type PaymentMethod = "dinheiro" | "credito" | "debito" | "pix";

export const categories: Category[] = [
  { id: "cervejas", name: "Cervejas", icon: "🍺" },
  { id: "drinks", name: "Drinks", icon: "🍸" },
  { id: "refrigerantes", name: "Refrigerantes", icon: "🥤" },
  { id: "tabacaria", name: "Tabacaria", icon: "🚬" },
  { id: "lanches", name: "Lanches", icon: "🍔" },
  { id: "porcoes", name: "Porções", icon: "🍟" },
];

export const products: Product[] = [
  // Cervejas
  { id: "p1", name: "Heineken 600ml", price: 14.90, categoryId: "cervejas", inStock: true, stockQty: 48 },
  { id: "p2", name: "Brahma Chopp 350ml", price: 5.90, categoryId: "cervejas", inStock: true, stockQty: 120 },
  { id: "p3", name: "Corona Extra 355ml", price: 12.90, categoryId: "cervejas", inStock: true, stockQty: 36 },
  { id: "p4", name: "Budweiser 350ml", price: 6.90, categoryId: "cervejas", inStock: true, stockQty: 80 },
  { id: "p5", name: "Stella Artois 275ml", price: 9.90, categoryId: "cervejas", inStock: true, stockQty: 60 },
  { id: "p6", name: "Skol Lata 350ml", price: 4.50, categoryId: "cervejas", inStock: true, stockQty: 200 },
  // Drinks
  { id: "p7", name: "Caipirinha Limão", price: 18.90, categoryId: "drinks", inStock: true, stockQty: 99 },
  { id: "p8", name: "Gin Tônica", price: 24.90, categoryId: "drinks", inStock: true, stockQty: 99 },
  { id: "p9", name: "Mojito", price: 22.90, categoryId: "drinks", inStock: true, stockQty: 99 },
  { id: "p10", name: "Moscow Mule", price: 26.90, categoryId: "drinks", inStock: true, stockQty: 99 },
  // Refrigerantes
  { id: "p11", name: "Coca-Cola 350ml", price: 6.00, categoryId: "refrigerantes", inStock: true, stockQty: 100 },
  { id: "p12", name: "Guaraná Antarctica", price: 5.50, categoryId: "refrigerantes", inStock: true, stockQty: 80 },
  { id: "p13", name: "Água Mineral 500ml", price: 4.00, categoryId: "refrigerantes", inStock: true, stockQty: 150 },
  { id: "p14", name: "Red Bull 250ml", price: 15.00, categoryId: "refrigerantes", inStock: true, stockQty: 40 },
  // Tabacaria
  { id: "p15", name: "Essência Premium Mix", price: 25.90, categoryId: "tabacaria", inStock: true, stockQty: 30 },
  { id: "p16", name: "Carvão Hexagonal 1kg", price: 18.90, categoryId: "tabacaria", inStock: true, stockQty: 20 },
  { id: "p17", name: "Papel Seda King Size", price: 8.90, categoryId: "tabacaria", inStock: true, stockQty: 50 },
  { id: "p18", name: "Narguilé Sessão", price: 45.00, categoryId: "tabacaria", inStock: true, stockQty: 99 },
  // Lanches
  { id: "p19", name: "X-Burger Artesanal", price: 28.90, categoryId: "lanches", inStock: true, stockQty: 99 },
  { id: "p20", name: "X-Bacon Especial", price: 32.90, categoryId: "lanches", inStock: true, stockQty: 99 },
  { id: "p21", name: "Hot Dog Completo", price: 18.90, categoryId: "lanches", inStock: true, stockQty: 99 },
  // Porções
  { id: "p22", name: "Batata Frita Grande", price: 24.90, categoryId: "porcoes", inStock: true, stockQty: 99 },
  { id: "p23", name: "Isca de Frango", price: 29.90, categoryId: "porcoes", inStock: true, stockQty: 99 },
  { id: "p24", name: "Bolinho de Bacalhau (10un)", price: 34.90, categoryId: "porcoes", inStock: true, stockQty: 99 },
];

export const formatCurrency = (value: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
