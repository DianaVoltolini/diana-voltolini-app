// app/painel/diagnosticos/[id]/mensagens/message-form.tsx

"use client";

import {
  useActionState,
  useEffect,
  useRef,
} from "react";

import {
  sendClientMessage,
  type MessageActionState,
} from "./actions";

import styles from "./mensagens.module.css";

type MessageFormProps = {
  diagnosticId: string;
  actionRequired: boolean;
};

const initialState: MessageActionState = {
  status: "idle",
  message: "",
  resetKey: 0,
};

export default function MessageForm({
  diagnosticId,
  actionRequired,
}: MessageFormProps) {
  const formRef =
    useRef<HTMLFormElement>(null);

  const [
    state,
    formAction,
    pending,
  ] = useActionState(
    sendClientMessage,
    initialState,
  );

  useEffect(() => {
    if (state.status === "success") {
      formRef.current?.reset();
    }
  }, [
    state.status,
    state.resetKey,
  ]);

  return (
    <form
      ref={formRef}
      className={styles.form}
      action={formAction}
    >
      <input
        type="hidden"
        name="diagnosticId"
        value={diagnosticId}
      />

      <label>
        <span>
          {actionRequired
            ? "Responder à solicitação"
            : "Enviar uma mensagem"}
        </span>

        <textarea
          name="body"
          maxLength={3000}
          required
          disabled={pending}
          placeholder={
            actionRequired
              ? "Informe como a pendência foi atendida ou avise que os documentos complementares foram enviados."
              : "Digite uma dúvida ou informação complementar sobre o diagnóstico."
          }
        />
      </label>

      <div className={styles.formFooter}>
        <small>
          A mensagem ficará registrada no
          histórico deste diagnóstico.
        </small>

        <button
          type="submit"
          disabled={pending}
        >
          {pending
            ? "Enviando..."
            : "Enviar mensagem"}
        </button>
      </div>

      {state.message ? (
        <p
          className={
            state.status === "success"
              ? styles.successMessage
              : styles.errorMessage
          }
          role={
            state.status === "error"
              ? "alert"
              : "status"
          }
        >
          {state.message}
        </p>
      ) : null}
    </form>
  );
}