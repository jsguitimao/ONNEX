import { redirect } from "next/navigation";

// O editor da página vive no CRM (separador "Painel Visual"). Este endereço
// antigo fica só como redirect para não partir bookmarks/histórico; o /crm
// trata da autenticação e do paywall.
export default function PageEditorRoute() {
  redirect("/crm");
}
