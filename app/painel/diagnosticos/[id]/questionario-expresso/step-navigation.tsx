// C:\Users\Diana Voltolini\Documents\Aplicativo Saas\diana-app\app\painel\diagnosticos\[id]\questionario-expresso\step-navigation.tsx

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import styles from "./questionario-expresso.module.css";

type StepItem = {
  number: string;
  title: string;
  description: string;
  href: string;
  ratio: number;
  enabled: boolean;
  reviewReady?: boolean;
};

type StepNavigationProps = {
  steps: StepItem[];
};

function normalizePath(value: string) {
  if (value.length > 1) {
    return value.replace(/\/+$/, "");
  }

  return value;
}

function getStepStatus(
  step: StepItem,
  isActive: boolean,
) {
  if (isActive) {
    return "Etapa atual";
  }

  if (step.reviewReady) {
    return "Pronta para revisão";
  }

  if (step.ratio >= 1) {
    return "Concluída";
  }

  if (!step.enabled) {
    return "Aguardando etapa anterior";
  }

  if (step.ratio > 0) {
    return "Em preenchimento";
  }

  return "Disponível";
}

export default function StepNavigation({
  steps,
}: StepNavigationProps) {
  const pathname =
    normalizePath(usePathname());

  return (
    <nav
      className={styles.stepNavigation}
      aria-label="Etapas do questionário"
    >
      {steps.map((step) => {
        const isActive =
          pathname ===
          normalizePath(step.href);

        const content = (
          <>
            <span
              className={styles.stepNumber}
              style={
                isActive
                  ? {
                      background:
                        "#c9a227",
                      color: "#0d1b2a",
                    }
                  : undefined
              }
            >
              {step.number}
            </span>

            <div>
              <strong>
                {step.title}
              </strong>

              <small>
                {step.description}
              </small>

              <b
                style={
                  isActive
                    ? {
                        color:
                          "#846611",
                      }
                    : undefined
                }
              >
                {getStepStatus(
                  step,
                  isActive,
                )}
              </b>
            </div>
          </>
        );

        if (!step.enabled) {
          return (
            <div
              key={step.number}
              className={
                styles.disabledStep
              }
              aria-disabled="true"
            >
              {content}
            </div>
          );
        }

        return (
          <Link
            key={step.number}
            href={step.href}
            aria-current={
              isActive
                ? "step"
                : undefined
            }
            style={
              isActive
                ? {
                    background:
                      "#fffaf0",
                    boxShadow:
                      "inset 4px 0 0 #c9a227",
                  }
                : undefined
            }
          >
            {content}
          </Link>
        );
      })}
    </nav>
  );
}
