import { fmt } from "./helpers";

function makeBookings() {
  const today = new Date();
  const y = today.getFullYear();
  const m = today.getMonth();

  const d = (offset) => {
    const date = new Date(today);
    date.setDate(today.getDate() + offset);
    return fmt(date);
  };

  return [
    { date: d(1),  inicio: "09:00", fim: "11:00", nome: "Lucas Ferreira",  assunto: "Palestra" },
    { date: d(1),  inicio: "14:00", fim: "16:00", nome: "Carla Mendes",    assunto: "Treinamento" },
    { date: d(2),  inicio: "10:00", fim: "12:00", nome: "Roberto Alves",   assunto: "Reunião" },
    { date: d(3),  inicio: "08:00", fim: "10:00", nome: "Fernanda Costa",  assunto: "Workshop" },
    { date: d(3),  inicio: "13:00", fim: "15:00", nome: "Pedro Souza",     assunto: "Conferência" },
    { date: d(3),  inicio: "15:00", fim: "17:00", nome: "Juliana Lima",    assunto: "Apresentação" },
    { date: d(5),  inicio: "09:00", fim: "18:00", nome: "Diretoria",       assunto: "Evento Corporativo" },
    { date: d(7),  inicio: "10:00", fim: "12:00", nome: "Ana Paula Ramos", assunto: "Treinamento" },
    { date: d(8),  inicio: "14:00", fim: "15:00", nome: "Marcos Oliveira", assunto: "Reunião" },
    { date: d(10), inicio: "08:00", fim: "12:00", nome: "Equipe de TI",    assunto: "Workshop" },
    { date: d(12), inicio: "13:00", fim: "16:00", nome: "Sandra Lima",     assunto: "Palestra" },
    { date: fmt(new Date(y, m + 1, 3)), inicio: "09:00", fim: "11:00", nome: "Bruno Castro", assunto: "Reunião" },
  ];
}

export const BOOKINGS = makeBookings();