import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import { useTranslation } from "react-i18next";
import { useApp } from "../../stores/app";

export interface RichEditorHandle {
  innerHTML: string;
  getContent: () => string;
  getText: () => string;
  setContent: (content: string) => void;
  focus: () => void;
}

type Editor = {
  getContent: (options?: { format: string }) => string;
  setContent: (content: string) => void;
  focus: () => void;
  destroy: () => void;
  on: (events: string, callback: () => void) => void;
};
type TinyMCE = {
  init: (options: Record<string, unknown>) => Promise<Editor[]>;
  activeEditor?: {
    editorUpload?: {
      blobCache?: {
        create: (
          id: string,
          file: File,
          base64: string,
        ) => { blobUri: () => string };
        add: (info: unknown) => void;
      };
    };
  };
};
declare global {
  interface Window {
    tinymce?: TinyMCE;
  }
}
let loader: Promise<TinyMCE> | undefined;
function loadTinyMCE() {
  if (window.tinymce) return Promise.resolve(window.tinymce);
  if (!loader)
    loader = new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = "/tinymce/tinymce.min.js";
      script.onload = () =>
        window.tinymce
          ? resolve(window.tinymce)
          : reject(new Error("TinyMCE failed to load"));
      script.onerror = () => reject(new Error("TinyMCE failed to load"));
      document.head.appendChild(script);
    });
  return loader;
}

export const RichEditor = forwardRef<
  RichEditorHandle,
  { value: string; onChange: (html: string, text: string) => void }
>(function RichEditor({ value, onChange }, ref) {
  const { i18n } = useTranslation();
  const theme = useApp((s) => s.theme);
  const [systemDark, setSystemDark] = useState(
    () => matchMedia("(prefers-color-scheme: dark)").matches,
  );
  const [loadError, setLoadError] = useState(false);
  useEffect(() => {
    const media = matchMedia("(prefers-color-scheme: dark)");
    const changed = () => setSystemDark(media.matches);
    media.addEventListener("change", changed);
    return () => media.removeEventListener("change", changed);
  }, []);
  const editor = useRef<Editor | null>(null);
  const textarea = useRef<HTMLTextAreaElement>(null);
  const latest = useRef({ value, onChange });
  latest.current = { value, onChange };
  const dark = theme === "dark" || (theme === "system" && systemDark);
  useImperativeHandle(
    ref,
    () => ({
      get innerHTML() {
        return editor.current?.getContent() || latest.current.value;
      },
      set innerHTML(content: string) {
        editor.current?.setContent(content);
        latest.current.value = content;
      },
      getContent: () => editor.current?.getContent() || latest.current.value,
      getText: () =>
        editor.current?.getContent({ format: "text" }) ||
        latest.current.value.replace(/<[^>]*>/g, " "),
      setContent: (content) => editor.current?.setContent(content),
      focus: () => editor.current?.focus(),
    }),
    [],
  );
  useEffect(() => {
    let active = true;
    let instance: Editor | null = null;
    loadTinyMCE()
      .then(async (tiny) => {
        if (!active || !textarea.current) return;
        const editors = await tiny.init({
          target: textarea.current,
          statusbar: false,
          height: "100%",
          forced_root_block: "div",
          skin: dark ? "oxide-dark" : "oxide",
          content_css: `/tinymce/css/index.css,${dark ? "dark" : "default"}`,
          content_style: `:root{--scrollbar-track-color:${dark ? "#141414" : "#FFFFFF"};--scrollbar-thumb-color:${dark ? "#8D9095" : "#A8ABB2"}}`,
          plugins:
            "link image advlist lists emoticons fullscreen table preview code",
          toolbar:
            "bold emoticons forecolor backcolor italic fontsize | alignleft aligncenter alignright alignjustify | outdent indent | bullist numlist | link image | table code preview fullscreen",
          toolbar_mode: "scrolling",
          font_size_formats: "8px 10px 12px 14px 16px 18px 24px 36px",
          emoticons_search: false,
          language: i18n.language === "zh" ? "zh_CN" : "en",
          language_load: true,
          menubar: false,
          license_key: "gpl",
          noneditable_class: "mceNonEditable",
          autofocus: true,
          branding: false,
          file_picker_types: "image",
          image_dimensions: false,
          image_description: false,
          link_title: false,
          dialog_type: "none",
          file_picker_callback: (
            callback: (uri: string, meta: { title: string }) => void,
          ) => {
            const input = document.createElement("input");
            input.type = "file";
            input.accept = "image/*";
            input.addEventListener("change", () => {
              const file = input.files?.[0];
              if (!file) return;
              const reader = new FileReader();
              reader.onload = () => {
                const image = String(reader.result);
                const cache = tiny.activeEditor?.editorUpload?.blobCache;
                if (cache) {
                  const info = cache.create(
                    `blobid${Date.now()}`,
                    file,
                    image.split(",")[1],
                  );
                  cache.add(info);
                  callback(info.blobUri(), { title: file.name });
                } else callback(image, { title: file.name });
              };
              reader.readAsDataURL(file);
            });
            input.click();
          },
          setup: (ed: Editor) => {
            instance = ed;
            ed.on("init", () => {
              editor.current = ed;
              ed.setContent(latest.current.value || "");
            });
            ed.on("input change", () =>
              latest.current.onChange(
                ed.getContent(),
                ed.getContent({ format: "text" }),
              ),
            );
          },
        });
        if (!active) editors.forEach((ed) => ed.destroy());
      })
      .catch(() => {
        if (active) setLoadError(true);
      });
    return () => {
      active = false;
      instance?.destroy();
      editor.current = null;
    };
  }, [dark, i18n.language]);
  useEffect(() => {
    if (editor.current && editor.current.getContent() !== value)
      editor.current.setContent(value);
  }, [value]);
  return loadError ? (
    <textarea
      className="compose-source"
      value={value}
      onChange={(e) =>
        onChange(e.target.value, e.target.value.replace(/<[^>]*>/g, " "))
      }
      aria-label="HTML"
    />
  ) : (
    <div className="rich-editor">
      <textarea ref={textarea} aria-label="Message" />
    </div>
  );
});
