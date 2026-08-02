// app/login/page.tsx

import type { Metadata } from "next";
import Image from "next/image";

import { login } from "./actions";
import styles from "./login.module.css";

export const metadata: Metadata = {
  title: "Entrar",
};

type LoginPageProps = {
  searchParams: Promise<{
    erro?: string;
  }>;
};

const errorMessages: Record<string, string> = {
  "campos-obrigatorios": "Preencha o e-mail e a senha para continuar.",
  "credenciais-invalidas":
    "E-mail ou senha inválidos. Confira os dados e tente novamente.",
};

export default async function LoginPage({
  searchParams,
}: LoginPageProps) {
  const params = await searchParams;

  const errorMessage = params.erro
    ? errorMessages[params.erro]
    : null;

  return (
    <main className={styles.page}>
      <section className={styles.presentation}>
        <div className={styles.presentationContent}>
          <a
            href="https://dianavoltolini.com.br"
            aria-label="Acessar o site Diana Voltolini"
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
            <p className={styles.eyebrow}>Área exclusiva do cliente</p>

            <h1>
              Acompanhe seus serviços com clareza e segurança.
            </h1>

            <p>
              Consulte questionários, documentos enviados, pendências,
              andamento das análises e relatórios disponibilizados.
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
            <p className={styles.eyebrow}>Acesso do cliente</p>
            <h2>Entre na sua conta</h2>

            <p>
              Utilize o e-mail e a senha cadastrados para acessar o painel.
            </p>
          </header>

          {errorMessage ? (
            <div className={styles.errorMessage} role="alert">
              {errorMessage}
            </div>
          ) : null}

          <form className={styles.form} action={login}>
            <div className={styles.field}>
              <label htmlFor="email">E-mail</label>

              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                placeholder="seuemail@empresa.com.br"
                required
              />
            </div>

            <div className={styles.field}>
              <label htmlFor="password">Senha</label>

              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                placeholder="Digite sua senha"
                required
              />
            </div>

            <button className={styles.submitButton} type="submit">
              Entrar na área do cliente
            </button>
          </form>

          <div className={styles.information}>
            <strong>Ainda não recebeu seu acesso?</strong>

            <p>
              O cadastro será liberado após a confirmação da contratação e do
              pagamento do serviço.
            </p>
          </div>

          <a
            className={styles.backLink}
            href="https://dianavoltolini.com.br"
          >
            ← Voltar para o site
          </a>
        </div>
      </section>
    </main>
  );
}