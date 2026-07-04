import React, {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
}

class ErrorBoundary extends React.Component<any, any> {
  public state: any = {
    hasError: false,
    error: null,
    errorInfo: null
  };

  public static getDerivedStateFromError(error: Error): any {
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    (this as any).setState({ error, errorInfo });
    console.error("Uncaught React Error:", error, errorInfo);
  }

  public render() {
    if ((this as any).state.hasError) {
      return (
        <div style={{ padding: "30px", background: "#fffaf0", color: "#744210", fontFamily: "system-ui, -apple-system, sans-serif", margin: "20px", borderRadius: "12px", border: "2px solid #feebc8", boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.05)" }}>
          <h2 style={{ margin: "0 0 12px 0", color: "#c05621", fontSize: "20px", fontWeight: "800" }}>⚠️ Ocorreu um erro no carregamento do aplicativo</h2>
          <p style={{ fontSize: "14px", fontWeight: "600", color: "#dd6b20", marginBottom: "15px" }}>
            Mensagem do Erro: {(this as any).state.error ? (this as any).state.error.message : "Erro desconhecido"}
          </p>
          <div style={{ marginBottom: "20px" }}>
            <span style={{ fontSize: "12px", fontWeight: "700", textTransform: "uppercase", letterSpacing: "0.05em", color: "#a0aec0" }}>Rastro do Erro:</span>
            <pre style={{ background: "#2d3748", color: "#f7fafc", padding: "15px", borderRadius: "8px", fontSize: "11px", overflowX: "auto", fontFamily: "monospace", marginTop: "5px" }}>
              {(this as any).state.error ? (this as any).state.error.stack : ""}
              {"\n"}
              {(this as any).state.errorInfo ? (this as any).state.errorInfo.componentStack : ""}
            </pre>
          </div>
          <div style={{ display: "flex", gap: "12px" }}>
            <button 
              onClick={() => { localStorage.clear(); window.location.reload(); }}
              style={{ padding: "10px 20px", background: "#dd6b20", color: "#fff", border: "none", borderRadius: "8px", cursor: "pointer", fontWeight: "bold", fontSize: "12px" }}
            >
              Limpar Dados de Cache (localStorage) e Recarregar
            </button>
            <button 
              onClick={() => window.location.reload()}
              style={{ padding: "10px 20px", background: "#4a5568", color: "#fff", border: "none", borderRadius: "8px", cursor: "pointer", fontWeight: "bold", fontSize: "12px" }}
            >
              Recarregar Página
            </button>
          </div>
        </div>
      );
    }

    return (this as any).props.children;
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
);
