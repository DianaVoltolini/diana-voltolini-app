// C:\Users\Diana Voltolini\Documents\Aplicativo Saas\diana-app\lib\pdf\diagnostico-pdf.ts

import {
  PDFDocument,
  PDFImage,
  PDFFont,
  PDFPage,
  StandardFonts,
  rgb,
} from "pdf-lib";

export type DiagnosticPdfOperation = {
  fileName?: string;
  operation?: string;
  result?: string;
  documentConformity?: string;
  preparationStatus?: string;
  cfop?: string;

  operationIdentification?: string;
  evidenceFound?: string;
  calculationReview?: string;
  technicalFinding?: string;
  technicalBasis?: string;
  riskImpact?: string;
  recommendedAction?: string;
  responsibleParty?: string;
  closureEvidence?: string;

  /*
   * Compatibilidade com diagnósticos
   * produzidos antes da análise detalhada.
   */
  technicalAnalysis?: string;
  recommendation?: string;
};

export type DiagnosticPdfData = {
  code: string;
  companyName: string;
  cnpj?: string | null;
  city?: string | null;
  state?: string | null;
  taxRegime?: string | null;
  erpName?: string | null;
  completedAt?: string | null;
  classification?: string | null;
  generalAssessment?: string | null;
  strengths?: string | null;
  risks?: string | null;
  actionPlan?: string | null;
  finalOpinion?: string | null;
  limitation?: string | null;
  operations: DiagnosticPdfOperation[];
};

type GenerateDiagnosticPdfOptions = {
  data: DiagnosticPdfData;
  logoBytes?: Uint8Array | null;
};

type ParagraphOptions = {
  x?: number;
  size?: number;
  font?: PDFFont;
  color?: ReturnType<typeof rgb>;
  lineHeight?: number;
  maxWidth?: number;
  gapAfter?: number;
  paragraphGap?: number;
};

type DetailVariant =
  | "neutral"
  | "action";

const PAGE_WIDTH =
  595.28;

const PAGE_HEIGHT =
  841.89;

const MARGIN_X =
  48;

const CONTENT_TOP =
  700;

const BOTTOM_Y =
  76;

const CONTENT_WIDTH =
  PAGE_WIDTH -
  MARGIN_X * 2;

const NAVY = rgb(
  13 / 255,
  27 / 255,
  42 / 255,
);

const GOLD = rgb(
  201 / 255,
  162 / 255,
  39 / 255,
);

const GOLD_DARK = rgb(
  145 / 255,
  111 / 255,
  14 / 255,
);

const TEXT = rgb(
  65 / 255,
  79 / 255,
  94 / 255,
);

const MUTED = rgb(
  100 / 255,
  114 / 255,
  128 / 255,
);

const LIGHT = rgb(
  247 / 255,
  249 / 255,
  251 / 255,
);

const LIGHT_GOLD = rgb(
  252 / 255,
  248 / 255,
  235 / 255,
);

const BORDER = rgb(
  221 / 255,
  228 / 255,
  234 / 255,
);

const WHITE = rgb(
  1,
  1,
  1,
);

const classificationLabels:
  Record<string, string> = {
  prepared:
    "Empresa preparada",

  partially_prepared:
    "Empresa parcialmente preparada",

  not_prepared:
    "Empresa não preparada",
};

const operationResultLabels:
  Record<string, string> = {
  pending:
    "Não analisada",

  compliant:
    "Conforme",

  attention:
    "Requer atenção",

  critical:
    "Risco crítico",
};

const preparationStatusLabels:
  Record<string, string> = {
  pending:
    "Não avaliada",

  proven:
    "Comprovada para esta operação",

  partially_proven:
    "Parcialmente comprovada",

  not_proven:
    "Não comprovada",

  not_applicable:
    "Não aplicável para o cenário/data analisado",
};

const taxRegimeLabels:
  Record<string, string> = {
  mei:
    "MEI",

  simples:
    "Simples Nacional",

  simples_nacional:
    "Simples Nacional",

  lucro_presumido:
    "Lucro Presumido",

  lucro_real:
    "Lucro Real",

  normal:
    "Regime Normal",

  regime_normal:
    "Regime Normal",

  outro:
    "Outro",
};

const defaultLimitation =
  "O diagnóstico possui natureza operacional e documental, limitado aos arquivos, operações e informações fornecidos pela empresa. Não substitui parecer jurídico, auditoria fiscal completa, responsabilidade técnica da contabilidade ou responsabilidade do fornecedor do ERP.";

function normalizeText(
  value:
    | string
    | null
    | undefined,
) {
  if (!value) {
    return "";
  }

  return value
    .replace(
      /\u00a0/g,
      " ",
    )
    .replace(
      /[“”]/g,
      '"',
    )
    .replace(
      /[‘’]/g,
      "'",
    )
    .replace(
      /[–—]/g,
      "-",
    )
    .replace(
      /…/g,
      "...",
    )
    .replace(
      /[^\x0A\x0D\x20-\x7E\u00A0-\u00FF]/g,
      "",
    )
    .trim();
}

function formatDate(
  value:
    | string
    | null
    | undefined,
) {
  if (!value) {
    return "Não informado";
  }

  const date =
    new Date(
      value,
    );

  if (
    Number.isNaN(
      date.getTime(),
    )
  ) {
    return "Não informado";
  }

  return new Intl.DateTimeFormat(
    "pt-BR",
  ).format(
    date,
  );
}

function formatCnpj(
  value:
    | string
    | null
    | undefined,
) {
  const digits =
    (
      value ||
      ""
    ).replace(
      /\D/g,
      "",
    );

  if (
    digits.length !==
    14
  ) {
    return (
      value ||
      "Não informado"
    );
  }

  return digits.replace(
    /^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/,
    "$1.$2.$3/$4-$5",
  );
}

function formatTaxRegime(
  value:
    | string
    | null
    | undefined,
) {
  const normalized =
    normalizeText(
      value,
    );

  if (!normalized) {
    return "";
  }

  const key =
    normalized
      .toLocaleLowerCase(
        "pt-BR",
      )
      .replace(
        /\s+/g,
        "_",
      );

  return (
    taxRegimeLabels[
      key
    ] ||
    normalized
      .replaceAll(
        "_",
        " ",
      )
      .replace(
        /^\w/,
        (
          character,
        ) =>
          character.toUpperCase(),
      )
  );
}

function extractNatureOperation(
  value:
    | string
    | null
    | undefined,
) {
  const normalized =
    normalizeText(
      value,
    );

  if (!normalized) {
    return "";
  }

  const lines =
    normalized
      .split(
        /\r?\n/,
      )
      .map(
        (
          line,
        ) =>
          line.trim(),
      )
      .filter(
        Boolean,
      );

  const natureLine =
    lines.find(
      (
        line,
      ) =>
        line
          .toLocaleLowerCase(
            "pt-BR",
          )
          .startsWith(
            "natureza da operação:",
          ),
    );

  if (!natureLine) {
    return "";
  }

  return natureLine
    .replace(
      /^natureza da operação:\s*/i,
      "",
    )
    .trim();
}

function breakLongWord(
  word: string,
  font: PDFFont,
  size: number,
  maxWidth: number,
) {
  const parts:
    string[] = [];

  let current =
    "";

  for (
    const character
    of word
  ) {
    const candidate =
      `${current}${character}`;

    if (
      current &&
      font.widthOfTextAtSize(
        candidate,
        size,
      ) >
        maxWidth
    ) {
      parts.push(
        current,
      );

      current =
        character;
    } else {
      current =
        candidate;
    }
  }

  if (current) {
    parts.push(
      current,
    );
  }

  return parts;
}

function wrapText(
  value: string,
  font: PDFFont,
  size: number,
  maxWidth: number,
) {
  const text =
    normalizeText(
      value,
    );

  if (!text) {
    return [
      "Não informado.",
    ];
  }

  const lines:
    string[] = [];

  const sourceLines =
    text.split(
      /\r?\n/,
    );

  sourceLines.forEach(
    (
      sourceLine,
    ) => {
      const paragraph =
        sourceLine.trim();

      /*
       * Uma linha vazia real do texto gera
       * apenas um marcador de respiro.
       *
       * Não adicionamos mais uma linha vazia
       * depois de TODA quebra de linha.
       */
      if (!paragraph) {
        if (
          lines.length >
            0 &&
          lines[
            lines.length -
              1
          ] !==
            ""
        ) {
          lines.push(
            "",
          );
        }

        return;
      }

      const words =
        paragraph
          .split(
            /\s+/,
          )
          .filter(
            Boolean,
          );

      let current =
        "";

      words.forEach(
        (
          originalWord,
        ) => {
          const wordParts =
            font.widthOfTextAtSize(
              originalWord,
              size,
            ) >
            maxWidth
              ? breakLongWord(
                  originalWord,
                  font,
                  size,
                  maxWidth,
                )
              : [
                  originalWord,
                ];

          wordParts.forEach(
            (
              word,
            ) => {
              const candidate =
                current
                  ? `${current} ${word}`
                  : word;

              if (
                font.widthOfTextAtSize(
                  candidate,
                  size,
                ) <=
                maxWidth
              ) {
                current =
                  candidate;

                return;
              }

              if (current) {
                lines.push(
                  current,
                );
              }

              current =
                word;
            },
          );
        },
      );

      if (current) {
        lines.push(
          current,
        );
      }
    },
  );

  while (
    lines.length >
      0 &&
    lines[
      lines.length -
        1
    ] ===
      ""
  ) {
    lines.pop();
  }

  return lines.length >
    0
    ? lines
    : [
        "Não informado.",
      ];
}

export async function generateDiagnosticPdf({
  data,
  logoBytes,
}: GenerateDiagnosticPdfOptions) {
  const pdf =
    await PDFDocument.create();

  const regular =
    await pdf.embedFont(
      StandardFonts.Helvetica,
    );

  const bold =
    await pdf.embedFont(
      StandardFonts.HelveticaBold,
    );

  let logo:
    | PDFImage
    | null =
    null;

  if (
    logoBytes &&
    logoBytes.length >
      0
  ) {
    try {
      logo =
        await pdf.embedPng(
          logoBytes,
        );
    } catch {
      logo =
        null;
    }
  }

  function drawPageHeader(
    currentPage:
      PDFPage,
  ) {
    if (logo) {
      const dimensions =
        logo.scale(
          1,
        );

      const width =
        150;

      const height =
        width *
        (
          dimensions.height /
          dimensions.width
        );

      currentPage.drawImage(
        logo,
        {
          x:
            MARGIN_X,

          y:
            PAGE_HEIGHT -
            42 -
            height,

          width,

          height,
        },
      );
    } else {
      currentPage.drawText(
        "DIANA VOLTOLINI",
        {
          x:
            MARGIN_X,

          y:
            PAGE_HEIGHT -
            53,

          size:
            14,

          font:
            bold,

          color:
            NAVY,
        },
      );
    }

    const headerTitle =
      "DIAGNÓSTICO EXPRESSO IBS/CBS";

    const titleWidth =
      bold.widthOfTextAtSize(
        headerTitle,
        7.2,
      );

    currentPage.drawText(
      headerTitle,
      {
        x:
          PAGE_WIDTH -
          MARGIN_X -
          titleWidth,

        y:
          PAGE_HEIGHT -
          49,

        size:
          7.2,

        font:
          bold,

        color:
          GOLD_DARK,
      },
    );

    currentPage.drawLine({
      start: {
        x:
          MARGIN_X,

        y:
          742,
      },

      end: {
        x:
          PAGE_WIDTH -
          MARGIN_X,

        y:
          742,
      },

      thickness:
        1,

      color:
        BORDER,
    });

    currentPage.drawLine({
      start: {
        x:
          MARGIN_X,

        y:
          742,
      },

      end: {
        x:
          MARGIN_X +
          68,

        y:
          742,
      },

      thickness:
        2.3,

      color:
        GOLD,
    });
  }

  function createPage() {
    const newPage =
      pdf.addPage([
        PAGE_WIDTH,
        PAGE_HEIGHT,
      ]);

    drawPageHeader(
      newPage,
    );

    return newPage;
  }

  let page =
    createPage();

  let y =
    CONTENT_TOP;

  function addPage() {
    page =
      createPage();

    y =
      CONTENT_TOP;

    return page;
  }

  function ensureSpace(
    requiredHeight:
      number,
  ) {
    if (
      y -
        requiredHeight <
      BOTTOM_Y
    ) {
      addPage();
    }
  }

  function drawParagraph(
    value:
      | string
      | null
      | undefined,
    options?:
      ParagraphOptions,
  ) {
    const x =
      options?.x ??
      MARGIN_X;

    const size =
      options?.size ??
      9.2;

    const selectedFont =
      options?.font ??
      regular;

    const color =
      options?.color ??
      TEXT;

    const lineHeight =
      options?.lineHeight ??
      12.2;

    const maxWidth =
      options?.maxWidth ??
      CONTENT_WIDTH;

    const gapAfter =
      options?.gapAfter ??
      8;

    const paragraphGap =
      options?.paragraphGap ??
      4;

    const lines =
      wrapText(
        value ||
          "Não informado.",
        selectedFont,
        size,
        maxWidth,
      );

    for (
      const line
      of lines
    ) {
      if (!line) {
        ensureSpace(
          paragraphGap +
            2,
        );

        y -=
          paragraphGap;

        continue;
      }

      ensureSpace(
        lineHeight +
          2,
      );

      page.drawText(
        line,
        {
          x,

          y,

          size,

          font:
            selectedFont,

          color,
        },
      );

      y -=
        lineHeight;
    }

    y -=
      gapAfter;
  }

  function drawSectionTitle(
    title:
      string,
    subtitle?:
      string,
  ) {
    ensureSpace(
      subtitle
        ? 60
        : 46,
    );

    page.drawText(
      normalizeText(
        title,
      ),
      {
        x:
          MARGIN_X,

        y,

        size:
          14,

        font:
          bold,

        color:
          NAVY,
      },
    );

    y -=
      12;

    page.drawLine({
      start: {
        x:
          MARGIN_X,

        y,
      },

      end: {
        x:
          MARGIN_X +
          40,

        y,
      },

      thickness:
        2.2,

      color:
        GOLD,
    });

    y -=
      17;

    if (
      subtitle
    ) {
      drawParagraph(
        subtitle,
        {
          size:
            8.4,

          color:
            MUTED,

          lineHeight:
            11.2,

          gapAfter:
            7,

          paragraphGap:
            3,
        },
      );
    }
  }

  function drawInfoBox(
    label:
      string,
    value:
      string,
    x:
      number,
    boxY:
      number,
    width:
      number,
  ) {
    page.drawRectangle({
      x,

      y:
        boxY,

      width,

      height:
        56,

      borderWidth:
        1,

      borderColor:
        BORDER,

      color:
        LIGHT,
    });

    page.drawRectangle({
      x,

      y:
        boxY,

      width:
        3,

      height:
        56,

      color:
        GOLD,
    });

    page.drawText(
      normalizeText(
        label,
      ).toUpperCase(),
      {
        x:
          x +
          14,

        y:
          boxY +
          37,

        size:
          6.5,

        font:
          bold,

        color:
          MUTED,
      },
    );

    const lines =
      wrapText(
        value ||
          "Não informado",
        bold,
        9,
        width -
          28,
      ).slice(
        0,
        2,
      );

    lines.forEach(
      (
        line,
        index,
      ) => {
        if (!line) {
          return;
        }

        page.drawText(
          line,
          {
            x:
              x +
              14,

            y:
              boxY +
              19 -
              index *
                11,

            size:
              9,

            font:
              bold,

            color:
              NAVY,
          },
        );
      },
    );
  }

  function drawContextRow() {
    const items:
      string[] = [];

    if (
      data.city ||
      data.state
    ) {
      items.push(
        [
          data.city,
          data.state,
        ]
          .filter(
            Boolean,
          )
          .join(
            " / ",
          ),
      );
    }

    const formattedTaxRegime =
      formatTaxRegime(
        data.taxRegime,
      );

    if (
      formattedTaxRegime
    ) {
      items.push(
        `Regime: ${formattedTaxRegime}`,
      );
    }

    if (
      data.erpName
    ) {
      items.push(
        `ERP: ${data.erpName}`,
      );
    }

    if (
      items.length ===
      0
    ) {
      return;
    }

    const text =
      items.join(
        "   |   ",
      );

    const lines =
      wrapText(
        text,
        regular,
        7.8,
        CONTENT_WIDTH -
          28,
      ).filter(
        Boolean,
      );

    const boxHeight =
      25 +
      lines.length *
        10;

    ensureSpace(
      boxHeight +
        16,
    );

    page.drawRectangle({
      x:
        MARGIN_X,

      y:
        y -
        boxHeight,

      width:
        CONTENT_WIDTH,

      height:
        boxHeight,

      borderWidth:
        1,

      borderColor:
        BORDER,

      color:
        WHITE,
    });

    lines.forEach(
      (
        line,
        index,
      ) => {
        page.drawText(
          line,
          {
            x:
              MARGIN_X +
              14,

            y:
              y -
              18 -
              index *
                10,

            size:
              7.8,

            font:
              regular,

            color:
              MUTED,
          },
        );
      },
    );

    y -=
      boxHeight +
      16;
  }

  function drawClassification() {
    ensureSpace(
      90,
    );

    const classification =
      classificationLabels[
        data.classification ||
          ""
      ] ||
      data.classification ||
      "Classificação não informada";

    page.drawRectangle({
      x:
        MARGIN_X,

      y:
        y -
        70,

      width:
        CONTENT_WIDTH,

      height:
        70,

      borderWidth:
        1,

      borderColor:
        GOLD,

      color:
        LIGHT_GOLD,
    });

    page.drawRectangle({
      x:
        MARGIN_X,

      y:
        y -
        70,

      width:
        5,

      height:
        70,

      color:
        GOLD,
    });

    page.drawText(
      "CLASSIFICAÇÃO GERAL",
      {
        x:
          MARGIN_X +
          18,

        y:
          y -
          23,

        size:
          6.7,

        font:
          bold,

        color:
          GOLD_DARK,
      },
    );

    page.drawText(
      normalizeText(
        classification,
      ),
      {
        x:
          MARGIN_X +
          18,

        y:
          y -
          49,

        size:
          15,

        font:
          bold,

        color:
          NAVY,
      },
    );

    y -=
      90;
  }

  function drawOverviewTable() {
    if (
      data.operations.length ===
      0
    ) {
      drawParagraph(
        "Nenhum XML foi apresentado no resultado.",
      );

      return;
    }

    const documentWidth =
      190;

    const conformityWidth =
      112;

    const preparationWidth =
      CONTENT_WIDTH -
      documentWidth -
      conformityWidth;

    const x1 =
      MARGIN_X;

    const x2 =
      x1 +
      documentWidth;

    const x3 =
      x2 +
      conformityWidth;

    const headerHeight =
      28;

    ensureSpace(
      headerHeight +
        50,
    );

    page.drawRectangle({
      x:
        MARGIN_X,

      y:
        y -
        headerHeight,

      width:
        CONTENT_WIDTH,

      height:
        headerHeight,

      color:
        NAVY,
    });

    const headers = [
      {
        x:
          x1,

        label:
          "DOCUMENTO",
      },
      {
        x:
          x2,

        label:
          "CONFORMIDADE",
      },
      {
        x:
          x3,

        label:
          "PREPARAÇÃO IBS/CBS",
      },
    ];

    headers.forEach(
      (
        item,
      ) => {
        page.drawText(
          item.label,
          {
            x:
              item.x +
              10,

            y:
              y -
              18,

            size:
              6.3,

            font:
              bold,

            color:
              WHITE,
          },
        );
      },
    );

    y -=
      headerHeight;

    data.operations.forEach(
      (
        operation,
        index,
      ) => {
        const resultValue =
          operation.documentConformity ||
          operation.result ||
          "";

        const conformity =
          operationResultLabels[
            resultValue
          ] ||
          resultValue ||
          "Não informado";

        const preparation =
          preparationStatusLabels[
            operation.preparationStatus ||
              ""
          ] ||
          operation.preparationStatus ||
          "Não informado";

        const documentText =
          normalizeText(
            operation.fileName ||
              `XML ${index + 1}`,
          );

        const documentLines =
          wrapText(
            documentText,
            bold,
            7.7,
            documentWidth -
              20,
          ).filter(
            Boolean,
          );

        const conformityLines =
          wrapText(
            conformity,
            regular,
            7.5,
            conformityWidth -
              20,
          ).filter(
            Boolean,
          );

        const preparationLines =
          wrapText(
            preparation,
            regular,
            7.5,
            preparationWidth -
              20,
          ).filter(
            Boolean,
          );

        const maxLines =
          Math.max(
            documentLines.length,
            conformityLines.length,
            preparationLines.length,
          );

        const rowHeight =
          Math.max(
            38,
            19 +
            maxLines *
              10,
          );

        if (
          y -
            rowHeight <
          BOTTOM_Y
        ) {
          addPage();

          page.drawRectangle({
            x:
              MARGIN_X,

            y:
              y -
              headerHeight,

            width:
              CONTENT_WIDTH,

            height:
              headerHeight,

            color:
              NAVY,
          });

          headers.forEach(
            (
              item,
            ) => {
              page.drawText(
                item.label,
                {
                  x:
                    item.x +
                    10,

                  y:
                    y -
                    18,

                  size:
                    6.3,

                  font:
                    bold,

                  color:
                    WHITE,
                },
              );
            },
          );

          y -=
            headerHeight;
        }

        page.drawRectangle({
          x:
            MARGIN_X,

          y:
            y -
            rowHeight,

          width:
            CONTENT_WIDTH,

          height:
            rowHeight,

          borderWidth:
            1,

          borderColor:
            BORDER,

          color:
            index %
              2 ===
            0
              ? LIGHT
              : WHITE,
        });

        page.drawLine({
          start: {
            x:
              x2,

            y:
              y,
          },

          end: {
            x:
              x2,

            y:
              y -
              rowHeight,
          },

          thickness:
            1,

          color:
            BORDER,
        });

        page.drawLine({
          start: {
            x:
              x3,

            y:
              y,
          },

          end: {
            x:
              x3,

            y:
              y -
              rowHeight,
          },

          thickness:
            1,

          color:
            BORDER,
        });

        documentLines.forEach(
          (
            line,
            lineIndex,
          ) => {
            page.drawText(
              line,
              {
                x:
                  x1 +
                  10,

                y:
                  y -
                  19 -
                  lineIndex *
                    10,

                size:
                  7.7,

                font:
                  bold,

                color:
                  NAVY,
              },
            );
          },
        );

        conformityLines.forEach(
          (
            line,
            lineIndex,
          ) => {
            page.drawText(
              line,
              {
                x:
                  x2 +
                  10,

                y:
                  y -
                  19 -
                  lineIndex *
                    10,

                size:
                  7.5,

                font:
                  regular,

                color:
                  TEXT,
              },
            );
          },
        );

        preparationLines.forEach(
          (
            line,
            lineIndex,
          ) => {
            page.drawText(
              line,
              {
                x:
                  x3 +
                  10,

                y:
                  y -
                  19 -
                  lineIndex *
                    10,

                size:
                  7.5,

                font:
                  regular,

                color:
                  TEXT,
              },
            );
          },
        );

        y -=
          rowHeight;
      },
    );

    y -=
      16;
  }

  function drawXmlHeader(
    operation:
      DiagnosticPdfOperation,
    index:
      number,
  ) {
    const fileName =
      normalizeText(
        operation.fileName ||
          `Documento ${index + 1}`,
      );

    const fileLines =
      wrapText(
        fileName,
        bold,
        12.5,
        CONTENT_WIDTH -
          32,
      )
        .filter(
          Boolean,
        )
        .slice(
          0,
          2,
        );

    const bandHeight =
      Math.max(
        58,
        36 +
        fileLines.length *
          15,
      );

    ensureSpace(
      bandHeight +
        16,
    );

    page.drawRectangle({
      x:
        MARGIN_X,

      y:
        y -
        bandHeight,

      width:
        CONTENT_WIDTH,

      height:
        bandHeight,

      color:
        NAVY,
    });

    page.drawText(
      `XML ${index + 1}`,
      {
        x:
          MARGIN_X +
          16,

        y:
          y -
          20,

        size:
          6.8,

        font:
          bold,

        color:
          GOLD,
      },
    );

    fileLines.forEach(
      (
        line,
        lineIndex,
      ) => {
        page.drawText(
          line,
          {
            x:
              MARGIN_X +
              16,

            y:
              y -
              42 -
              lineIndex *
                15,

            size:
              12.5,

            font:
              bold,

            color:
              WHITE,
          },
        );
      },
    );

    y -=
      bandHeight +
      15;
  }

  function drawLabelValue(
    label:
      string,
    value:
      string,
  ) {
    if (!value) {
      return;
    }

    ensureSpace(
      38,
    );

    page.drawText(
      normalizeText(
        label,
      ).toUpperCase(),
      {
        x:
          MARGIN_X,

        y,

        size:
          6.4,

        font:
          bold,

        color:
          MUTED,
      },
    );

    y -=
      12;

    drawParagraph(
      value,
      {
        size:
          8.8,

        lineHeight:
          11.5,

        gapAfter:
          7,

        paragraphGap:
          3,
      },
    );
  }

  function drawOperationMetaGrid(
    operation:
      DiagnosticPdfOperation,
  ) {
    const resultValue =
      operation.documentConformity ||
      operation.result ||
      "";

    const conformity =
      operationResultLabels[
        resultValue
      ] ||
      resultValue ||
      "Não informado";

    const preparation =
      preparationStatusLabels[
        operation.preparationStatus ||
          ""
      ] ||
      operation.preparationStatus ||
      "Não informado";

    const items = [
      {
        label:
          "CFOP identificado",

        value:
          operation.cfop ||
          "Não informado",
      },
      {
        label:
          "Conformidade do documento",

        value:
          conformity,
      },
      {
        label:
          "Preparação IBS/CBS",

        value:
          preparation,
      },
    ];

    const gap =
      8;

    const boxWidth =
      (
        CONTENT_WIDTH -
        gap * 2
      ) /
      3;

    const prepared =
      items.map(
        (
          item,
        ) => ({
          ...item,

          lines:
            wrapText(
              item.value,
              bold,
              7.4,
              boxWidth -
                20,
            ).filter(
              Boolean,
            ),
        }),
      );

    const maxLines =
      Math.max(
        ...prepared.map(
          (
            item,
          ) =>
            item.lines.length,
        ),
      );

    const boxHeight =
      Math.max(
        62,
        38 +
        maxLines *
          10,
      );

    ensureSpace(
      boxHeight +
        16,
    );

    prepared.forEach(
      (
        item,
        index,
      ) => {
        const x =
          MARGIN_X +
          index *
            (
              boxWidth +
              gap
            );

        page.drawRectangle({
          x,

          y:
            y -
            boxHeight,

          width:
            boxWidth,

          height:
            boxHeight,

          borderWidth:
            1,

          borderColor:
            BORDER,

          color:
            WHITE,
        });

        page.drawRectangle({
          x,

          y:
            y -
            boxHeight,

          width:
            3,

          height:
            boxHeight,

          color:
            index ===
            2
              ? GOLD
              : NAVY,
        });

        page.drawText(
          normalizeText(
            item.label,
          ).toUpperCase(),
          {
            x:
              x +
              11,

            y:
              y -
              18,

            size:
              5.7,

            font:
              bold,

            color:
              MUTED,
          },
        );

        item.lines.forEach(
          (
            line,
            lineIndex,
          ) => {
            page.drawText(
              line,
              {
                x:
                  x +
                  11,

                y:
                  y -
                  39 -
                  lineIndex *
                    10,

                size:
                  7.4,

                font:
                  bold,

                color:
                  NAVY,
              },
            );
          },
        );
      },
    );

    y -=
      boxHeight +
      17;
  }

  function drawGroupBanner(
    label:
      string,
    variant:
      "neutral"
      | "action" =
      "neutral",
  ) {
    ensureSpace(
      43,
    );

    const height =
      30;

    page.drawRectangle({
      x:
        MARGIN_X,

      y:
        y -
        height,

      width:
        CONTENT_WIDTH,

      height,

      borderWidth:
        1,

      borderColor:
        variant ===
        "action"
          ? GOLD
          : BORDER,

      color:
        variant ===
        "action"
          ? LIGHT_GOLD
          : LIGHT,
    });

    page.drawRectangle({
      x:
        MARGIN_X,

      y:
        y -
        height,

      width:
        4,

      height,

      color:
        variant ===
        "action"
          ? GOLD
          : NAVY,
    });

    page.drawText(
      normalizeText(
        label,
      ).toUpperCase(),
      {
        x:
          MARGIN_X +
          16,

        y:
          y -
          19,

        size:
          7.3,

        font:
          bold,

        color:
          variant ===
          "action"
            ? GOLD_DARK
            : NAVY,
      },
    );

    y -=
      height +
      13;
  }

  function drawDetailField(
    title:
      string,
    value:
      | string
      | null
      | undefined,
    variant:
      DetailVariant =
      "neutral",
  ) {
    const normalized =
      normalizeText(
        value ||
          "Não informado.",
      );

    ensureSpace(
      40,
    );

    page.drawText(
      normalizeText(
        title,
      ),
      {
        x:
          MARGIN_X,

        y,

        size:
          9.7,

        font:
          bold,

        color:
          variant ===
          "action"
            ? GOLD_DARK
            : NAVY,
      },
    );

    y -=
      7;

    page.drawLine({
      start: {
        x:
          MARGIN_X,

        y,
      },

      end: {
        x:
          MARGIN_X +
          30,

        y,
      },

      thickness:
        1.7,

      color:
        variant ===
        "action"
          ? GOLD
          : BORDER,
    });

    y -=
      12;

    drawParagraph(
      normalized,
      {
        size:
          8.9,

        lineHeight:
          12,

        gapAfter:
          12,

        paragraphGap:
          4,
      },
    );
  }

  function drawLegacyOperation(
    operation:
      DiagnosticPdfOperation,
  ) {
    drawGroupBanner(
      "Análise do documento",
    );

    drawDetailField(
      "Análise técnica",
      operation.technicalAnalysis ||
        "Não informada.",
    );

    drawGroupBanner(
      "Providências",
      "action",
    );

    drawDetailField(
      "Recomendação",
      operation.recommendation ||
        "Não foi registrada recomendação específica para este XML.",
      "action",
    );
  }

  function drawDetailedOperation(
    operation:
      DiagnosticPdfOperation,
  ) {
    drawGroupBanner(
      "A. Documento e evidências",
    );

    drawDetailField(
      "1. Identificação da operação",
      operation.operationIdentification ||
        "Não informada.",
    );

    drawDetailField(
      "2. Evidências encontradas",
      operation.evidenceFound ||
        "Não informadas.",
    );

    drawDetailField(
      "3. Conferência dos cálculos",
      operation.calculationReview ||
        "Não informada.",
    );

    drawGroupBanner(
      "B. Diagnóstico técnico",
    );

    drawDetailField(
      "4. Achado técnico",
      operation.technicalFinding ||
        "Não informado.",
    );

    if (
      normalizeText(
        operation.technicalBasis,
      )
    ) {
      drawDetailField(
        "5. Fundamentação técnica",
        operation.technicalBasis,
      );
    }

    drawDetailField(
      "6. Risco ou impacto",
      operation.riskImpact ||
        "Não informado.",
    );

    drawGroupBanner(
      "C. Providências e encerramento",
      "action",
    );

    drawDetailField(
      "7. Ação recomendada",
      operation.recommendedAction ||
        "Não informada.",
      "action",
    );

    drawDetailField(
      "8. Responsável sugerido",
      operation.responsibleParty ||
        "Não informado.",
      "action",
    );

    drawDetailField(
      "9. Evidência para encerramento",
      operation.closureEvidence ||
        "Não informada.",
      "action",
    );
  }

  function drawSummarySection(
    title:
      string,
    value:
      | string
      | null
      | undefined,
    variant:
      "neutral"
      | "gold" =
      "neutral",
  ) {
    ensureSpace(
      48,
    );

    page.drawText(
      normalizeText(
        title,
      ),
      {
        x:
          MARGIN_X,

        y,

        size:
          12.2,

        font:
          bold,

        color:
          NAVY,
      },
    );

    y -=
      9;

    page.drawLine({
      start: {
        x:
          MARGIN_X,

        y,
      },

      end: {
        x:
          MARGIN_X +
          42,

        y,
      },

      thickness:
        2,

      color:
        variant ===
        "gold"
          ? GOLD
          : NAVY,
    });

    y -=
      15;

    drawParagraph(
      value ||
        "Não informado.",
      {
        size:
          9.2,

        lineHeight:
          12.5,

        gapAfter:
          16,

        paragraphGap:
          4,
      },
    );
  }

  function drawLimitationBox(
    value:
      string,
  ) {
    const normalized =
      normalizeText(
        value,
      );

    const lines =
      wrapText(
        normalized,
        regular,
        8.2,
        CONTENT_WIDTH -
          34,
      );

    const visibleLines =
      lines.filter(
        Boolean,
      );

    const lineHeight =
      11.4;

    const boxHeight =
      46 +
      visibleLines.length *
        lineHeight;

    if (
      y -
        boxHeight <
      BOTTOM_Y
    ) {
      addPage();
    }

    page.drawRectangle({
      x:
        MARGIN_X,

      y:
        y -
        boxHeight,

      width:
        CONTENT_WIDTH,

      height:
        boxHeight,

      borderWidth:
        1,

      borderColor:
        BORDER,

      color:
        LIGHT,
    });

    page.drawText(
      "Escopo e limitações",
      {
        x:
          MARGIN_X +
          16,

        y:
          y -
          23,

        size:
          10.3,

        font:
          bold,

        color:
          NAVY,
      },
    );

    visibleLines.forEach(
      (
        line,
        index,
      ) => {
        page.drawText(
          line,
          {
            x:
              MARGIN_X +
              16,

            y:
              y -
              45 -
              index *
                lineHeight,

            size:
              8.2,

            font:
              regular,

            color:
              MUTED,
          },
        );
      },
    );

    y -=
      boxHeight +
      22;
  }

  function drawSignature() {
    ensureSpace(
      72,
    );

    page.drawLine({
      start: {
        x:
          MARGIN_X,

        y,
      },

      end: {
        x:
          MARGIN_X +
          150,

        y,
      },

      thickness:
        1,

      color:
        BORDER,
    });

    y -=
      20;

    page.drawText(
      "Diana Voltolini",
      {
        x:
          MARGIN_X,

        y,

        size:
          11,

        font:
          bold,

        color:
          NAVY,
      },
    );

    y -=
      16;

    page.drawText(
      "Especialista em Faturamento e Inteligência Fiscal",
      {
        x:
          MARGIN_X,

        y,

        size:
          7.6,

        font:
          regular,

        color:
          MUTED,
      },
    );
  }

  /*
   * =========================================================
   * 1. RESULTADO EXECUTIVO
   * =========================================================
   */

  page.drawText(
    "RESULTADO DO DIAGNÓSTICO",
    {
      x:
        MARGIN_X,

      y,

      size:
        7.2,

      font:
        bold,

      color:
        GOLD_DARK,
    },
  );

  y -=
    30;

  page.drawText(
    "Diagnóstico Expresso",
    {
      x:
        MARGIN_X,

      y,

      size:
        25,

      font:
        bold,

      color:
        NAVY,
    },
  );

  y -=
    29;

  page.drawText(
    "IBS/CBS",
    {
      x:
        MARGIN_X,

      y,

      size:
        25,

      font:
        bold,

      color:
        GOLD_DARK,
    },
  );

  y -=
    30;

  drawParagraph(
    "Avaliação operacional e documental realizada a partir das informações e dos documentos incluídos no escopo contratado.",
    {
      size:
        10.2,

      lineHeight:
        13.5,

      maxWidth:
        455,

      gapAfter:
        20,

      paragraphGap:
        4,
    },
  );

  const infoGap =
    10;

  const infoWidth =
    (
      CONTENT_WIDTH -
      infoGap
    ) /
    2;

  ensureSpace(
    132,
  );

  let boxY =
    y -
    56;

  drawInfoBox(
    "Diagnóstico",
    data.code,
    MARGIN_X,
    boxY,
    infoWidth,
  );

  drawInfoBox(
    "Empresa",
    data.companyName,
    MARGIN_X +
      infoWidth +
      infoGap,
    boxY,
    infoWidth,
  );

  boxY -=
    66;

  drawInfoBox(
    "CNPJ",
    formatCnpj(
      data.cnpj,
    ),
    MARGIN_X,
    boxY,
    infoWidth,
  );

  drawInfoBox(
    "Concluído em",
    formatDate(
      data.completedAt,
    ),
    MARGIN_X +
      infoWidth +
      infoGap,
    boxY,
    infoWidth,
  );

  y =
    boxY -
    18;

  drawContextRow();

  drawClassification();

  drawSectionTitle(
    "Visão geral dos XMLs",
    "Resultado resumido dos documentos incluídos no escopo.",
  );

  drawOverviewTable();

  drawSectionTitle(
    "Resumo executivo",
  );

  drawParagraph(
    data.generalAssessment ||
      "Resumo não informado.",
    {
      size:
        9.5,

      lineHeight:
        12.8,

      gapAfter:
        13,

      paragraphGap:
        4,
    },
  );

  /*
   * =========================================================
   * 2. ANÁLISE INDIVIDUAL DOS XMLs
   * Cada XML começa obrigatoriamente em uma nova página.
   * =========================================================
   */

  data.operations.forEach(
    (
      operation,
      index,
    ) => {
      addPage();

      drawXmlHeader(
        operation,
        index,
      );

      drawLabelValue(
        "Operação informada pelo cliente",
        normalizeText(
          operation.operation,
        ),
      );

      drawLabelValue(
        "Natureza da operação no XML",
        extractNatureOperation(
          operation.operationIdentification,
        ),
      );

      drawOperationMetaGrid(
        operation,
      );

      const hasDetailedAnalysis =
        Boolean(
          normalizeText(
            operation.operationIdentification,
          ) ||
          normalizeText(
            operation.evidenceFound,
          ) ||
          normalizeText(
            operation.calculationReview,
          ) ||
          normalizeText(
            operation.technicalFinding,
          ) ||
          normalizeText(
            operation.technicalBasis,
          ) ||
          normalizeText(
            operation.riskImpact,
          ) ||
          normalizeText(
            operation.recommendedAction,
          ) ||
          normalizeText(
            operation.responsibleParty,
          ) ||
          normalizeText(
            operation.closureEvidence,
          ),
        );

      if (
        hasDetailedAnalysis
      ) {
        drawDetailedOperation(
          operation,
        );
      } else {
        drawLegacyOperation(
          operation,
        );
      }
    },
  );

  /*
   * =========================================================
   * 3. SÍNTESE CONSOLIDADA
   * =========================================================
   */

  addPage();

  drawSectionTitle(
    "Síntese do diagnóstico",
    "Consolidação dos principais achados da análise realizada.",
  );

  drawSummarySection(
    "Pontos positivos",
    data.strengths ||
      "Não informado.",
  );

  drawSummarySection(
    "Riscos identificados",
    data.risks ||
      "Não informado.",
    "gold",
  );

  /*
   * =========================================================
   * 4. PLANO DE AÇÃO
   * =========================================================
   */

  addPage();

  drawSectionTitle(
    "Plano de ação",
    "Providências recomendadas a partir dos documentos e evidências analisados.",
  );

  drawParagraph(
    data.actionPlan ||
      "Não informado.",
    {
      size:
        9.5,

      lineHeight:
        12.8,

      gapAfter:
        14,

      paragraphGap:
        4,
    },
  );

  /*
   * =========================================================
   * 5. PARECER FINAL
   * =========================================================
   */

  addPage();

  page.drawText(
    "CONCLUSÃO PROFISSIONAL",
    {
      x:
        MARGIN_X,

      y,

      size:
        7,

      font:
        bold,

      color:
        GOLD_DARK,
    },
  );

  y -=
    28;

  page.drawText(
    "Parecer final",
    {
      x:
        MARGIN_X,

      y,

      size:
        18,

      font:
        bold,

      color:
        NAVY,
    },
  );

  y -=
    12;

  page.drawLine({
    start: {
      x:
        MARGIN_X,

      y,
    },

    end: {
      x:
        MARGIN_X +
        52,

      y,
    },

    thickness:
      2.4,

    color:
      GOLD,
  });

  y -=
    23;

  drawParagraph(
    data.finalOpinion ||
      "Parecer não informado.",
    {
      size:
        9.6,

      lineHeight:
        13,

      gapAfter:
        20,

      paragraphGap:
        5,
    },
  );

  drawLimitationBox(
    data.limitation ||
      defaultLimitation,
  );

  drawSignature();

  /*
   * =========================================================
   * RODAPÉ E PAGINAÇÃO
   * =========================================================
   */

  const pages =
    pdf.getPages();

  pages.forEach(
    (
      currentPage,
      index,
    ) => {
      currentPage.drawLine({
        start: {
          x:
            MARGIN_X,

          y:
            49,
        },

        end: {
          x:
            PAGE_WIDTH -
            MARGIN_X,

          y:
            49,
        },

        thickness:
          1,

        color:
          BORDER,
      });

      const footerY =
        31;

      const footerFontSize =
        6;

      const professionalText =
        "Diana Voltolini | Especialista em Faturamento e Inteligência Fiscal";

      const websiteText =
        "www.dianavoltolini.com.br";

      const phoneText =
        "(47) 99285-1601";

      currentPage.drawText(
        professionalText,
        {
          x:
            MARGIN_X,

          y:
            footerY,

          size:
            footerFontSize,

          font:
            regular,

          color:
            MUTED,
        },
      );

      const websiteWidth =
        regular.widthOfTextAtSize(
          websiteText,
          footerFontSize,
        );

      currentPage.drawText(
        websiteText,
        {
          x:
            PAGE_WIDTH /
              2 -
            websiteWidth /
              2,

          y:
            footerY,

          size:
            footerFontSize,

          font:
            regular,

          color:
            MUTED,
        },
      );

      const phoneWidth =
        regular.widthOfTextAtSize(
          phoneText,
          footerFontSize,
        );

      currentPage.drawText(
        phoneText,
        {
          x:
            PAGE_WIDTH -
            MARGIN_X -
            phoneWidth,

          y:
            footerY,

          size:
            footerFontSize,

          font:
            regular,

          color:
            MUTED,
        },
      );

      const pageText =
        `Página ${index + 1} de ${pages.length}`;

      const pageTextWidth =
        regular.widthOfTextAtSize(
          pageText,
          5.8,
        );

      currentPage.drawText(
        pageText,
        {
          x:
            PAGE_WIDTH -
            MARGIN_X -
            pageTextWidth,

          y:
            17,

          size:
            5.8,

          font:
            regular,

          color:
            MUTED,
        },
      );
    },
  );

  pdf.setTitle(
    `Diagnóstico Expresso IBS/CBS - ${data.code}`,
  );

  pdf.setAuthor(
    "Diana Voltolini",
  );

  pdf.setSubject(
    "Resultado do Diagnóstico Expresso IBS/CBS",
  );

  pdf.setCreator(
    "Diana Voltolini",
  );

  return pdf.save();
}