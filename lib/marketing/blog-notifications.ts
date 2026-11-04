import {randomUUID} from "node:crypto";
import {getSupabaseAdmin} from "@/lib/supabase/admin";

export async function enqueueNewBlogNotifications(){
 if(process.env.MARKETING_BLOG_NEWS_ENABLED!=="1")
  return {enabled:false,checked:0,queued:0,recipients:0};
 const since=process.env.MARKETING_BLOG_NEWS_SINCE??"";
 const activated=Date.parse(since);
 if(!/^\d{4}-\d{2}-\d{2}T/.test(since)||!Number.isFinite(activated)||activated>Date.now())
  throw new Error("Configure MARKETING_BLOG_NEWS_SINCE como data ISO de ativação");
 // Não dispara retrospectivamente edições antigas após pausas do agendador.
 const cutoff=new Date(Math.max(activated,Date.now()-48*60*60*1000)).toISOString();
 const db=getSupabaseAdmin();
 const {data:articles,error}=await db.from("fiscal_articles")
  .select("id,title,published_at")
  .eq("status","published").eq("visibility","public").eq("delivery_type","geral")
  .gte("published_at",cutoff).lte("published_at",new Date().toISOString())
  .order("published_at",{ascending:true}).limit(100);
 if(error)throw error;
 let queued=0,recipients=0;
 for(const item of articles??[]){
  const {data:exists,error:lookupError}=await db.from("marketing_blog_notifications")
   .select("article_id").eq("article_id",item.id).maybeSingle();
  if(lookupError)throw lookupError;
  if(exists)continue;
  const {data:count,error:queueError}=await db.rpc("enqueue_marketing_blog_notification",{
   p_article_id:item.id,p_send_id:randomUUID()
  });
  if(queueError)throw queueError;
  if(typeof count==="number"&&count>0){queued++;recipients+=count;}
 }
 return {enabled:true,checked:(articles??[]).length,queued,recipients};
}
