// C:\Users\Diana Voltolini\Documents\Aplicativo Saas\diana-app\app\redefinir-senha\password-reset-form.tsx

"use client";

import {
  useState,
} from "react";

import {
  updatePassword,
} from "./actions";

import styles from "../login/login.module.css";

function EyeIcon({
  hidden,
}: {
  hidden: boolean;
}) {
  if (hidden) {
    return (
      <svg
        width="22"
        height="22"
        viewBox="0 0 24 24"
        fill="none"
        aria-hidden="true"
      >
        <path
          d="M3 3L21 21"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
        />

        <path
          d="M10.6 10.7C10.2 11.1 10 11.5 10 12C10 13.1 10.9 14 12 14C12.5 14 12.9 13.8 13.3 13.4"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
        />

        <path
          d="M9.4 5.4C10.2 5.1 11.1 5 12 5C17.3 5 20.5 9.4 21 12C20.8 13.1 20.1 14.5 19 15.7M6.2 6.2C4.3 7.5 3.2 9.6 3 12C3.5 14.6 6.7 19 12 19C13.5 19 14.8 18.6 16 18"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
      </svg>
    );
  }

  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M3 12C3.5 9.4 6.7 5 12 5C17.3 5 20.5 9.4 21 12C20.5 14.6 17.3 19 12 19C6.7 19 3.5 14.6 3 12Z"
        stroke="currentColor"
        strokeWidth="1.8"
      />

      <circle
        cx="12"
        cy="12"
        r="3"
        stroke="currentColor"
        strokeWidth="1.8"
      />
    </svg>
  );
}

export function PasswordResetForm() {
  const [
    showPassword,
    setShowPassword,
  ] =
    useState(
      false,
    );

  const [
    showConfirmation,
    setShowConfirmation,
  ] =
    useState(
      false,
    );

  return (
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

          <div
            style={{
              position:
                "relative",
            }}
          >
            <input
              id="password"
              name="password"
              type={
                showPassword
                  ? "text"
                  : "password"
              }
              autoComplete="new-password"
              minLength={8}
              placeholder="Digite a nova senha"
              required
              style={{
                paddingRight:
                  "58px",
              }}
            />

            <button
              type="button"
              aria-label={
                showPassword
                  ? "Ocultar nova senha"
                  : "Visualizar nova senha"
              }
              aria-pressed={
                showPassword
              }
              onClick={() =>
                setShowPassword(
                  (
                    current,
                  ) =>
                    !current,
                )
              }
              style={{
                position:
                  "absolute",

                top:
                  "50%",

                right:
                  "12px",

                display:
                  "inline-flex",

                width:
                  "40px",

                height:
                  "40px",

                alignItems:
                  "center",

                justifyContent:
                  "center",

                border:
                  "0",

                borderRadius:
                  "6px",

                background:
                  "transparent",

                color:
                  "#536273",

                cursor:
                  "pointer",

                transform:
                  "translateY(-50%)",
              }}
            >
              <EyeIcon
                hidden={
                  !showPassword
                }
              />
            </button>
          </div>
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

          <div
            style={{
              position:
                "relative",
            }}
          >
            <input
              id="passwordConfirmation"
              name="passwordConfirmation"
              type={
                showConfirmation
                  ? "text"
                  : "password"
              }
              autoComplete="new-password"
              minLength={8}
              placeholder="Digite novamente"
              required
              style={{
                paddingRight:
                  "58px",
              }}
            />

            <button
              type="button"
              aria-label={
                showConfirmation
                  ? "Ocultar confirmação da senha"
                  : "Visualizar confirmação da senha"
              }
              aria-pressed={
                showConfirmation
              }
              onClick={() =>
                setShowConfirmation(
                  (
                    current,
                  ) =>
                    !current,
                )
              }
              style={{
                position:
                  "absolute",

                top:
                  "50%",

                right:
                  "12px",

                display:
                  "inline-flex",

                width:
                  "40px",

                height:
                  "40px",

                alignItems:
                  "center",

                justifyContent:
                  "center",

                border:
                  "0",

                borderRadius:
                  "6px",

                background:
                  "transparent",

                color:
                  "#536273",

                cursor:
                  "pointer",

                transform:
                  "translateY(-50%)",
              }}
            >
              <EyeIcon
                hidden={
                  !showConfirmation
                }
              />
            </button>
          </div>
        </div>
      </div>

      <div
        style={{
          border:
            "1px solid #D8E1E9",

          borderRadius:
            "8px",

          background:
            "#F8FAFC",

          padding:
            "13px 15px",
        }}
      >
        <p
          style={{
            margin:
              0,

            color:
              "#526170",

            fontSize:
              "0.92rem",

            lineHeight:
              1.55,
          }}
        >
          A nova senha deve ter pelo menos 8 caracteres e ser{" "}
          <strong
            style={{
              color:
                "#0D1B2A",
            }}
          >
            diferente da senha atual.
          </strong>
        </p>
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
  );
}