// app/torre/diagnosticos/[id]/questionario/print-button.tsx

"use client";

import styles from "./questionario.module.css";

export default function PrintButton() {
  return (
    <button
      className={styles.printButton}
      type="button"
      onClick={() => window.print()}
    >
      Imprimir ou salvar em PDF
    </button>
  );
}