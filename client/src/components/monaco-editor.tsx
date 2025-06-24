import { useEffect, useRef, forwardRef, useImperativeHandle } from "react";
import * as monaco from "monaco-editor";
import { Change } from "@shared/schema";

interface MonacoEditorProps {
  value: string;
  onChange: (value: string) => void;
  changes?: Change[];
  onAcceptChange?: (changeId: string) => void;
  onRejectChange?: (changeId: string) => void;
  readOnly?: boolean;
  className?: string;
}

export interface MonacoEditorRef {
  focus: () => void;
  getValue: () => string;
  setValue: (value: string) => void;
}

const MonacoEditor = forwardRef<MonacoEditorRef, MonacoEditorProps>(({
  value,
  onChange,
  changes = [],
  onAcceptChange,
  onRejectChange,
  readOnly = false,
  className = "",
}, ref) => {
  const editorRef = useRef<HTMLDivElement>(null);
  const monacoInstanceRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null);

  useImperativeHandle(ref, () => ({
    focus: () => monacoInstanceRef.current?.focus(),
    getValue: () => monacoInstanceRef.current?.getValue() || "",
    setValue: (value: string) => monacoInstanceRef.current?.setValue(value),
  }));

  useEffect(() => {
    if (!editorRef.current) return;

    // Initialize Monaco Editor
    const editor = monaco.editor.create(editorRef.current, {
      value: value || "",
      language: "plaintext",
      theme: "vs-dark",
      readOnly,
      fontSize: 14,
      fontFamily: "JetBrains Mono, Monaco, Consolas, monospace",
      lineNumbers: "on",
      minimap: { enabled: false },
      scrollBeyondLastLine: false,
      wordWrap: "on",
      automaticLayout: true,
    });

    monacoInstanceRef.current = editor;

    // Listen for content changes
    const disposable = editor.onDidChangeModelContent(() => {
      const newValue = editor.getValue();
      onChange(newValue);
    });

    return () => {
      disposable.dispose();
      editor.dispose();
    };
  }, []);

  // Update editor value when prop changes
  useEffect(() => {
    if (monacoInstanceRef.current && monacoInstanceRef.current.getValue() !== (value || "")) {
      monacoInstanceRef.current.setValue(value || "");
    }
  }, [value]);

  // Add change decorations
  useEffect(() => {
    if (!monacoInstanceRef.current || !changes) return;

    const decorations = changes.map((change) => {
      let className = "";
      switch (change.type) {
        case "addition":
          className = change.status === "accepted" ? "accepted-addition" : "pending-addition";
          break;
        case "deletion":
          className = change.status === "accepted" ? "accepted-deletion" : "pending-deletion";
          break;
        case "modification":
          className = change.status === "accepted" ? "accepted-modification" : "pending-modification";
          break;
      }

      return {
        range: new monaco.Range(change.lineNumber, 1, change.lineNumber, 1),
        options: {
          isWholeLine: true,
          className,
          glyphMarginClassName: `change-glyph ${change.status}`,
          glyphMarginHoverMessage: {
            value: `${change.type} - ${change.status}`,
          },
        },
      };
    });

    monacoInstanceRef.current.deltaDecorations([], decorations);
  }, [changes]);

  // Add CSS for change styling
  useEffect(() => {
    const style = document.createElement("style");
    style.textContent = `
      .pending-addition {
        background-color: rgba(40, 167, 69, 0.2);
        border-left: 4px solid #28a745;
      }
      .accepted-addition {
        background-color: rgba(40, 167, 69, 0.1);
        border-left: 2px solid #28a745;
      }
      .pending-deletion {
        background-color: rgba(220, 53, 69, 0.2);
        border-left: 4px solid #dc3545;
        text-decoration: line-through;
      }
      .accepted-deletion {
        display: none;
      }
      .pending-modification {
        background-color: rgba(255, 193, 7, 0.2);
        border-left: 4px solid #ffc107;
      }
      .accepted-modification {
        background-color: rgba(255, 193, 7, 0.1);
        border-left: 2px solid #ffc107;
      }
      .change-glyph.pending::before {
        content: "●";
        color: #ffc107;
      }
      .change-glyph.accepted::before {
        content: "✓";
        color: #28a745;
      }
      .change-glyph.rejected::before {
        content: "✗";
        color: #dc3545;
      }
    `;
    document.head.appendChild(style);

    return () => {
      document.head.removeChild(style);
    };
  }, []);

  return <div ref={editorRef} className={`h-full w-full ${className}`} />;
});

export default MonacoEditor;
