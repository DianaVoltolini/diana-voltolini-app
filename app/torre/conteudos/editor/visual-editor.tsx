"use client";
import {useEditor,EditorContent} from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import {Markdown} from "@tiptap/markdown";
import Table from "@tiptap/extension-table";
import TableRow from "@tiptap/extension-table-row";
import TableHeader from "@tiptap/extension-table-header";
import TableCell from "@tiptap/extension-table-cell";
import css from "./visual-editor.module.css";
export default function VisualEditor({value,onChange}:{value:string;onChange:(markdown:string)=>void}){
 const editor=useEditor({
  immediatelyRender:false,
  extensions:[StarterKit,Table,TableRow,TableHeader,TableCell,Markdown.configure({markedOptions:{gfm:true}})],
  content:value||"<p></p>",contentType:value?"markdown":"html",
  onUpdate:({editor})=>onChange(editor.getMarkdown()),
 });
 if(!editor)return <p>Carregando editor visual…</p>;
 const action=(label:string,cb:()=>void,active=false)=><button type="button" className={active?css.active:css.button} onClick={cb}>{label}</button>;
 return <div className={css.wrap}>
  <div className={css.toolbar} role="toolbar" aria-label="Ferramentas do editor visual">
   {action("Parágrafo",()=>editor.chain().focus().setParagraph().run())}
   {action("Título",()=>editor.chain().focus().toggleHeading({level:2}).run(),editor.isActive("heading",{level:2}))}
   {action("Subtítulo",()=>editor.chain().focus().toggleHeading({level:3}).run(),editor.isActive("heading",{level:3}))}
   {action("Negrito",()=>editor.chain().focus().toggleBold().run(),editor.isActive("bold"))}
   {action("Itálico",()=>editor.chain().focus().toggleItalic().run(),editor.isActive("italic"))}
   {action("Lista",()=>editor.chain().focus().toggleBulletList().run(),editor.isActive("bulletList"))}
   {action("Numerada",()=>editor.chain().focus().toggleOrderedList().run(),editor.isActive("orderedList"))}
   {action("Tabela",()=>editor.chain().focus().insertTable({rows:3,cols:3,withHeaderRow:true}).run())}
   {editor.isActive("table")&&action("Adicionar linha",()=>editor.chain().focus().addRowAfter().run())}
   {editor.isActive("table")&&action("Adicionar coluna",()=>editor.chain().focus().addColumnAfter().run())}
   {editor.isActive("table")&&action("Excluir tabela",()=>editor.chain().focus().deleteTable().run())}
  </div>
  <EditorContent editor={editor} className={css.content}/>
 </div>;
}