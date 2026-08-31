// C:\Users\Diana Voltolini\Documents\Aplicativo Saas\diana-app\app\redefinir-senha\page.tsx

import type {
  Metadata,
} from "next";
import Image from "next/image";
import {
  redirect,
} from "next/navigation";

import {
  createClient,
} from "@/lib/supabase/server";

import {
  updatePassword,
} from "./actions";

import styles from "../login/login.module.css";

export const metadata: Metadata = {
  title:
    "Criar nova senha",
};

type ResetPasswordPageProps = {
  searchParams: Promise<{
    erro?: string;
  }>;
};

const errorMessages:
  Record<
    string,
    string
  > = {
  "campos-obrigatorios":
    "Preencha e confirme a nova senha.",

  "senha-curta":
    "A nova senha deve ter pelo menos 8 caracteres.",

  "senhas-diferentes":
    "As senhas informadas não são iguais.",

  "alteracao-falhou":
    "Não foi possível alterar sua senha. Solicite um novo link de recuperação e tente novamente.",
};

export default async function ResetPasswordPage({
  searchParams,
}: ResetPasswordPageProps) {
  const params =
    await searchParams;

  const supabase =
    await createClient();

  const {
    data: {
      user,
    },
  } =
    await supabase.auth
      .getUser();

  if (!user) {
    redirect(
      "/login?erro=recuperacao-invalida",
    );
  }

  const errorMessage =
    params.erro
      ? errorMessages[
          params.erro
        ]
      : null;

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
              Crie uma nova senha para sua conta.
            </h1>

            <p>
              Escolha uma senha segura para voltar a acessar
              seus serviços e documentos.
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
              Redefinição de senha
            </p>

            <h2>
              Crie sua nova senha
            </h2>

            <p>
              Utilize pelo menos 8 caracteres e confirme a senha abaixo.
            </p>
          </header>

          <div
            className={
              styles.formBlock
            }
          >
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
                updatePassword
              }
            >
              <div
                className={
                  styles.passwordGrid
                }
              >
                <div
                  className={
                    styles.field
                  }
                >
                  <label
                    htmlFor="password"
                  >
                    Nova senha
                  </label>

                  <input
                    id="password"
                    name="password"
                    type="password"
                    autoComplete="new-password"
                    minLength={8}
                    placeholder="Digite a nova senha"
                    required
                  />
                </div>

                <div
                  className={
                    styles.field
                  }
                >
                  <label
                    htmlFor="passwordConfirmation"
                  >
                    Confirmar senha
                  </label>

                  <input
                    id="passwordConfirmation"
                    name="passwordConfirmation"
                    type="password"
                    autoComplete="new-password"
                    minLength={8}
                    placeholder="Digite novamente"
                    required
                  />
                </div>
              </div>

              <button
                className={
                  styles.submitButton
                }
                type="submit"
              >
                Salvar nova senha
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