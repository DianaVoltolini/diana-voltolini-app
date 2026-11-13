// app/torre/comercio-v2/materiais/disponibilidade/processar/route.ts
import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/require-admin";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export const runtime = "nodejs";
const base = "/torre/comercio-v2/materiais/disponibilidade";
function back(code: string, productId: string) {
  const query = new URLSearchParams({produto: productId, [code==="ok"?"atualizado":"erro"]:code==="ok"?"1":code});
  return new NextResponse(null, {status:303, headers:{Location:base+"?"+query, "Cache-Control":"no-store"}});
}
type DataRow = { filename: string; available: boolean };
function parseCsv(input: string): string[][] {
  const source = input.replace(/^\uFEFF/, "");
  const rows: string[][] = [];
  let row: string[] = [], cell = "", quoted = false;
  for (let i=0; i<source.length; i++) {
    const c=source[i];
    if (quoted) {
      if(c==='"' && source[i+1]==='"'){cell+='"';i++;}
      else if(c==='"')quoted=false;
      else cell+=c;
    } else if(c==='"') {
      if(cell)throw Error("CSV inválido");
      quoted=true;
    } else if(c===","){row.push(cell);cell="";}
    else if(c==="\n"||c==="\r"){
      if(c==="\r"&&source[i+1]==="\n")i++;
      row.push(cell);
      if(row.some(x=>x.trim()))rows.push(row);
      row=[];cell="";
    } else cell+=c;
  }
  if(quoted)throw Error("Aspas não fechadas");
  row.push(cell);
  if(row.some(x=>x.trim()))rows.push(row);
  return rows;
}
export async function POST(request: NextRequest) {
  const origin=request.headers.get("origin"),host=request.headers.get("host");
  if(!origin||!host)return NextResponse.json({error:"Origem inválida"},{status:403});
  try{
    const url=new URL(origin);
    if(url.host.toLowerCase()!==host.toLowerCase() || !["https:","http:"].includes(url.protocol))
      return NextResponse.json({error:"Origem inválida"},{status:403});
  }catch{return NextResponse.json({error:"Origem inválida"},{status:403});}
  const {userId}=await requireAdmin();
  let form:FormData;
  try{form=await request.formData();}catch{return back("validacao","");}
  const productId=String(form.get("product_id")||"");
  const confirmation=String(form.get("confirm_code")||"").trim();
  const manifest=form.get("manifest");
  if(!/^[a-f\d-]{36}$/i.test(productId) || !(manifest instanceof File) || manifest.size>128*1024 || manifest.size===0)
    return back("validacao",productId);

  const db=getSupabaseAdmin();
  const product=await db.from("commerce_v2_products").select("id,code").eq("id",productId).maybeSingle();
  if(product.error||!product.data||product.data.code!==confirmation)return back("validacao",productId);

  let entries:DataRow[];
  try{
    const lines=parseCsv(await manifest.text());
    const expected=["codigo_produto","nome_material","tipo_codigo","descricao","arquivo","disponivel_para_aluno"];
    const header=lines[0]?.map(x=>x.trim().toLowerCase())||[];
    if(header.join("|")!==expected.join("|"))return back("csv",productId);
    entries=lines.slice(1).map(row=>{
      if(row.length!==6 || row[0].trim()!==product.data!.code)throw Error("Linha inválida");
      const flag=row[5].trim().toLowerCase();
      const filename=row[4].trim();
      if(!["sim","nao"].includes(flag)||!filename||filename.length>255)throw Error("Dados inválidos");
      return {filename,available:flag==="sim"};
    });
    if(!entries.length||entries.length>100||new Set(entries.map(e=>e.filename)).size!==entries.length)
      return back("csv",productId);
  }catch{return back("csv",productId);}

  const existing=await db.from("commerce_v2_materials")
    .select("id,original_filename,available_to_student")
    .eq("product_id",productId).eq("is_archived",false).limit(500);
  if(existing.error||!existing.data)return back("materiais",productId);
  const matches=new Map<string,{id:string;old:boolean}>();
  const duplicates=new Set<string>();
  for(const m of existing.data){
    if(!m.original_filename)continue;
    if(matches.has(m.original_filename))duplicates.add(m.original_filename);
    else matches.set(m.original_filename,{id:m.id,old:Boolean(m.available_to_student)});
  }
  if(entries.some(e=>duplicates.has(e.filename)||!matches.has(e.filename)))
    return back("materiais",productId);

  const changed: {id:string;old:boolean}[]=[];
  try {
    for(const entry of entries) {
      const item=matches.get(entry.filename)!;
      if(item.old===entry.available)continue;
      const updated=await db.from("commerce_v2_materials")
        .update({available_to_student:entry.available,updated_at:new Date().toISOString(),updated_by:userId})
        .eq("id",item.id).eq("product_id",productId).eq("is_archived",false)
        .eq("available_to_student",item.old).select("id").maybeSingle();
      if(updated.error||!updated.data)throw Error("Falha de atualização");
      changed.push({id:item.id,old:item.old});
    }
    return back("ok",productId);
  }catch(error){
    console.error("Atualização em lote da disponibilidade:",error instanceof Error?error.message:"erro");
    for(const row of changed.reverse()){
      const restored=await db.from("commerce_v2_materials").update({
        available_to_student:row.old,updated_at:new Date().toISOString(),updated_by:userId
      }).eq("id",row.id).eq("product_id",productId);
      if(restored.error)console.error("Falha no restauro de disponibilidade:",row.id);
    }
    return back("salvar",productId);
  }
}
