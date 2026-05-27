export interface DiagnosisResponse {
  planta: string;
  estado_saude: "Saudável" | "Doente" | "Stress Hídrico" | "Deficiência de Nutrientes" | string;
  diagnostico: string;
  tratamento: string;
}

export interface SavedDiagnosis extends DiagnosisResponse {
  id: string;
  image: string; // Base64 or locally cached link
  date: string;
  notas?: string; // Anotações pessoais de acompanhamento
  completed_steps?: string[]; // Tarefas de tratamento concluídas pelo utilizador
}
