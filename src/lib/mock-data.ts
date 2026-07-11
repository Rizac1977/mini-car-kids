// Dados fictícios para a Fase 1 — nenhum backend conectado.
export const currency = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export const dateBR = (d: Date | string) =>
  new Date(d).toLocaleDateString("pt-BR");

export const timeBR = (d: Date | string) =>
  new Date(d).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });

export type VehicleStatus = "disponivel" | "em_locacao" | "manutencao" | "inativo";

export const vehicles: Array<{
  id: string;
  name: string;
  code: string;
  photo: string;
  category: string;
  location: string;
  status: VehicleStatus;
  rentals: number;
  revenue: number;
}> = [
  { id: "v1", name: "Mustang Vermelho", code: "MC-01", photo: "🏎️", category: "Carro esportivo", location: "Praça Central", status: "em_locacao", rentals: 128, revenue: 1920 },
  { id: "v2", name: "Jipe Azul", code: "MC-02", photo: "🚙", category: "Jipe", location: "Praça Central", status: "disponivel", rentals: 96, revenue: 1440 },
  { id: "v3", name: "Moto Rosa", code: "MC-03", photo: "🏍️", category: "Moto", location: "Shopping Vale", status: "disponivel", rentals: 74, revenue: 1110 },
  { id: "v4", name: "Caminhonete Preta", code: "MC-04", photo: "🛻", category: "Caminhonete", location: "Parque das Águas", status: "em_locacao", rentals: 152, revenue: 2280 },
  { id: "v5", name: "Fusca Amarelo", code: "MC-05", photo: "🚗", category: "Carro clássico", location: "Praça Central", status: "manutencao", rentals: 60, revenue: 900 },
  { id: "v6", name: "Trator Verde", code: "MC-06", photo: "🚜", category: "Trator", location: "Parque das Águas", status: "disponivel", rentals: 40, revenue: 600 },
];

export const locations = [
  { id: "l1", name: "Praça Central", type: "Praça", city: "Belo Horizonte", state: "MG", active: true },
  { id: "l2", name: "Shopping Vale", type: "Shopping", city: "Belo Horizonte", state: "MG", active: true },
  { id: "l3", name: "Parque das Águas", type: "Parque", city: "Contagem", state: "MG", active: true },
  { id: "l4", name: "Evento Aniversário Kids", type: "Evento", city: "Belo Horizonte", state: "MG", active: false },
];

export const activeRentals = [
  {
    id: "r1",
    vehicle: vehicles[0],
    location: "Praça Central",
    start: new Date(Date.now() - 6 * 60 * 1000),
    end: new Date(Date.now() + 4 * 60 * 1000),
    duration: 10,
    amount: 15,
  },
  {
    id: "r2",
    vehicle: vehicles[3],
    location: "Parque das Águas",
    start: new Date(Date.now() - 13 * 60 * 1000),
    end: new Date(Date.now() + 2 * 60 * 1000),
    duration: 15,
    amount: 22,
  },
  {
    id: "r3",
    vehicle: vehicles[1],
    location: "Praça Central",
    start: new Date(Date.now() - 2 * 60 * 1000),
    end: new Date(Date.now() + 18 * 60 * 1000),
    duration: 20,
    amount: 28,
  },
];

export const history = [
  { id: "h1", vehicle: "Mustang Vermelho", photo: "🏎️", location: "Praça Central", date: new Date(Date.now() - 3600000), duration: 15, amount: 22 },
  { id: "h2", vehicle: "Jipe Azul", photo: "🚙", location: "Praça Central", date: new Date(Date.now() - 7200000), duration: 10, amount: 15 },
  { id: "h3", vehicle: "Moto Rosa", photo: "🏍️", location: "Shopping Vale", date: new Date(Date.now() - 10800000), duration: 20, amount: 28 },
  { id: "h4", vehicle: "Caminhonete Preta", photo: "🛻", location: "Parque das Águas", date: new Date(Date.now() - 86400000), duration: 30, amount: 40 },
  { id: "h5", vehicle: "Fusca Amarelo", photo: "🚗", location: "Praça Central", date: new Date(Date.now() - 90000000), duration: 5, amount: 8 },
  { id: "h6", vehicle: "Trator Verde", photo: "🚜", location: "Parque das Águas", date: new Date(Date.now() - 172800000), duration: 15, amount: 22 },
];

export const packages = [
  { id: "p1", minutes: 5, price: 8 },
  { id: "p2", minutes: 10, price: 15 },
  { id: "p3", minutes: 15, price: 22 },
  { id: "p4", minutes: 20, price: 28 },
  { id: "p5", minutes: 30, price: 40 },
];

export const owner = {
  name: "Carlos Silva",
  business: "MiniCarros do Carlinhos",
  phone: "(31) 99876-5432",
  email: "carlos@minicarros.com.br",
  city: "Belo Horizonte",
  state: "MG",
  joined: new Date("2024-11-15"),
  status: "ativo",
};

export const subscription = {
  status: "ativa",
  start: new Date("2024-11-15"),
  expiration: new Date(Date.now() + 22 * 86400000),
};

export const admins = {
  totalOwners: 47,
  activeOwners: 38,
  pending: 5,
  expiringSoon: 6,
  expired: 3,
  totalVehicles: 214,
  totalLocations: 82,
  totalRentals: 12480,
  volume: 187_540,
  newThisMonth: 9,
};

export const ownersList = [
  { id: "o1", name: "Carlos Silva", business: "MiniCarros do Carlinhos", city: "Belo Horizonte", state: "MG", status: "ativo", subscription: "ativa", joined: new Date("2024-11-15") },
  { id: "o2", name: "Ana Rodrigues", business: "KidsCars BH", city: "Contagem", state: "MG", status: "ativo", subscription: "próxima do vencimento", joined: new Date("2024-08-02") },
  { id: "o3", name: "Roberto Lima", business: "Turminha Elétrica", city: "Betim", state: "MG", status: "pendente", subscription: "teste", joined: new Date() },
  { id: "o4", name: "Juliana Costa", business: "Speed Kids", city: "Sete Lagoas", state: "MG", status: "ativo", subscription: "ativa", joined: new Date("2025-02-10") },
  { id: "o5", name: "Fernando Alves", business: "Mini Motors", city: "Nova Lima", state: "MG", status: "suspenso", subscription: "vencida", joined: new Date("2024-05-20") },
];
