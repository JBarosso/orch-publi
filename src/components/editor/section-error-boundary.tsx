"use client";

import { Component, type ReactNode } from "react";

interface Props {
  label: string;
  /** Change (ex: contenu de la section modifié) = on retente l'affichage. */
  resetKey?: unknown;
  children: ReactNode;
}

interface State {
  error: Error | null;
  resetKey: unknown;
}

// Sans elle, une erreur dans l'éditeur ou l'aperçu d'une seule section
// (contenu inattendu, texte collé exotique...) démonte toute la page du brief
// et fait perdre le travail non enregistré. Ici, seule la section concernée
// affiche un message ; le reste du brief et l'enregistrement restent utilisables.
export class SectionErrorBoundary extends Component<Props, State> {
  state: State = { error: null, resetKey: this.props.resetKey };

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { error };
  }

  static getDerivedStateFromProps(props: Props, state: State): Partial<State> | null {
    return props.resetKey !== state.resetKey ? { error: null, resetKey: props.resetKey } : null;
  }

  componentDidCatch(error: Error) {
    console.error(`Section « ${this.props.label} » :`, error);
  }

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;
    return (
      <div role="alert" className="space-y-1 rounded-lg border border-destructive/40 bg-destructive/5 p-3 text-sm">
        <p className="font-medium text-destructive">Affichage impossible pour « {this.props.label} »</p>
        <p className="break-all text-xs text-muted-foreground">
          Le reste du brief reste utilisable et enregistrable. Détail : {error.message}
        </p>
        <button
          type="button"
          onClick={() => this.setState({ error: null })}
          className="text-xs text-primary hover:underline"
        >
          Réessayer
        </button>
      </div>
    );
  }
}
