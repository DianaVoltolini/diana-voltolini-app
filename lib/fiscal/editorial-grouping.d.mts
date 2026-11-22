export type EditorialHeadingKind="example"|"conclusion"|"procedure"|"attention";
export interface EditorialMarkdownToken{
 type:string;
 text?:string;
 depth?:number;
 [key:string]:unknown;
}
export function editorialHeadingKind(value:string):EditorialHeadingKind|null;
export function groupEditorialSections<T extends EditorialMarkdownToken>(tokens:T[]):Array<{kind:EditorialHeadingKind|null;tokens:T[]}>;
