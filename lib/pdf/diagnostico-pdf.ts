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
  cfop?: string;
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
};

const PAGE_WIDTH =
  595.28;

const PAGE_HEIGHT =
  841.89;

const MARGIN_X =
  48;

const CONTENT_TOP =
  700;

const BOTTOM_Y =
  74;

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

function breakLongWord(
  word:
    string,
  font:
    PDFFont,
  size:
    number,
  maxWidth:
    number,
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
  value:
    string,
  font:
    PDFFont,
  size:
    number,
  maxWidth:
    number,
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

  const paragraphs =
    text.split(
      /\r?\n/,
    );

  paragraphs.forEach(
    (
      paragraph,
      paragraphIndex,
    ) => {
      const words =
        paragraph
          .trim()
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

              if (
                current
              ) {
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

      if (
        current
      ) {
        lines.push(
          current,
        );
      }

      if (
        paragraphIndex <
        paragraphs.length -
          1
      ) {
        lines.push(
          "",
        );
      }
    },
  );

  return lines;
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
    if (
      logo
    ) {
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
      9.4;

    const selectedFont =
      options?.font ??
      regular;

    const color =
      options?.color ??
      TEXT;

    const lineHeight =
      options?.lineHeight ??
      14;

    const maxWidth =
      options?.maxWidth ??
      CONTENT_WIDTH;

    const gapAfter =
      options?.gapAfter ??
      12;

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
      ensureSpace(
        lineHeight +
          2,
      );

      if (
        line
      ) {
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
      }

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
        ? 64
        : 48,
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
          38,

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
            12,

          gapAfter:
            8,
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

    if (
      data.taxRegime
    ) {
      items.push(
        `Regime: ${data.taxRegime}`,
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
        7.5,
        CONTENT_WIDTH -
          28,
      );

    const boxHeight =
      26 +
      lines.length *
        10;

    ensureSpace(
      boxHeight +
        18,
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
              7.5,

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
      18;
  }

  function drawTextCard(
    title:
      string,
    value:
      | string
      | null
      | undefined,
    variant:
      | "neutral"
      | "gold" =
      "neutral",
  ) {
    const normalized =
      normalizeText(
        value ||
          "Não informado.",
      );

    const lines =
      wrapText(
        normalized,
        regular,
        9.2,
        CONTENT_WIDTH -
          36,
      );

    const lineHeight =
      13.5;

    const cardHeight =
      50 +
      lines.length *
        lineHeight;

    if (
      cardHeight >
      360
    ) {
      drawSectionTitle(
        title,
      );

      drawParagraph(
        normalized,
      );

      return;
    }

    ensureSpace(
      cardHeight +
        16,
    );

    const fill =
      variant ===
      "gold"
        ? LIGHT_GOLD
        : LIGHT;

    const accent =
      variant ===
      "gold"
        ? GOLD
        : NAVY;

    page.drawRectangle({
      x:
        MARGIN_X,

      y:
        y -
        cardHeight,

      width:
        CONTENT_WIDTH,

      height:
        cardHeight,

      borderWidth:
        1,

      borderColor:
        BORDER,

      color:
        fill,
    });

    page.drawRectangle({
      x:
        MARGIN_X,

      y:
        y -
        cardHeight,

      width:
        4,

      height:
        cardHeight,

      color:
        accent,
    });

    page.drawText(
      normalizeText(
        title,
      ),
      {
        x:
          MARGIN_X +
          18,

        y:
          y -
          24,

        size:
          11.2,

        font:
          bold,

        color:
          NAVY,
      },
    );

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
              18,

            y:
              y -
              48 -
              index *
                lineHeight,

            size:
              9.2,

            font:
              regular,

            color:
              TEXT,
          },
        );
      },
    );

    y -=
      cardHeight +
      16;
  }

  function drawOperationTextBlock(
    title:
      string,
    value:
      | string
      | null
      | undefined,
    variant:
      | "neutral"
      | "gold",
  ) {
    const normalized =
      normalizeText(
        value ||
          "Não informado.",
      );

    const lines =
      wrapText(
        normalized,
        regular,
        8.8,
        CONTENT_WIDTH -
          32,
      );

    const lineHeight =
      13;

    const blockHeight =
      42 +
      lines.length *
        lineHeight;

    if (
      blockHeight >
      300
    ) {
      ensureSpace(
        34,
      );

      page.drawText(
        title,
        {
          x:
            MARGIN_X,

          y,

          size:
            9.4,

          font:
            bold,

          color:
            NAVY,
        },
      );

      y -=
        18;

      drawParagraph(
        normalized,
        {
          size:
            8.8,

          lineHeight,

          gapAfter:
            12,
        },
      );

      return;
    }

    ensureSpace(
      blockHeight +
        10,
    );

    page.drawRectangle({
      x:
        MARGIN_X,

      y:
        y -
        blockHeight,

      width:
        CONTENT_WIDTH,

      height:
        blockHeight,

      borderWidth:
        1,

      borderColor:
        BORDER,

      color:
        variant ===
        "gold"
          ? LIGHT_GOLD
          : LIGHT,
    });

    page.drawText(
      title,
      {
        x:
          MARGIN_X +
          15,

        y:
          y -
          21,

        size:
          8.8,

        font:
          bold,

        color:
          variant ===
          "gold"
            ? GOLD_DARK
            : NAVY,
      },
    );

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
              15,

            y:
              y -
              42 -
              index *
                lineHeight,

            size:
              8.8,

            font:
              regular,

            color:
              TEXT,
          },
        );
      },
    );

    y -=
      blockHeight +
      10;
  }

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
        15,

      maxWidth:
        455,

      gapAfter:
        22,
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

  ensureSpace(
    92,
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
    92;

  drawSectionTitle(
    "Resumo executivo",
  );

  drawParagraph(
    data.generalAssessment ||
      "Resumo não informado.",
    {
      size:
        9.6,

      lineHeight:
        14.5,

      gapAfter:
        18,
    },
  );

  drawSectionTitle(
    "XMLs analisados",
    `${data.operations.length} ${
      data.operations.length ===
      1
        ? "documento incluído"
        : "documentos incluídos"
    } na análise.`,
  );

  if (
    data.operations.length ===
    0
  ) {
    drawParagraph(
      "Nenhum XML foi apresentado no resultado.",
    );
  }

  data.operations.forEach(
    (
      operation,
      index,
    ) => {
      ensureSpace(
        150,
      );

      const cardTop =
        y;

      const result =
        operationResultLabels[
          operation.result ||
            ""
        ] ||
        operation.result ||
        "Não informado";

      const normalizedResult =
        normalizeText(
          result,
        );

      const statusWidth =
        bold.widthOfTextAtSize(
          normalizedResult,
          7.4,
        );

      page.drawRectangle({
        x:
          MARGIN_X,

        y:
          cardTop -
          38,

        width:
          CONTENT_WIDTH,

        height:
          38,

        color:
          NAVY,
      });

      page.drawText(
        `XML ${index + 1}`,
        {
          x:
            MARGIN_X +
            14,

          y:
            cardTop -
            23,

          size:
            7,

          font:
            bold,

          color:
            GOLD,
        },
      );

      page.drawText(
        normalizedResult,
        {
          x:
            PAGE_WIDTH -
            MARGIN_X -
            14 -
            statusWidth,

          y:
            cardTop -
            23,

          size:
            7.4,

          font:
            bold,

          color:
            WHITE,
        },
      );

      y -=
        55;

      const fileName =
        normalizeText(
          operation.fileName ||
            `Documento ${index + 1}`,
        );

      const fileNameLines =
        wrapText(
          fileName,
          bold,
          10.8,
          CONTENT_WIDTH,
        );

      fileNameLines
        .slice(
          0,
          2,
        )
        .forEach(
          (
            line,
          ) => {
            page.drawText(
              line,
              {
                x:
                  MARGIN_X,

                y,

                size:
                  10.8,

                font:
                  bold,

                color:
                  NAVY,
              },
            );

            y -=
              14;
          },
        );

      if (
        operation.operation
      ) {
        drawParagraph(
          operation.operation,
          {
            size:
              8.5,

            color:
              MUTED,

            lineHeight:
              12,

            gapAfter:
              8,
          },
        );
      } else {
        y -=
          4;
      }

      ensureSpace(
        30,
      );

      const cfopValue =
        normalizeText(
          operation.cfop ||
            "Não informado",
        );

      page.drawRectangle({
        x:
          MARGIN_X,

        y:
          y -
          25,

        width:
          96,

        height:
          25,

        borderWidth:
          1,

        borderColor:
          BORDER,

        color:
          WHITE,
      });

      page.drawText(
        "CFOP",
        {
          x:
            MARGIN_X +
            10,

          y:
            y -
            16,

          size:
            6.4,

          font:
            bold,

          color:
            MUTED,
        },
      );

      page.drawText(
        cfopValue,
        {
          x:
            MARGIN_X +
            44,

          y:
            y -
            16,

          size:
            8,

          font:
            bold,

          color:
            NAVY,
        },
      );

      y -=
        37;

      drawOperationTextBlock(
        "Análise técnica",
        operation.technicalAnalysis ||
          "Não informada.",
        "neutral",
      );

      drawOperationTextBlock(
        "Recomendação",
        operation.recommendation ||
          "Não foi registrada recomendação específica para este XML.",
        "gold",
      );

      ensureSpace(
        18,
      );

      page.drawLine({
        start: {
          x:
            MARGIN_X,

          y,
        },

        end: {
          x:
            PAGE_WIDTH -
            MARGIN_X,

          y,
        },

        thickness:
          1,

        color:
          BORDER,
      });

      y -=
        18;
    },
  );

  drawTextCard(
    "Pontos positivos",
    data.strengths ||
      "Não informado.",
    "neutral",
  );

  drawTextCard(
    "Riscos identificados",
    data.risks ||
      "Não informado.",
    "neutral",
  );

  drawTextCard(
    "Plano de ação",
    data.actionPlan ||
      "Não informado.",
    "gold",
  );

  drawTextCard(
    "Parecer final",
    data.finalOpinion ||
      "Parecer não informado.",
    "gold",
  );

  const limitation =
    data.limitation ||
    defaultLimitation;

  const limitationLines =
    wrapText(
      limitation,
      regular,
      8.2,
      CONTENT_WIDTH -
        30,
    );

  const limitationHeight =
    44 +
    limitationLines.length *
      12.2;

  if (
    limitationHeight <=
    280
  ) {
    ensureSpace(
      limitationHeight +
        20,
    );

    page.drawRectangle({
      x:
        MARGIN_X,

      y:
        y -
        limitationHeight,

      width:
        CONTENT_WIDTH,

      height:
        limitationHeight,

      borderWidth:
        1,

      borderColor:
        BORDER,

      color:
        WHITE,
    });

    page.drawText(
      "Escopo e limitações",
      {
        x:
          MARGIN_X +
          15,

        y:
          y -
          22,

        size:
          10.2,

        font:
          bold,

        color:
          NAVY,
      },
    );

    limitationLines.forEach(
      (
        line,
        index,
      ) => {
        page.drawText(
          line,
          {
            x:
              MARGIN_X +
              15,

            y:
              y -
              44 -
              index *
                12.2,

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
      limitationHeight +
      22;
  } else {
    drawSectionTitle(
      "Escopo e limitações",
    );

    drawParagraph(
      limitation,
      {
        size:
          8.2,

        lineHeight:
          12.2,

        color:
          MUTED,

        gapAfter:
          22,
      },
    );
  }

  ensureSpace(
    78,
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
    19;

  page.drawText(
    "Diana Voltolini",
    {
      x:
        MARGIN_X,

      y,

      size:
        10.8,

      font:
        bold,

      color:
        NAVY,
    },
  );

  y -=
    15;

  page.drawText(
    "Especialista em Faturamento e Inteligência Fiscal",
    {
      x:
        MARGIN_X,

      y,

      size:
        7.3,

      font:
        regular,

      color:
        MUTED,
    },
  );

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
            47,
        },

        end: {
          x:
            PAGE_WIDTH -
            MARGIN_X,

          y:
            47,
        },

        thickness:
          1,

        color:
          BORDER,
      });

      const footerY =
        31;

      const footerFontSize =
        5.5;

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
              2 +
            78,

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
          5.4,
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
            5.4,

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