// C:\Users\Diana Voltolini\Documents\Aplicativo Saas\diana-app\app\esqueci-senha\page.tsx

import type {
  Metadata,
} from "next";
import Image from "next/image";

import {
  requestPasswordReset,
} from "./actions";

import styles from "../login/login.module.css";

export const metadata: Metadata = {
  title:
    "Recuperar senha",
};

type ForgotPasswordPageProps = {
  searchParams: Promise<{
    erro?: string;
    sucesso?: string;
    email?: string;
  }>;
};

const errorMessages:
  Record<
    string,
    string
  > = {
  "email-obrigatorio":
    "Informe seu e-mail para continuar.",

  "envio-falhou":
    "Não foi possível enviar o e-mail de recuperação neste momento. Tente novamente.",
};

export default async function ForgotPasswordPage({
  searchParams,
}: ForgotPasswordPageProps) {
  const params =
    await searchParams;

  const email =
    params.email
      ?.trim()
      .toLowerCase() ??
    "";

  const errorMessage =
    params.erro
      ? errorMessages[
          params.erro
        ]
      : null;

  const success =
    params.sucesso ===
    "1";

  return (
    <main
      className={
        styles.page
      }
    >
      <section
        className={
          styles.presentation
        }
      >
        <div
          className={
            styles.presentationContent
          }
        >
          <a
            href="https://dianavoltolini.com.br"
            aria-label="Acessar o site Diana Voltolini"
            className={
              styles.logoLink
            }
          >
            <Image
              className={
                styles.logo
              }
              src="/brand/logo-dark.png"
              alt="Diana Voltolini"
              width={1535}
              height={538}
              priority
            />
          </a>

          <div
            className={
              styles.presentationText
            }
          >
            <p
              className={
                styles.eyebrow
              }
            >
              Área exclusiva do cliente
            </p>

            <h1>
              Recupere o acesso à sua conta.
            </h1>

            <p>
              Solicite um link seguro para cadastrar uma nova senha.
            </p>
          </div>

          <p
            className={
              styles.slogan
            }
          >
            Transformando complexidade fiscal em segurança empresarial.
          </p>
        </div>
      </section>

      <section
        className={
          styles.access
        }
      >
        <div
          className={
            styles.accessContent
          }
        >
          <header
            className={
              styles.header
            }
          >
            <p
              className={
                styles.eyebrow
              }
            >
              Recuperação de acesso
            </p>

            <h2>
              Esqueceu sua senha?
            </h2>

            <p>
              Informe o e-mail utilizado no cadastro.
            </p>
          </header>

          <div
            className={
              styles.formBlock
            }
          >
            {
              success
                ? (
                    <div
                      className={
                        styles.successMessage
                      }
                      role="status"
                    >
                      <strong>
                        Verifique seu e-mail.
                      </strong>

                      <p>
                        Se o endereço informado estiver cadastrado,
                        você receberá uma mensagem com o link para
                        criar uma nova senha.
                      </p>

                      <p>
                        Verifique também as pastas de spam e lixo
                        eletrônico.
                      </p>
                    </div>
                  )
                : null
            }

            {
              errorMessage
                ? (
                    <div
                      className={
                        styles.errorMessage
                      }
                      role="alert"
                    >
                      {
                        errorMessage
                      }
                    </div>
                  )
                : null
            }

            <form
              className={
                styles.form
              }
              action={
                requestPasswordReset
              }
            >
              <div
                className={
                  styles.field
                }
              >
                <label
                  htmlFor="email"
                >
                  E-mail
                </label>

                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  placeholder="seuemail@empresa.com.br"
                  defaultValue={
                    email
                  }
                  required
                />
              </div>

              <button
                className={
                  styles.submitButton
                }
                type="submit"
              >
                Enviar link de recuperação
              </button>
            </form>
          </div>

          <div
            className={
              styles.accessFooter
            }
          >
            <a
              className={
                styles.backLink
              }
              href="/login"
            >
              ← Voltar para o login
            </a>
          </div>
        </div>
      </section>
    </main>
  );
}