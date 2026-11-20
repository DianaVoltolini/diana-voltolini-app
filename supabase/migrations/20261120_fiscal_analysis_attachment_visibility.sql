-- Restrict internal supporting documents, even after the service is paid.
alter table public.fiscal_analysis_attachments
  add column if not exists visible_to_client boolean not null default false;
drop policy if exists fiscal_analysis_attachments_paid_owner_read on public.fiscal_analysis_attachments;
create policy fiscal_analysis_attachments_paid_owner_read on public.fiscal_analysis_attachments
 for select to authenticated using (visible_to_client and exists (
   select 1 from public.fiscal_analysis_requests r
   where r.id = request_id and r.user_id = (select auth.uid()) and r.paid_at is not null
 ));