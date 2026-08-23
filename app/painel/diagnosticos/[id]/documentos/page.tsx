// app/painel/diagnosticos/[id]/documentos/page.tsx

import type { Metadata } from "next";

import Image from "next/image";
import Link from "next/link";

import {
  notFound,
  redirect,
} from "next/navigation";

import { createClient } from "@/lib/supabase/server";

import { logout } from "../../../actions";

import DocumentsManager from "./documents-manager";

import styles from "./documentos.module.css";

export const metadata: Metadata = {
  title: "Documentos do diagnóstico",
};

export const dynamic =
  "force-dynamic";

type DocumentsPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function DocumentsPage({
  params,
}: DocumentsPageProps) {
  const { id } = await params;

  const supabase =
    await createClient();

  const { data: claimsData } =
    await supabase.auth.getClaims();

  const userId =
    typeof claimsData?.claims?.sub ===
    "string"
      ? claimsData.claims.sub
      : null;

  if (!userId) {
    redirect("/login");
  }

  const {
    data: diagnostic,
    error: diagnosticError,
  } = await supabase
    .from("diagnostics")
    .select(
      `
        id,
        code,
        status,
        document_limit,
        company_id,
        user_id
      `,
    )
    .eq("id", id)
    .eq("user_id", userId)
    .maybeSingle();

  if (
    diagnosticError ||
    !diagnostic
  ) {
    notFound();
  }

  const [
    { data: company },
    {
      data: documents,
      error: documentsError,
    },
  ] = await Promise.all([
    supabase
      .from("companies")
      .select(
        "legal_name, trade_name, cnpj",
      )
      .eq(
        "id",
        diagnostic.company_id,
      )
      .maybeSingle(),

    supabase
      .from(
        "diagnostic_documents",
      )
      .select(
        `
          id,
          category,
          file_name,
          storage_path,
          size_bytes,
          counts_toward_limit,
          status,
          review_note,
          created_at
        `,
      )
      .eq(
        "diagnostic_id",
        diagnostic.id,
      )
      .order("created_at", {
        ascending: true,
      }),
  ]);

  if (documentsError) {
    console.error(
      "Erro ao carregar documentos:",
      documentsError,
    );
  }

  const documentsWithUrls =
    await Promise.all(
      (documents ?? []).map(
        async (document) => {
          const { data } =
            await supabase.storage
              .from(
                "diagnostic-documents",
              )
              .createSignedUrl(
                document.storage_path,
                600,
              );

          return {
            id: document.id,
            category:
              document.category,
            fileName:
              document.file_name,
            sizeBytes:
              document.size_bytes,
            status:
              document.status,
            reviewNote:
              document.review_note,
            countsTowardLimit:
              document.counts_toward_limit,
            createdAt:
              document.created_at,
            signedUrl:
              data?.signedUrl ??
              null,
          };
        },
      ),
    );

  const mainDocumentCount =
    documentsWithUrls.filter(
      (document) =>
        document.countsTowardLimit &&
        document.status !==
          "rejected",
    ).length;

  const canEdit = [
    "awaiting_documents",
    "client_action_required",
  ].includes(
    diagnostic.status,
  );

  const canFinalize =
    diagnostic.status ===
    "awaiting_documents";

  const companyName =
    company?.trade_name ||
    company?.legal_name ||
    "Empresa não informada";

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <div
          className={`container ${styles.headerContent}`}
        >
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

          <div
            className={
              styles.headerActions
            }
          >
            <Link
              className={
                styles.backButton
              }
              href={`/painel/diagnosticos/${diagnostic.id}`}
            >
              Voltar ao diagnóstico
            </Link>

            <form action={logout}>
              <button
                className={
                  styles.logoutButton
                }
                type="submit"
              >
                Sair
              </button>
            </form>
          </div>
        </div>
      </header>

      <section
        className={styles.content}
      >
        <div className="container">
          <nav
            className={
              styles.breadcrumb
            }
          >
            <Link href="/painel">
              Meu painel
            </Link>

            <span>/</span>

            <Link
              href={`/painel/diagnosticos/${diagnostic.id}`}
            >
              {diagnostic.code}
            </Link>

            <span>/</span>

            <strong>
              Documentos
            </strong>
          </nav>

          <header
            className={styles.hero}
          >
            <div>
              <p
                className={
                  styles.eyebrow
                }
              >
                Diagnóstico Expresso
                IBS/CBS
              </p>

              <h1>
                Documentos e XMLs
              </h1>

              <p>
                Envie e acompanhe os
                arquivos utilizados na
                análise do diagnóstico.
              </p>
            </div>

            <div
              className={
                styles.summary
              }
            >
              <span>
                Empresa
              </span>

              <strong>
                {companyName}
              </strong>

              <small>
                {company?.cnpj ||
                  "CNPJ não informado"}
              </small>
            </div>
          </header>

          {diagnostic.status ===
          "client_action_required" ? (
            <section
              className={
                styles.pendingNotice
              }
            >
              <strong>
                Complemento solicitado
              </strong>

              <p>
                Envie ou substitua os
                arquivos solicitados pela
                equipe responsável. Depois,
                responda à mensagem na
                página do diagnóstico.
              </p>
            </section>
          ) : null}

          <section
            className={
              styles.limitCard
            }
          >
            <div>
              <span>
                XMLs principais
              </span>

              <strong>
                {mainDocumentCount} de{" "}
                {
                  diagnostic.document_limit
                }
              </strong>
            </div>

            <p>
              Documentos de apoio não
              consomem o limite de XMLs
              principais.
            </p>
          </section>

          <DocumentsManager
            diagnosticId={
              diagnostic.id
            }
            userId={userId}
            documentLimit={
              diagnostic.document_limit
            }
            mainDocumentCount={
              mainDocumentCount
            }
            canEdit={canEdit}
            canFinalize={
              canFinalize
            }
            documents={
              documentsWithUrls
            }
          />
        </div>
      </section>
    </main>
  );
}