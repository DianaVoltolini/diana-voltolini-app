// app/torre/comercio-v2/page.tsx
import type { Metadata } from "next";
import Link from "next/link";
import { requireAdmin } from "@/lib/auth/require-admin";
import css from "./commercial.module.css";

export const metadata: Metadata = { title: "Área Comercial | Torre de Controle" };

const stages = [
  {
    name: "01 · Produtos",
    status: "Em validação",
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
    status: "Cadastro e prévia — homologação pendente",
    description: "Página de rascunho com produto, oferta e prévia restrita; publicação virá depois.",
    href: "/torre/comercio-v2/paginas",
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
    <main className={css.page}>
      <header className={css.header}>
        <div>
          <p className={css.eyebrow}>TORRE DE CONTROLE · ÁREA COMERCIAL</p>
          <h1 className={css.title}>Área Comercial</h1>
          <p className={css.subtitle}>Produtos, materiais, ofertas, páginas de vendas e checkout em um único lugar. Implantação independente das vendas atuais.</p>
        </div>
      </header>
      <div className={css.banner}>
        <strong>Ambiente de implantação — sem novas vendas</strong>
        As ofertas desta área continuam em rascunho. O checkout e as entregas atuais não são alterados.
      </div>
      <section className={css.section}>
        <h2>Etapas da implantação</h2>
        <div className={css.grid}>
          {stages.map(stage => (
            <article key={stage.name} className={css.card}>
              <h3>{stage.name}</h3>
              <p className={css.status}>{stage.status}</p>
              <p>{stage.description}</p>
              {"href" in stage && stage.href ? (
                <Link className={css.link} href={stage.href}>
                  {stage.href.endsWith("/materiais") ? "Abrir biblioteca de materiais" :
                   stage.href.endsWith("/ofertas") ? "Abrir ofertas e preços" : stage.href.endsWith("/paginas") ? "Abrir páginas de vendas" : "Abrir produtos"}
                </Link>
              ) : <span className={css.note}>Disponível em uma próxima etapa</span>}
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
