
export const SETORES = [
  "Diretoria",
  "Recursos Humanos",
  "Tecnologia da Informação",
  "Financeiro",
  "Marketing",
  "Jurídico",
  "Operações",
  "Comercial",
  "Projetos",
  "Outro",
];

export const ASSUNTOS = [
  { value: "reuniao",      label: "Reunião" },
  { value: "palestra",     label: "Palestra" },
  { value: "treinamento",  label: "Treinamento" },
  { value: "conferencia",  label: "Conferência" },
  { value: "workshop",     label: "Workshop" },
  { value: "apresentacao", label: "Apresentação" },
  { value: "evento",       label: "Evento Corporativo" },
  { value: "outro",        label: "Outro" },
];

export const SALAS = [
  { id: "aud-a", name: "Auditório A", capacity: 200, hallOnly: false },
  { id: "aud-b", name: "Auditório B", capacity: 120, hallOnly: false },
  { id: "hall",  name: "Hall",        capacity: 60,  hallOnly: true  },
];

export const HOUR_START = 8;
export const HOUR_END   = 20;

export const PT_MONTHS = [
  "Janeiro","Fevereiro","Março","Abril","Maio","Junho",
  "Julho","Agosto","Setembro","Outubro","Novembro","Dezembro",
];

export const PT_DAYS = ["Dom","Seg","Ter","Qua","Qui","Sex","Sáb"];