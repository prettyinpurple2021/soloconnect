import React from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import Placeholder from '@tiptap/extension-placeholder';
import { Bold, Italic, Link as LinkIcon, Unlink } from 'lucide-react';
import { cn } from '../lib/utils';

interface RichTextEditorProps {
  content: string;
  onChange: (content: string) => void;
  placeholder?: string;
  className?: string;
}

export function RichTextEditor({ content, onChange, placeholder, className }: RichTextEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: 'text-primary underline cursor-pointer',
        },
      }),
      Placeholder.configure({
        placeholder: placeholder || 'TRANSMIT_DATA_HERE...',
        emptyEditorClass: 'is-editor-empty',
      }),
    ],
    content: content,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
    editorProps: {
      attributes: {
        class: cn(
          'prose prose-invert max-w-none focus:outline-none min-h-[160px] p-6 text-xl font-bold uppercase italic tracking-tight',
          className
        ),
      },
    },
  });

  // Update editor content when external content changes (e.g. from AI assist)
  React.useEffect(() => {
    if (editor && content !== editor.getHTML()) {
      editor.commands.setContent(content);
    }
  }, [content, editor]);

  const setLink = React.useCallback(() => {
    const previousUrl = editor?.getAttributes('link').href;
    const url = window.prompt('URL', previousUrl);

    // cancelled
    if (url === null) {
      return;
    }

    // empty
    if (url === '') {
      editor?.chain().focus().extendMarkRange('link').unsetLink().run();
      return;
    }

    // update link
    editor?.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
  }, [editor]);

  if (!editor) {
    return null;
  }

  return (
    <div className="w-full bg-surface-bg border-[6px] border-on-surface focus-within:border-primary transition-colors relative">
      <div className="flex items-center gap-1 p-2 border-b-[4px] border-on-surface bg-black/20">
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBold().run()}
          className={cn(
            "p-2 border-[3px] border-on-surface shadow-kinetic-thud transition-all",
            editor.isActive('bold') ? "bg-primary text-black border-black" : "bg-surface-bg text-on-surface hover:bg-accent hover:text-black hover:border-black"
          )}
          title="Bold"
        >
          <Bold className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleItalic().run()}
          className={cn(
            "p-2 border-[3px] border-on-surface shadow-kinetic-thud transition-all",
            editor.isActive('italic') ? "bg-primary text-black border-black" : "bg-surface-bg text-on-surface hover:bg-accent hover:text-black hover:border-black"
          )}
          title="Italic"
        >
          <Italic className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={setLink}
          className={cn(
            "p-2 border-[3px] border-on-surface shadow-kinetic-thud transition-all",
            editor.isActive('link') ? "bg-primary text-black border-black" : "bg-surface-bg text-on-surface hover:bg-accent hover:text-black hover:border-black"
          )}
          title="Add Link"
        >
          <LinkIcon className="w-4 h-4" />
        </button>
        {editor.isActive('link') && (
          <button
            type="button"
            onClick={() => editor.chain().focus().unsetLink().run()}
            className="p-2 border-[3px] border-on-surface shadow-kinetic-thud bg-surface-bg text-on-surface hover:bg-secondary hover:text-black hover:border-black transition-all"
            title="Remove Link"
          >
            <Unlink className="w-4 h-4" />
          </button>
        )}
      </div>
      <EditorContent editor={editor} />
    </div>
  );
}
