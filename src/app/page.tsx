// A raiz (onnex.pt/) adota o novo front bio renderizado pelo PublicPageRenderer.
// Reutiliza a MESMA composicao de /mock (mesmo renderer publico unico, sem app
// paralelo nem duplicacao de logica) em vez de reintroduzir a landing SaaS
// antiga, que foi removida de proposito. A page de /mock ja repoe os media
// curados e usa fromPublicBusiness; aqui so re-exportamos esse comportamento.
export { default } from "./mock/page";

// Re-declarado localmente porque route segment config nao e herdado via
// re-export: a raiz tambem deve ser estatica.
export const dynamic = "force-static";
