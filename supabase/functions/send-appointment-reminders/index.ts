// Deploy ONLY to the Medical Records Supabase project.
// Requires: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, VAPID_PUBLIC_KEY,
// VAPID_PRIVATE_KEY, VAPID_SUBJECT, APPOINTMENT_CRON_SECRET.
// The scheduler invokes this endpoint hourly; it sends only at 9 AM America/New_York.
import {createClient} from 'npm:@supabase/supabase-js@2';
import webpush from 'npm:web-push@3.6.7';

const env=(key:string)=>Deno.env.get(key)||'';
const dateInZone=(d:Date, options:Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat('en-CA',{timeZone:'America/New_York',...options}).format(d);
function dateParts(d:Date){
  const parts=new Intl.DateTimeFormat('en-US',{timeZone:'America/New_York',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',hourCycle:'h23'}).formatToParts(d);
  const part=(type:string)=>parts.find(p=>p.type===type)?.value||'';
  return {today:part('year')+'-'+part('month')+'-'+part('day'),hour:Number(part('hour'))};
}
function daysBetween(start:string,end:string){
  const a=Date.parse(start+'T12:00:00Z');
  const b=Date.parse(end+'T12:00:00Z');
  return Math.round((b-a)/86400000);
}
Deno.serve(async req=>{
  if(req.method!=='POST')return new Response('Method not allowed',{status:405});
  const expected=env('APPOINTMENT_CRON_SECRET');
  if(!expected || req.headers.get('authorization')!=='Bearer '+expected)return new Response('Unauthorized',{status:401});
  const {today,hour}=dateParts(new Date());
  if(hour!==9)return Response.json({status:'outside delivery window',today});
  const supabase=createClient(env('SUPABASE_URL'),env('SUPABASE_SERVICE_ROLE_KEY'),{auth:{persistSession:false}});
  webpush.setVapidDetails(env('VAPID_SUBJECT'),env('VAPID_PUBLIC_KEY'),env('VAPID_PRIVATE_KEY'));
  const {data:reminders,error:reminderError}=await supabase.from('appointment_reminders')
    .select('appointment_id,user_id,enabled,days_before').eq('enabled',true);
  if(reminderError)return Response.json({error:reminderError.message},{status:500});
  let sent=0,failed=0;
  for(const reminder of reminders||[]){
    const {data:appointment,error:appointmentError}=await supabase.from('appointments')
      .select('id,appointment_date,appointment_time').eq('id',reminder.appointment_id)
      .eq('user_id',reminder.user_id).maybeSingle();
    if(appointmentError||!appointment?.appointment_date)continue;
    const days=daysBetween(today,appointment.appointment_date);
    if(days<0||days>reminder.days_before)continue;
    const {data:subscriptions,error:subError}=await supabase.from('appointment_push_subscriptions')
      .select('id,endpoint,p256dh,auth_key').eq('user_id',reminder.user_id);
    if(subError)continue;
    for(const sub of subscriptions||[]){
      // Reserve delivery exactly once per subscription/date. Avoid duplicate sends if cron retries.
      const {error:reservedError}=await supabase.from('appointment_push_sent').insert({
        appointment_id:String(appointment.id),user_id:reminder.user_id,subscription_id:sub.id,reminder_date:today
      });
      if(reservedError)continue;
      const hourMinute=String(appointment.appointment_time||'').slice(0,5);
      const body=days===0?'Your appointment is today'+(hourMinute?' at '+hourMinute:'')+'.':
        'Your appointment is in '+days+' day'+(days===1?'':'s')+'.';
      try{
        await webpush.sendNotification({endpoint:sub.endpoint,keys:{p256dh:sub.p256dh,auth:sub.auth_key}},
          JSON.stringify({title:'Medical appointment reminder',body,tag:'medical-appointment-'+appointment.id}));
        sent++;
      }catch(e){
        failed++;
        if(e?.statusCode===404||e?.statusCode===410){
          await supabase.from('appointment_push_subscriptions').delete().eq('id',sub.id);
        }else{
          // Permit subsequent schedule retry after transient send failure.
          await supabase.from('appointment_push_sent').delete()
            .eq('appointment_id',String(appointment.id)).eq('subscription_id',sub.id).eq('reminder_date',today);
        }
      }
    }
  }
  return Response.json({today,sent,failed});
});
