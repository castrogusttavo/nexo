import TaskItem from "@tiptap/extension-task-item";
import TaskList from "@tiptap/extension-task-list";
import StarterKit from "@tiptap/starter-kit";
import { Extensions } from "@tiptap/react";
import { Table, TableCell, TableHeader, TableRow } from "@tiptap/extension-table"
import { Link } from "@tiptap/extension-link"
import { Underline } from "@tiptap/extension-underline"
import { TextAlign } from "@tiptap/extension-text-align"
import { TextStyle } from "@tiptap/extension-text-style"
import { Color } from "@tiptap/extension-color"
import { Highlight } from "@tiptap/extension-highlight"
import { Placeholder } from "@tiptap/extension-placeholder"
import { EditorVideo } from "./video-node";
import { EditorImage } from "./image-node";
import { ExternalEmbed } from "./external-embed-node";
import { InternalEmbed } from "./internal-embed-node";
import { MermaidDiagram } from "./mermaid-node";
import { BlockEquation, InlineEquation } from "./equation-node";
import { Callout } from "./callout-node";
import { Columns, Column } from "./columns-node"

export function getEditorExtensions(options: { workspaceId: string; projectSlug: string }): Extensions {
  return [
    StarterKit.configure({
      heading: { levels: [1, 2, 3, 4, 5, 6] }
    }),
    TaskList,
    TaskItem.configure({ nested: true }),
    Table.configure({ resizable: true }),
    TableRow,
    TableHeader,
    TableCell,
    Link.configure({ openOnClick: false, autolink: true }),
    Underline,
    TextAlign.configure({ types: ['heading', 'paragraph'] }),
    TextStyle,
    Color,
    Highlight.configure({ multicolor: true }),
    Placeholder.configure({ placeholder: "Digite '/' para ver os comandos..." }),
    EditorImage.configure(options),
    EditorVideo.configure(options),
    ExternalEmbed.configure(options),
    InternalEmbed.configure(options),
    MermaidDiagram,
    InlineEquation,
    BlockEquation,
    Callout,
    Columns,
    Column
  ]
}
