// app/torre/comercio-v2/page.tsx
import type { Metadata } from "next";
import Link from "next/link";
import { requireAdmin } from "@/lib/auth/require-admin";

export const metadata: Metadata = { title: "Comércio V2 | Torre de Controle" };

const stages = [
  {
    name: "01 · Produtos",
    status: "Módulo criado — validação pendente",
    description: "Cadastro independente, somente em rascunho, sem venda.",
    href: "/torre/comercio-v2/produtos",
  },
  {
    name: "02 · Biblioteca de materiais",
    status: "Módulo criado — validação pendente",
    description: "Arquivos privados, organizados por produto e tipo, com edição e filtros.",
    href: "/torre/comercio-v2/materiais",
  },
  {
    name: "03 · Ofertas e preços",
    status: "Módulo criado — validação pendente",
    description: "Preço, promoção e histórico, sem checkout.",
    href: "/torre/comercio-v2/ofertas",
  },
  {
    name: "04 · Páginas de vendas",
    status: "Planejado",
    description: "Modelos, prévia e publicação sem alteração no código.",
  },
  {
    name: "05 · Checkout",
    status: "Planejado",
    description: "Pedido, pagamento e integração financeira isolados.",
  },
  {
    name: "06 · Entregas",
    status: "Planejado",
    description: "Materiais, acesso do comprador e prazos.",
  },
  {
    name: "07 · Homologação",
    status: "Planejado",
    description: "Testes ponta a ponta e verificação do sistema atual.",
  },
] as const;

export default async function ComercioV2Home() {
  await requireAdmin();

  return (
    <main style={{ maxWidth: 1100, margin: "0 auto", padding: "28px 20px 72px" }}>
      <p style={{ color: "#92720e", fontSize: 12, letterSpacing: "0.1em", fontWeight: 800 }}>
        TORRE DE CONTROLE · PROJETO ISOLADO
      </p>
      <h1 style={{ fontSize: "clamp(27px, 3vw, 36px)", marginBottom: 10 }}>
        Comércio V2
      </h1>
      <p style={{ color: "#475569", lineHeight: 1.6, maxWidth: 790 }}>
        Acompanhe a construção do novo fluxo de produtos, ofertas, páginas e checkout.
        Esta área não altera os produtos, pedidos, cobranças ou entregas atuais.
      </p>
      <section style={{
        background: "#fff8e7", border: "1px solid #ead7a2",
        padding: 18, borderRadius: 12, margin: "24px 0",
      }}>
        <strong style={{ color: "#7b5813" }}>Ambiente piloto — sem vendas</strong>
        <p style={{ color: "#725c35", lineHeight: 1.5, marginBottom: 0 }}>
          O módulo de produtos está em fase de validação. Não há ofertas públicas,
          pagamentos ou integrações financeiras habilitadas nesta versão.
        </p>
      </section>
      <h2 style={{ fontSize: 22, marginBottom: 16 }}>Etapas da implantação</h2>
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 280px), 1fr))",
        gap: 16,
      }}>
        {stages.map(stage => (
          <article key={stage.name} style={{
            background: "#fff", border: "1px solid #dfe6ed",
            padding: 20, borderRadius: 12, minWidth: 0,
          }}>
            <h3 style={{ margin: "0 0 8px", fontSize: 18 }}>{stage.name}</h3>
            <p style={{ fontSize: 12, fontWeight: 800, color: "#886410" }}>
              {stage.status}
            </p>
            <p style={{ fontSize: 14, color: "#475569", lineHeight: 1.5 }}>
              {stage.description}
            </p>
            {"href" in stage && stage.href ? (
              <Link href={stage.href} style={{ color: "#173c71", fontWeight: 750 }}>
                {"href" in stage && stage.href.endsWith("/materiais") ? "Abrir biblioteca de materiais" : stage.href.endsWith("/ofertas") ? "Abrir ofertas e preços" : "Abrir cadastro de produtos"}
              </Link>
            ) : (
              <span style={{ fontSize: 13, color: "#64748b" }}>
                Disponível em uma próxima etapa
              </span>
            )}
          </article>
        ))}
      </div>
    </main>
  );
}
