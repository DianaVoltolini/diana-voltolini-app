-- Documentos da Análise Fiscal Individual: bucket estritamente privado.
-- Leituras/gravações acontecem somente no servidor após checagem de autorização.
insert into storage.buckets (id,name,public,file_size_limit,allowed_mime_types)
values ('fiscal-analysis-private','fiscal-analysis-private',false,15728640,
 array['application/pdf',
       'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
       'image/jpeg','image/png'])
on conflict (id) do update
set public=false,
    file_size_limit=15728640,
    allowed_mime_types=excluded.allowed_mime_types;
-- Não criar policy de acesso direto ao bucket para anon/authenticated.
