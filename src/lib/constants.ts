export const SPECIALTIES = [
  "Clinica Medica",
  "Cirurgia",
  "Pediatria",
  "Ginecologia e Obstetricia",
  "Medicina Preventiva",
  "Psiquiatria",
  "Ortopedia",
  "Dermatologia",
  "Cardiologia",
  "Pneumologia",
  "Nefrologia",
  "Neurologia",
  "Infectologia",
  "Endocrinologia",
  "Gastroenterologia",
  "Reumatologia",
  "Hematologia",
  "Urologia",
  "Oftalmologia",
  "Otorrinolaringologia",
] as const;

export const ERROR_TYPE_OPTIONS = [
  { value: "wrong", label: "Errei" },
  { value: "guess", label: "Acertei no chute" },
  { value: "doubt", label: "Fiquei em duvida" },
] as const;

export const ERROR_TYPE_LABELS: Record<string, string> = {
  wrong: "Errei",
  guess: "Chute",
  doubt: "Duvida",
};

export const DIFFICULTY_LABELS: Record<string, string> = {
  easy: "Facil",
  medium: "Media",
  hard: "Dificil",
};

export const SUPPORTED_FILE_TYPES = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "application/pdf": ".pdf",
} as const;
