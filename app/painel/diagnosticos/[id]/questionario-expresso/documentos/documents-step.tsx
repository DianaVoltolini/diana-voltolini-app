// app/painel/diagnosticos/[id]/questionario-expresso/documentos/documents-step.tsx

"use client";

import type {
  ChangeEvent,
} from "react";

import {
  useRef,
  useState,
} from "react";

import Link from "next/link";

import { useRouter } from "next/navigation";

import { createClient } from "@/lib/supabase/client";

import {
  registerExpressDocument,
  removeExpressDocument,
} from "./actions";

import styles from "./documentos.module.css";

type ExpressDocumentItem = {
  id: string;
  fileName: string;
  sizeBytes: number | null;
  signedUrl: string | null;
  operationType: string;
  whySelected: string;
  ibsCbsTested: string;
  importantNotes: string;
  hasRejection: boolean;
  rejectionDescription: string;
};

type DocumentsStepProps = {
  diagnosticId: string;
  userId: string;
  documentLimit: number;
  documents: ExpressDocumentItem[];
};

const operationOptions = [
  {
    value: "venda_mercadoria",
    label: "Venda de mercadoria",
  },
  {
    value: "venda_producao_propria",
    label: "Venda de produção própria",
  },
  {
    value: "devolucao_venda",
    label: "Devolução de venda",
  },
  {
    value: "devolucao_compra",
    label: "Devolução de compra",
  },
  {
    value: "remessa_conserto",
    label: "Remessa para conserto",
  },
  {
    value: "retorno_conserto",
    label: "Retorno de conserto",
  },
  {
    value: "demonstracao",
    label: "Demonstração",
  },
  {
    value: "industrializacao",
    label: "Industrialização",
  },
  {
    value: "entrega_futura",
    label: "Venda ou entrega futura",
  },
  {
    value: "outra",
    label: "Outra operação",
  },
];

const operationLabels =
  Object.fromEntries(
    operationOptions.map(
      (item) => [
        item.value,
        item.label,
      ],
    ),
  );

const testedLabels: Record<
  string,
  string
> = {
  sim: "Sim",
  nao: "Não",
  parcialmente: "Parcialmente",
  nao_sei: "Não sei",
};

function sanitizeFileName(
  fileName: string,
) {
  return fileName
    .normalize("NFD")
    .replace(
      /[\u0300-\u036f]/g,
      "",
    )
    .replace(
      /[^a-zA-Z0-9._-]/g,
      "-",
    )
    .replace(/-+/g, "-");
}

function formatFileSize(
  sizeBytes: number | null,
) {
  if (
    sizeBytes === null ||
    sizeBytes === undefined
  ) {
    return "Tamanho não informado";
  }

  if (
    sizeBytes <
    1024
  ) {
    return `${sizeBytes} bytes`;
  }

  if (
    sizeBytes <
    1024 * 1024
  ) {
    return `${(
      sizeBytes / 1024
    ).toFixed(1)} KB`;
  }

  return `${(
    sizeBytes /
    (1024 * 1024)
  ).toFixed(2)} MB`;
}

export default function DocumentsStep({
  diagnosticId,
  userId,
  documentLimit,
  documents,
}: DocumentsStepProps) {
  const router =
    useRouter();

  const fileInputRef =
    useRef<HTMLInputElement>(
      null,
    );

  const [
    selectedFile,
    setSelectedFile,
  ] =
    useState<File | null>(
      null,
    );

  const [
    operationType,
    setOperationType,
  ] =
    useState("");

  const [
    whySelected,
    setWhySelected,
  ] =
    useState("");

  const [
    ibsCbsTested,
    setIbsCbsTested,
  ] =
    useState("");

  const [
    importantNotes,
    setImportantNotes,
  ] =
    useState("");

  const [
    hasRejection,
    setHasRejection,
  ] =
    useState("nao");

  const [
    rejectionDescription,
    setRejectionDescription,
  ] =
    useState("");

  const [
    processing,
    setProcessing,
  ] =
    useState(false);

  const [
    feedback,
    setFeedback,
  ] =
    useState<{
      type:
        | "success"
        | "error";
      message: string;
    } | null>(null);

  const availableSlots =
    Math.max(
      0,
      documentLimit -
        documents.length,
    );

  function handleFile(
    event:
      ChangeEvent<HTMLInputElement>,
  ) {
    const file =
      event.target.files?.[0] ??
      null;

    setSelectedFile(file);
    setFeedback(null);
  }

  function resetForm() {
    setSelectedFile(null);
    setOperationType("");
    setWhySelected("");
    setIbsCbsTested("");
    setImportantNotes("");
    setHasRejection("nao");
    setRejectionDescription("");

    if (
      fileInputRef.current
    ) {
      fileInputRef.current.value =
        "";
    }
  }

  async function handleUpload() {
    if (!selectedFile) {
      setFeedback({
        type: "error",
        message:
          "Selecione o arquivo XML.",
      });

      return;
    }

    if (!operationType) {
      setFeedback({
        type: "error",
        message:
          "Selecione a operação representada pelo XML.",
      });

      return;
    }

    if (!whySelected.trim()) {
      setFeedback({
        type: "error",
        message:
          "Informe por que esta NF-e foi escolhida.",
      });

      return;
    }

    if (!ibsCbsTested) {
      setFeedback({
        type: "error",
        message:
          "Informe se a operação já foi testada com IBS/CBS.",
      });

      return;
    }

    if (
      hasRejection ===
        "sim" &&
      !rejectionDescription.trim()
    ) {
      setFeedback({
        type: "error",
        message:
          "Informe o erro ou rejeição apresentada.",
      });

      return;
    }

    if (
      !selectedFile.name
        .toLowerCase()
        .endsWith(".xml")
    ) {
      setFeedback({
        type: "error",
        message:
          "O arquivo selecionado deve estar no formato XML.",
      });

      return;
    }

    if (
      selectedFile.size >
      15 * 1024 * 1024
    ) {
      setFeedback({
        type: "error",
        message:
          "O XML deve possuir no máximo 15 MB.",
      });

      return;
    }

    if (
      availableSlots <= 0
    ) {
      setFeedback({
        type: "error",
        message:
          "O limite de XMLs já foi atingido.",
      });

      return;
    }

    setProcessing(true);
    setFeedback(null);

    const supabase =
      createClient();

    const safeName =
      sanitizeFileName(
        selectedFile.name,
      );

    const storagePath =
      `${userId}/${diagnosticId}/${Date.now()}-${crypto.randomUUID()}-${safeName}`;

    try {
      const {
        error: uploadError,
      } = await supabase.storage
        .from(
          "diagnostic-documents",
        )
        .upload(
          storagePath,
          selectedFile,
          {
            cacheControl:
              "3600",

            upsert:
              false,

            contentType:
              selectedFile.type ||
              "application/xml",
          },
        );

      if (uploadError) {
        throw new Error(
          uploadError.message,
        );
      }

      const result =
        await registerExpressDocument(
          {
            diagnosticId,

            fileName:
              selectedFile.name,

            storagePath,

            mimeType:
              selectedFile.type ||
              "application/xml",

            sizeBytes:
              selectedFile.size,

            operationType,

            whySelected:
              whySelected.trim(),

            ibsCbsTested,

            importantNotes:
              importantNotes.trim(),

            hasRejection:
              hasRejection ===
              "sim",

            rejectionDescription:
              rejectionDescription.trim(),
          },
        );

      if (!result.ok) {
        await supabase.storage
          .from(
            "diagnostic-documents",
          )
          .remove([
            storagePath,
          ]);

        throw new Error(
          result.error ||
            "Não foi possível registrar o XML.",
        );
      }

      resetForm();

      setFeedback({
        type: "success",
        message:
          "XML e informações da operação salvos com sucesso.",
      });

      router.refresh();
    } catch (error) {
      setFeedback({
        type: "error",
        message:
          error instanceof Error
            ? error.message
            : "Não foi possível enviar o XML.",
      });
    } finally {
      setProcessing(false);
    }
  }

  async function handleRemove(
    documentId: string,
  ) {
    const confirmed =
      window.confirm(
        "Confirma a exclusão deste XML e das informações vinculadas?",
      );

    if (!confirmed) {
      return;
    }

    setProcessing(true);
    setFeedback(null);

    const result =
      await removeExpressDocument(
        {
          diagnosticId,
          documentId,
        },
      );

    if (!result.ok) {
      setFeedback({
        type: "error",
        message:
          result.error ||
          "Não foi possível excluir o XML.",
      });
    } else {
      setFeedback({
        type: "success",
        message:
          "XML excluído.",
      });

      router.refresh();
    }

    setProcessing(false);
  }

  return (
    <article
      className={styles.card}
    >
      <header
        className={
          styles.header
        }
      >
        <div>
          <span>
            Etapa 3 de 5
          </span>

          <h2>
            NF-e para análise
          </h2>

          <p>
            Para cada XML, informe o
            contexto da operação. Os
            dados técnicos da NF-e
            serão obtidos diretamente
            do arquivo.
          </p>
        </div>

        <div
          className={
            styles.counter
          }
        >
          <strong>
            {documents.length} de{" "}
            {documentLimit}
          </strong>

          <small>
            XMLs adicionados
          </small>
        </div>
      </header>

      {feedback ? (
        <div
          className={
            feedback.type ===
            "success"
              ? styles.success
              : styles.error
          }
        >
          {feedback.message}
        </div>
      ) : null}

      {availableSlots > 0 ? (
        <section
          className={
            styles.uploadSection
          }
        >
          <h3>
            Adicionar NF-e
          </h3>

          <div
            className={
              styles.formGrid
            }
          >
            <label
              className={
                styles.fullField
              }
            >
              <span>
                Arquivo XML *
              </span>

              <input
                ref={fileInputRef}
                type="file"
                accept=".xml,application/xml,text/xml"
                disabled={
                  processing
                }
                onChange={
                  handleFile
                }
              />

              <small>
                Envie um arquivo por
                vez. Limite de 15 MB.
              </small>
            </label>

            <label>
              <span>
                Operação representada *
              </span>

              <select
                value={
                  operationType
                }
                disabled={
                  processing
                }
                onChange={(event) =>
                  setOperationType(
                    event.target
                      .value,
                  )
                }
              >
                <option value="">
                  Selecione
                </option>

                {operationOptions.map(
                  (option) => (
                    <option
                      key={
                        option.value
                      }
                      value={
                        option.value
                      }
                    >
                      {
                        option.label
                      }
                    </option>
                  ),
                )}
              </select>
            </label>

            <label>
              <span>
                Já foi testada com
                IBS/CBS? *
              </span>

              <select
                value={
                  ibsCbsTested
                }
                disabled={
                  processing
                }
                onChange={(event) =>
                  setIbsCbsTested(
                    event.target
                      .value,
                  )
                }
              >
                <option value="">
                  Selecione
                </option>

                <option value="sim">
                  Sim
                </option>

                <option value="nao">
                  Não
                </option>

                <option value="parcialmente">
                  Parcialmente
                </option>

                <option value="nao_sei">
                  Não sei
                </option>
              </select>
            </label>

            <label
              className={
                styles.fullField
              }
            >
              <span>
                Por que esta NF-e foi
                escolhida? *
              </span>

              <textarea
                value={
                  whySelected
                }
                disabled={
                  processing
                }
                onChange={(event) =>
                  setWhySelected(
                    event.target
                      .value,
                  )
                }
                placeholder="Exemplo: é uma operação frequente da empresa e ainda existem dúvidas sobre a configuração do IBS/CBS."
              />
            </label>

            <label
              className={
                styles.fullField
              }
            >
              <span>
                Dúvida ou informação
                importante sobre esta
                nota
              </span>

              <textarea
                value={
                  importantNotes
                }
                disabled={
                  processing
                }
                onChange={(event) =>
                  setImportantNotes(
                    event.target
                      .value,
                  )
                }
                placeholder="Campo opcional."
              />
            </label>

            <label>
              <span>
                Houve erro ou
                rejeição?
              </span>

              <select
                value={
                  hasRejection
                }
                disabled={
                  processing
                }
                onChange={(event) =>
                  setHasRejection(
                    event.target
                      .value,
                  )
                }
              >
                <option value="nao">
                  Não
                </option>

                <option value="sim">
                  Sim
                </option>
              </select>
            </label>

            {hasRejection ===
            "sim" ? (
              <label>
                <span>
                  Erro ou rejeição *
                </span>

                <textarea
                  value={
                    rejectionDescription
                  }
                  disabled={
                    processing
                  }
                  onChange={(event) =>
                    setRejectionDescription(
                      event.target
                        .value,
                    )
                  }
                  placeholder="Informe o código e a mensagem apresentada."
                />
              </label>
            ) : null}
          </div>

          <button
            className={
              styles.uploadButton
            }
            type="button"
            disabled={
              processing
            }
            onClick={
              handleUpload
            }
          >
            {processing
              ? "Salvando..."
              : "Adicionar XML e salvar operação"}
          </button>
        </section>
      ) : (
        <div
          className={
            styles.limitNotice
          }
        >
          O limite de XMLs deste
          diagnóstico foi atingido.
        </div>
      )}

      <section
        className={
          styles.listSection
        }
      >
        <header>
          <h3>
            NF-e adicionadas
          </h3>

          <span>
            Cada arquivo está vinculado
            às informações da operação.
          </span>
        </header>

        {documents.length > 0 ? (
          <div
            className={
              styles.documentList
            }
          >
            {documents.map(
              (document) => (
                <article
                  key={
                    document.id
                  }
                  className={
                    styles.documentItem
                  }
                >
                  <div
                    className={
                      styles.documentMain
                    }
                  >
                    <strong>
                      {
                        document.fileName
                      }
                    </strong>

                    <span>
                      {operationLabels[
                        document.operationType
                      ] ??
                        document.operationType}
                    </span>

                    <small>
                      {formatFileSize(
                        document.sizeBytes,
                      )}
                    </small>

                    <dl>
                      <div>
                        <dt>
                          Motivo da escolha
                        </dt>

                        <dd>
                          {
                            document.whySelected
                          }
                        </dd>
                      </div>

                      <div>
                        <dt>
                          Teste IBS/CBS
                        </dt>

                        <dd>
                          {testedLabels[
                            document.ibsCbsTested
                          ] ??
                            document.ibsCbsTested}
                        </dd>
                      </div>

                      {document.importantNotes ? (
                        <div>
                          <dt>
                            Informação
                            importante
                          </dt>

                          <dd>
                            {
                              document.importantNotes
                            }
                          </dd>
                        </div>
                      ) : null}

                      {document.hasRejection ? (
                        <div>
                          <dt>
                            Erro ou
                            rejeição
                          </dt>

                          <dd>
                            {
                              document.rejectionDescription
                            }
                          </dd>
                        </div>
                      ) : null}
                    </dl>
                  </div>

                  <div
                    className={
                      styles.documentActions
                    }
                  >
                    {document.signedUrl ? (
                      <a
                        href={
                          document.signedUrl
                        }
                        target="_blank"
                        rel="noreferrer"
                      >
                        Abrir XML
                      </a>
                    ) : null}

                    <button
                      type="button"
                      disabled={
                        processing
                      }
                      onClick={() =>
                        handleRemove(
                          document.id,
                        )
                      }
                    >
                      Excluir
                    </button>
                  </div>
                </article>
              ),
            )}
          </div>
        ) : (
          <div
            className={
              styles.emptyState
            }
          >
            Nenhum XML foi adicionado.
          </div>
        )}
      </section>

      <footer
        className={
          styles.footer
        }
      >
        <Link
          href={`/painel/diagnosticos/${diagnosticId}/questionario-expresso/preparacao`}
        >
          Voltar
        </Link>

        <div
          style={{
            display:
              "flex",
            alignItems:
              "center",
            justifyContent:
              "flex-end",
            gap:
              "18px",
            flexWrap:
              "wrap",
          }}
        >
          <div
            style={{
              display:
                "grid",
              justifyItems:
                "end",
            }}
          >
            <strong>
              Salvamento automático
            </strong>

            <span>
              Cada XML é salvo no momento
              em que é adicionado.
            </span>
          </div>

          {documents.length > 0 ? (
            <Link
              href={`/painel/diagnosticos/${diagnosticId}/questionario-expresso/orientacao`}
              style={{
                display:
                  "inline-flex",
                minHeight:
                  "45px",
                alignItems:
                  "center",
                justifyContent:
                  "center",
                border:
                  "1px solid #c9a227",
                borderRadius:
                  "8px",
                background:
                  "#c9a227",
                color:
                  "#0d1b2a",
                padding:
                  "0 20px",
                fontSize:
                  "0.86rem",
                fontWeight:
                  "800",
                whiteSpace:
                  "nowrap",
              }}
            >
              Salvar e continuar
            </Link>
          ) : null}
        </div>
      </footer>
    </article>
  );
}