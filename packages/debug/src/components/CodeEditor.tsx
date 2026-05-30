import { javascript } from "@codemirror/lang-javascript";
import { json } from "@codemirror/lang-json";
import { indentUnit } from "@codemirror/language";
import { EditorState } from "@codemirror/state";
import { basicSetup, EditorView } from "codemirror";
import { useEffect, useRef } from "react";

type CodeEditorLanguage = "javascript" | "json";

type CodeEditorProps = {
	language: CodeEditorLanguage;
	onChange?: (value: string) => void;
	readOnly?: boolean;
	value: string;
};

const editorLayout = EditorView.theme({
	"&": {
		height: "100%",
	},
	".cm-content": {
		minWidth: "max-content",
	},
	".cm-scroller": {
		overflow: "auto",
	},
});

export const CodeEditor = ({ language, onChange, readOnly, value }: CodeEditorProps) => {
	const hostRef = useRef<HTMLDivElement>(null);
	const initialValueRef = useRef(value);
	const viewRef = useRef<EditorView | null>(null);
	const onChangeRef = useRef(onChange);

	useEffect(() => {
		onChangeRef.current = onChange;
	}, [onChange]);

	useEffect(() => {
		if (!hostRef.current) {
			return;
		}

		const view = new EditorView({
			doc: initialValueRef.current,
			extensions: [
				basicSetup,
				EditorState.tabSize.of(4),
				indentUnit.of("\t"),
				language === "javascript" ? javascript() : json(),
				EditorState.readOnly.of(readOnly ?? false),
				EditorView.updateListener.of((update) => {
					if (update.docChanged) {
						onChangeRef.current?.(update.state.doc.toString());
					}
				}),
				editorLayout,
			],
			parent: hostRef.current,
		});
		viewRef.current = view;

		return () => {
			view.destroy();
			viewRef.current = null;
		};
	}, [language, readOnly]);

	useEffect(() => {
		const view = viewRef.current;
		if (!view) {
			return;
		}

		const currentValue = view.state.doc.toString();
		if (value === currentValue) {
			return;
		}

		view.dispatch({
			changes: {
				from: 0,
				insert: value,
				to: currentValue.length,
			},
		});
	}, [value]);

	return (
		<div className={"h-full min-h-0 min-w-0 overflow-hidden rounded border border-[#d9e0ea] bg-white"} ref={hostRef} />
	);
};
