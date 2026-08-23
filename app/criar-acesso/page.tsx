// C:\Users\Diana Voltolini\Documents\Aplicativo Saas\diana-app\app\criar-acesso\page.tsx

import type { Metadata } from "next";
import Image from "next/image";

import { createAccess } from "./actions";
import styles from "../login/login.module.css";

export const metadata: Metadata = {
  title: "Criar acesso",
};

type CriarAcessoPageProps = {
  searchParams: Promise<{
    erro?: string;
    sucesso?: string;
    email?: string;
  }>;
};

const errorMessages: Record<string, string> = {
  "nome-invalido":
    "Informe seu nome completo para continuar.",

  "email-invalido":
    "Informe um e-mail válido.",

  "senha-curta":
    "A senha deve possuir pelo menos 8 caracteres.",

  "senhas-diferentes":
    "As senhas informadas não são iguais.",

  "sem-contratacao":
    "Não encontramos uma cobrança ativa para este e-mail. Utilize o mesmo e-mail informado no checkout.",

  "verificacao-indisponivel":
    "Não foi possível verificar sua contratação agora. Tente novamente em instantes.",

  "cadastro-indisponivel":
    "Não foi possível criar seu acesso neste momento. Tente novamente.",

  "vinculo-indisponivel":
    "Não foi possível vincular sua contratação ao acesso neste momento.",
};

export default async function CriarAcessoPage({
  searchParams,
}: CriarAcessoPageProps) {
  const params = await searchParams;

  const errorMessage = params.erro
    ? errorMessages[params.erro]
    : null;

  const email =
    params.email?.trim().toLowerCase() ?? "";

  const success =
    params.sucesso === "verifique-email";

  return (
    <main className={styles.page}>
      <section className={styles.presentation}>
        <div className={styles.presentationContent}>
          <a
            href="https://dianavoltolini.com.br"
            aria-label="Acessar o site Diana Voltolini"
            className={styles.logoLink}
          >
            <Image
              className={styles.logo}
              src="/brand/logo-dark.png"
              alt="Diana Voltolini"
              width={1535}
              height={538}
              priority
            />
          </a>

          <div className={styles.presentationText}>
            <p className={styles.eyebrow}>
              Área exclusiva do cliente
            </p>

            <h1>
              Acompanhe seus serviços com clareza e segurança.
            </h1>

            <p>
              Consulte cobranças, pagamentos, questionários,
              documentos, pendências e o andamento das análises.
            </p>
          </div>

          <p className={styles.slogan}>
            Transformando complexidade fiscal em segurança empresarial.
          </p>
        </div>
      </section>

      <section className={styles.access}>
        <div className={styles.accessContent}>
          <header className={styles.header}>
            <p className={styles.eyebrow}>
              Primeiro acesso
            </p>

            <h2>Crie sua conta</h2>

            <p>
              Utilize o mesmo e-mail informado ao gerar sua cobrança.
            </p>
          </header>

          <div className={styles.formBlock}>
            {errorMessage ? (
              <div
                className={styles.errorMessage}
                role="alert"
              >
                {errorMessage}
              </div>
            ) : null}

            {success ? (
              <div className={styles.successMessage}>
                <strong>
                  Falta apenas confirmar seu e-mail.
                </strong>

                <p>
                  Enviamos uma mensagem para{" "}
                  <b>{email}</b>.
                </p>

                <p>
                  Clique no link recebido. Após a confirmação,
                  você será encaminhado automaticamente para sua
                  área do cliente.
                </p>
              </div>
            ) : (
              <form
                className={styles.form}
                action={createAccess}
              >
                <div className={styles.field}>
                  <label htmlFor="fullName">
                    Nome completo
                  </label>

                  <input
                    id="fullName"
                    name="fullName"
                    type="text"
                    autoComplete="name"
                    placeholder="Seu nome completo"
                    required
                  />
                </div>

                <div className={styles.field}>
                  <label htmlFor="email">
                    E-mail
                  </label>

                  <input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    placeholder="seuemail@empresa.com.br"
                    defaultValue={email}
                    required
                  />
                </div>

                <div className={styles.passwordGrid}>
                  <div className={styles.field}>
                    <label htmlFor="password">
                      Crie uma senha
                    </label>

                    <input
                      id="password"
                      name="password"
                      type="password"
                      autoComplete="new-password"
                      placeholder="Mínimo de 8 caracteres"
                      minLength={8}
                      required
                    />
                  </div>

                  <div className={styles.field}>
                    <label htmlFor="passwordConfirmation">
                      Confirme a senha
                    </label>

                    <input
                      id="passwordConfirmation"
                      name="passwordConfirmation"
                      type="password"
                      autoComplete="new-password"
                      placeholder="Digite novamente"
                      minLength={8}
                      required
                    />
                  </div>
                </div>

                <button
                  className={styles.submitButton}
                  type="submit"
                >
                  Criar meu acesso
                </button>
              </form>
            )}
          </div>

          <div className={styles.accessFooter}>
            <a
              className={styles.backLink}
              href="https://dianavoltolini.com.br"
            >
              ← Voltar para o site
            </a>
          </div>
        </div>
      </section>
    </main>
  );
}