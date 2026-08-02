// app/painel/page.tsx

import type { Metadata } from "next";
import Image from "next/image";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

import { logout } from "./actions";
import styles from "./painel.module.css";

export const metadata: Metadata = {
  title: "Meu painel",
};

const statusLabels: Record<string, string> = {
  awaiting_questionnaire: "Aguardando questionário",
  awaiting_documents: "Aguardando documentos",
  documents_received: "Documentos recebidos",
  under_review: "Em análise",
  client_action_required: "Ação necessária",
  awaiting_approval: "Aguardando aprovação",
  completed: "Concluído",
  cancelled: "Cancelado",
};

export default async function PainelPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const [{ data: profile }, { data: diagnostics }] = await Promise.all([
    supabase
      .from("profiles")
      .select("full_name, email, role, status")
      .eq("id", user.id)
      .maybeSingle(),

    supabase
      .from("diagnostics")
      .select("id, code, status, created_at")
      .order("created_at", {
        ascending: false,
      })
      .limit(5),
  ]);

  const displayName =
    profile?.full_name?.trim() ||
    user.email?.split("@")[0] ||
    "Cliente";

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <div className={`container ${styles.headerContent}`}>
          <a
            href="https://dianavoltolini.com.br"
            aria-label="Acessar o site Diana Voltolini"
          >
            <Image
              className={styles.logo}
              src="/brand/logo-light.png"
              alt="Diana Voltolini"
              width={1535}
              height={538}
              priority
            />
          </a>

          <form action={logout}>
            <button className={styles.logoutButton} type="submit">
              Sair
            </button>
          </form>
        </div>
      </header>

      <section className={styles.content}>
        <div className="container">
          <header className={styles.welcome}>
            <p className={styles.eyebrow}>Área do cliente</p>

            <h1>Olá, {displayName}.</h1>

            <p>
              Acompanhe seus serviços, documentos, pendências e relatórios.
            </p>
          </header>

          <div className={styles.summaryGrid}>
            <article>
              <span>Serviços contratados</span>
              <strong>{diagnostics?.length ?? 0}</strong>
            </article>

            <article>
              <span>Em andamento</span>
              <strong>
                {diagnostics?.filter(
                  (item) =>
                    item.status !== "completed" &&
                    item.status !== "cancelled",
                ).length ?? 0}
              </strong>
            </article>

            <article>
              <span>Concluídos</span>
              <strong>
                {diagnostics?.filter(
                  (item) => item.status === "completed",
                ).length ?? 0}
              </strong>
            </article>
          </div>

          <section className={styles.diagnosticsSection}>
            <div className={styles.sectionHeader}>
              <div>
                <p className={styles.eyebrow}>Meus serviços</p>
                <h2>Diagnósticos</h2>
              </div>
            </div>

            {diagnostics && diagnostics.length > 0 ? (
              <div className={styles.diagnosticsList}>
                {diagnostics.map((diagnostic) => (
                  <article
                    className={styles.diagnosticCard}
                    key={diagnostic.id}
                  >
                    <div>
                      <span className={styles.diagnosticType}>
                        Diagnóstico Expresso IBS/CBS
                      </span>

                      <strong>{diagnostic.code}</strong>

                      <small>
                        Contratado em{" "}
                        {new Intl.DateTimeFormat("pt-BR").format(
                          new Date(diagnostic.created_at),
                        )}
                      </small>
                    </div>

                    <span
                      className={`${styles.status} ${
                        styles[`status_${diagnostic.status}`] ?? ""
                      }`}
                    >
                      {statusLabels[diagnostic.status] ??
                        diagnostic.status}
                    </span>
                  </article>
                ))}
              </div>
            ) : (
              <div className={styles.emptyState}>
                <h3>Nenhum serviço disponível</h3>

                <p>
                  Seus diagnósticos aparecerão aqui após a confirmação da
                  contratação e do pagamento.
                </p>

                <a href="https://dianavoltolini.com.br/diagnostico-ibs-cbs">
                  Conhecer o Diagnóstico Expresso IBS/CBS
                </a>
              </div>
            )}
          </section>
        </div>
      </section>
    </main>
  );
}