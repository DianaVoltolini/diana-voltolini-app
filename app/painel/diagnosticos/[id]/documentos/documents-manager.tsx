// app/painel/diagnosticos/[id]/documentos/documents-manager.tsx

"use client";

import type {
  ChangeEvent,
} from "react";

import {
  useMemo,
  useState,
} from "react";

import { useRouter } from "next/navigation";

import { createClient } from "@/lib/supabase/client";

import {
  finalizeDocuments,
  registerUploadedDocument,
  removeDocument,
  type DocumentCategory,
} from "./actions";

import styles from "./documentos.module.css";

type DocumentItem = {
  id: string;
  category: string;
  fileName: string;
  sizeBytes: number | null;
  status: string;
  reviewNote: string | null;
  countsTowardLimit: boolean;
  createdAt: string;
  signedUrl: string | null;
};

type DocumentsManagerProps = {
  diagnosticId: string;
  userId: string;
  documentLimit: number;
  mainDocumentCount: number;
  canEdit: boolean;
  canFinalize: boolean;
  documents: DocumentItem[];
};

const categories: Array<{
  value: DocumentCategory;
  label: string;
  description: string;
}> = [
  {
    value: "xml",
    label: "XML principal",
    description:
      "Conta no limite contratado.",
  },
  {
    value: "danfe",
    label: "DANFE ou nota original",
    description:
      "Documento complementar.",
  },
  {
    value: "erp_evidence",
    label: "Confirmação do ERP",
    description:
      "Print, PDF ou comunicado.",
  },
  {
    value:
      "accounting_guidance",
    label:
      "Orientação da contabilidade",
    description:
      "Confirmação de classificação ou tratamento.",
  },
  {
    value: "parameterization",
    label:
      "Parametrização ou cadastro",
    description:
      "Evidência de configuração.",
  },
  {
    value:
      "rejection_evidence",
    label:
      "Rejeição ou mensagem de erro",
    description:
      "Print, PDF ou XML.",
  },
  {
    value: "procedure",
    label:
      "Procedimento interno",
    description:
      "Instrução ou processo da empresa.",
  },
  {
    value: "other",
    label:
      "Outro documento de apoio",
    description:
      "Material complementar.",
  },
];

const categoryLabels =
  Object.fromEntries(
    categories.map(
      (category) => [
        category.value,
        category.label,
      ],
    ),
  );

const statusLabels: Record<
  string,
  string
> = {
  uploaded: "Recebido",
  under_review:
    "Em conferência",
  approved: "Aprovado",
  rejected:
    "Substituição necessária",
};

function formatFileSize(
  sizeBytes: number | null,
) {
  if (
    sizeBytes === null ||
    sizeBytes === undefined
  ) {
    return "Tamanho não informado";
  }

  if (sizeBytes < 1024) {
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

function formatDate(value: string) {
  return new Intl.DateTimeFormat(
    "pt-BR",
    {
      dateStyle: "short",
      timeStyle: "short",
    },
  ).format(new Date(value));
}

function sanitizeFileName(
  fileName: string,
) {
  const sanitized = fileName
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

  return (
    sanitized ||
    "arquivo-sem-nome"
  );
}

function isXmlFile(file: File) {
  return (
    file.name
      .toLowerCase()
      .endsWith(".xml") ||
    file.type ===
      "application/xml" ||
    file.type === "text/xml"
  );
}

export default function DocumentsManager({
  diagnosticId,
  userId,
  documentLimit,
  mainDocumentCount,
  canEdit,
  canFinalize,
  documents,
}: DocumentsManagerProps) {
  const router = useRouter();

  const [category, setCategory] =
    useState<DocumentCategory>("xml");

  const [
    selectedFiles,
    setSelectedFiles,
  ] = useState<File[]>([]);

  const [
    processing,
    setProcessing,
  ] = useState(false);

  const [
    feedback,
    setFeedback,
  ] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  const availableMainSlots =
    Math.max(
      0,
      documentLimit -
        mainDocumentCount,
    );

  const categoryInformation =
    useMemo(
      () =>
        categories.find(
          (item) =>
            item.value === category,
        ),
      [category],
    );

  function handleFiles(
    event:
      ChangeEvent<HTMLInputElement>,
  ) {
    setSelectedFiles(
      Array.from(
        event.target.files ?? [],
      ),
    );

    setFeedback(null);
  }

  async function handleUpload() {
    if (
      !canEdit ||
      selectedFiles.length === 0
    ) {
      return;
    }

    if (
      category === "xml" &&
      selectedFiles.length >
        availableMainSlots
    ) {
      setFeedback({
        type: "error",
        message:
          `Existem somente ${availableMainSlots} vagas disponíveis para XMLs principais.`,
      });

      return;
    }

    for (
      const file of selectedFiles
    ) {
      if (
        file.size >
        15 * 1024 * 1024
      ) {
        setFeedback({
          type: "error",
          message:
            `O arquivo "${file.name}" ultrapassa o limite de 15 MB.`,
        });

        return;
      }

      if (
        category === "xml" &&
        !isXmlFile(file)
      ) {
        setFeedback({
          type: "error",
          message:
            `O arquivo "${file.name}" não é um XML válido.`,
        });

        return;
      }
    }

    setProcessing(true);
    setFeedback(null);

    const supabase =
      createClient();

    try {
      for (
        const file of selectedFiles
      ) {
        const safeName =
          sanitizeFileName(
            file.name,
          );

        const storagePath =
          `${userId}/${diagnosticId}/${Date.now()}-${crypto.randomUUID()}-${safeName}`;

        const {
          error: uploadError,
        } = await supabase.storage
          .from(
            "diagnostic-documents",
          )
          .upload(
            storagePath,
            file,
            {
              cacheControl: "3600",
              upsert: false,
              contentType:
                file.type ||
                "application/octet-stream",
            },
          );

        if (uploadError) {
          throw new Error(
            `Não foi possível enviar "${file.name}": ${uploadError.message}`,
          );
        }

        const result =
          await registerUploadedDocument(
            {
              diagnosticId,
              category,
              fileName: file.name,
              storagePath,
              mimeType:
                file.type ||
                "application/octet-stream",
              sizeBytes: file.size,
              countsTowardLimit:
                category === "xml",
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
              `Não foi possível registrar "${file.name}".`,
          );
        }
      }

      setSelectedFiles([]);

      setFeedback({
        type: "success",
        message:
          selectedFiles.length === 1
            ? "Documento enviado com sucesso."
            : "Documentos enviados com sucesso.",
      });

      const fileInput =
        document.getElementById(
          "diagnostic-files",
        ) as HTMLInputElement | null;

      if (fileInput) {
        fileInput.value = "";
      }

      router.refresh();
    } catch (error) {
      setFeedback({
        type: "error",
        message:
          error instanceof Error
            ? error.message
            : "Não foi possível enviar os documentos.",
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
        "Confirma a exclusão deste documento?",
      );

    if (!confirmed) {
      return;
    }

    setProcessing(true);
    setFeedback(null);

    const result =
      await removeDocument({
        diagnosticId,
        documentId,
      });

    if (!result.ok) {
      setFeedback({
        type: "error",
        message:
          result.error ||
          "Não foi possível excluir o documento.",
      });
    } else {
      setFeedback({
        type: "success",
        message:
          "Documento excluído.",
      });

      router.refresh();
    }

    setProcessing(false);
  }

  async function handleFinalize() {
    const confirmed =
      window.confirm(
        "Confirma que todos os documentos necessários foram enviados?",
      );

    if (!confirmed) {
      return;
    }

    setProcessing(true);
    setFeedback(null);

    const result =
      await finalizeDocuments(
        diagnosticId,
      );

    if (!result.ok) {
      setFeedback({
        type: "error",
        message:
          result.error ||
          "Não foi possível confirmar os documentos.",
      });

      setProcessing(false);
      return;
    }

    router.push(
      `/painel/diagnosticos/${diagnosticId}`,
    );

    router.refresh();
  }

  return (
    <div className={styles.manager}>
      {canEdit ? (
        <section
          className={
            styles.uploadCard
          }
        >
          <header>
            <p
              className={
                styles.eyebrow
              }
            >
              Novo envio
            </p>

            <h2>
              Adicionar documentos
            </h2>

            <p>
              Selecione a categoria e
              escolha os arquivos que
              deseja enviar.
            </p>
          </header>

          <div
            className={
              styles.uploadGrid
            }
          >
            <label>
              <span>
                Categoria do documento
              </span>

              <select
                value={category}
                disabled={processing}
                onChange={(event) =>
                  setCategory(
                    event.target
                      .value as DocumentCategory,
                  )
                }
              >
                {categories.map(
                  (item) => (
                    <option
                      key={item.value}
                      value={item.value}
                    >
                      {item.label}
                    </option>
                  ),
                )}
              </select>

              <small>
                {
                  categoryInformation?.description
                }
              </small>
            </label>

            <label>
              <span>
                Selecionar arquivos
              </span>

              <input
                id="diagnostic-files"
                type="file"
                multiple
                disabled={processing}
                accept={
                  category === "xml"
                    ? ".xml,application/xml,text/xml"
                    : ".xml,.pdf,.png,.jpg,.jpeg,application/xml,text/xml,application/pdf,image/png,image/jpeg"
                }
                onChange={
                  handleFiles
                }
              />

              <small>
                Limite de 15 MB por
                arquivo.
              </small>
            </label>
          </div>

          {selectedFiles.length >
          0 ? (
            <div
              className={
                styles.selectedFiles
              }
            >
              {selectedFiles.map(
                (file) => (
                  <span
                    key={`${file.name}-${file.size}`}
                  >
                    {file.name}
                  </span>
                ),
              )}
            </div>
          ) : null}

          <button
            className={
              styles.uploadButton
            }
            type="button"
            disabled={
              processing ||
              selectedFiles.length ===
                0
            }
            onClick={
              handleUpload
            }
          >
            {processing
              ? "Processando..."
              : "Enviar documentos"}
          </button>
        </section>
      ) : null}

      {feedback ? (
        <div
          className={
            feedback.type ===
            "success"
              ? styles.successMessage
              : styles.errorMessage
          }
          role={
            feedback.type ===
            "error"
              ? "alert"
              : "status"
          }
        >
          {feedback.message}
        </div>
      ) : null}

      <section
        className={
          styles.documentsCard
        }
      >
        <header
          className={
            styles.cardHeader
          }
        >
          <div>
            <p
              className={
                styles.eyebrow
              }
            >
              Arquivos enviados
            </p>

            <h2>
              Documentos do diagnóstico
            </h2>
          </div>

          <span>
            {documents.length}{" "}
            {documents.length === 1
              ? "arquivo"
              : "arquivos"}
          </span>
        </header>

        {documents.length > 0 ? (
          <div
            className={
              styles.documentList
            }
          >
            {documents.map(
              (documentItem) => (
                <article
                  key={
                    documentItem.id
                  }
                  className={
                    styles.documentItem
                  }
                >
                  <div
                    className={
                      styles.documentInformation
                    }
                  >
                    <strong>
                      {
                        documentItem.fileName
                      }
                    </strong>

                    <span>
                      {categoryLabels[
                        documentItem.category
                      ] ??
                        documentItem.category}
                    </span>

                    <small>
                      {formatFileSize(
                        documentItem.sizeBytes,
                      )}
                      {" • "}
                      {formatDate(
                        documentItem.createdAt,
                      )}
                    </small>

                    {documentItem.reviewNote ? (
                      <p
                        className={
                          styles.reviewNote
                        }
                      >
                        {
                          documentItem.reviewNote
                        }
                      </p>
                    ) : null}
                  </div>

                  <div
                    className={
                      styles.documentActions
                    }
                  >
                    <span
                      className={`${styles.documentStatus} ${
                        styles[
                          `documentStatus_${documentItem.status}`
                        ] ?? ""
                      }`}
                    >
                      {statusLabels[
                        documentItem.status
                      ] ??
                        documentItem.status}
                    </span>

                    {documentItem.signedUrl ? (
                      <a
                        href={
                          documentItem.signedUrl
                        }
                        target="_blank"
                        rel="noreferrer"
                      >
                        Abrir
                      </a>
                    ) : null}

                    {canEdit ? (
                      <button
                        type="button"
                        disabled={
                          processing
                        }
                        onClick={() =>
                          handleRemove(
                            documentItem.id,
                          )
                        }
                      >
                        Excluir
                      </button>
                    ) : null}
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
            Nenhum documento foi
            enviado.
          </div>
        )}
      </section>

      {canFinalize ? (
        <section
          className={
            styles.finalizeCard
          }
        >
          <div>
            <p
              className={
                styles.eyebrow
              }
            >
              Confirmação
            </p>

            <h2>
              Finalizar envio dos
              documentos
            </h2>

            <p>
              Confirme somente depois
              de enviar os XMLs
              principais e todos os
              documentos necessários.
            </p>
          </div>

          <button
            type="button"
            disabled={
              processing ||
              mainDocumentCount === 0
            }
            onClick={
              handleFinalize
            }
          >
            Confirmar documentos
          </button>
        </section>
      ) : null}
    </div>
  );
}