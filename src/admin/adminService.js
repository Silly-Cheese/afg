import {addDoc,collection,doc,getDoc,getDocs,increment,runTransaction,serverTimestamp,setDoc,writeBatch} from 'firebase/firestore';
const map=s=>s.docs.map(d=>({id:d.id,...d.data()}));
const code=p=>`${p}-${crypto.randomUUID().slice(0,8).toUpperCase()}`;
export const ECONOMIC_CLIMATES=['stable-growth','rapid-growth','inflation','recession','housing-boom','housing-decline','credit-tightening','business-expansion','investment-surge'];
export const PROPERTY_INCIDENT_TYPES=['fire','flood','storm','tornado','earthquake','burglary','vandalism','structural-failure','utility-failure','accident','other'];
export const PROPERTY_SEVERITIES=['minor','moderate','major','severe','catastrophic'];
export const ECONOMY_EVENT_TARGETS=['properties','businesses','investments'];

export async function loadOwnerCenter(db,uid){
 const bootstrap=await getDoc(doc(db,'system','bootstrap'));
 const allowed=bootstrap.exists()&&bootstrap.data().ownerUid===uid;
 if(!allowed)return{allowed:false};
 const names=['users','accounts','staffProfiles','applications','loans','businesses','properties','investments','insuranceClaims','insurancePolicies','branches','departments','auditLogs','ownerOverrides','institutionEvents','achievements'];
 const results=await Promise.all(names.map(async n=>{try{return map(await getDocs(collection(db,n)))}catch{return[]}}));
 const data=Object.fromEntries(names.map((n,i)=>[n,results[i]]));
 data.payrollRuns=data.auditLogs.filter(x=>x.action==='payroll.distributed');
 data.propertyIncidents=data.institutionEvents.filter(x=>x.eventType==='property-incident');
 data.economyEvents=data.institutionEvents.filter(x=>x.eventType==='economy-impact');
 const[settings,economy]=await Promise.all([getDoc(doc(db,'systemSettings','main')),getDoc(doc(db,'economicSettings','current'))]);
 return{allowed:true,bootstrap:bootstrap.data(),settings:settings.exists()?settings.data():{},economy:economy.exists()?economy.data():{},...data};
}

export async function updateSystemControls(db,uid,data){
 await setDoc(doc(db,'systemSettings','main'),{registrationEnabled:Boolean(data.registrationEnabled),maintenanceMode:Boolean(data.maintenanceMode),publicVerificationEnabled:Boolean(data.publicVerificationEnabled),institutionNewsEnabled:Boolean(data.institutionNewsEnabled),updatedBy:uid,updatedAt:serverTimestamp()},{merge:true});
 await addDoc(collection(db,'auditLogs'),{actorUid:uid,actorType:'owner',action:'system.controls.updated',targetType:'system',targetId:'main',reason:'Owner updated institution controls',immutable:true,createdAt:serverTimestamp()});
}

export async function updateEconomy(db,uid,data){
 const businessBasePrice=Number(data.businessBasePrice??500),propertyBasePrice=Number(data.propertyBasePrice??5000),insuranceSetupFee=Number(data.insuranceSetupFee??100),insurancePremiumRate=Number(data.insurancePremiumRate??0.02);
 if(businessBasePrice<0||propertyBasePrice<=0||insuranceSetupFee<0||insurancePremiumRate<0||insurancePremiumRate>1)throw new Error('Economy setup pricing contains an invalid value.');
 await setDoc(doc(db,'economicSettings','current'),{climate:data.climate,baseInterestRate:Number(data.baseInterestRate||0),inflationRate:Number(data.inflationRate||0),propertyModifier:Number(data.propertyModifier||1),investmentModifier:Number(data.investmentModifier||1),businessModifier:Number(data.businessModifier||1),loanAvailability:data.loanAvailability||'normal',businessBasePrice,propertyBasePrice,insuranceSetupFee,insurancePremiumRate,effectiveAt:serverTimestamp(),updatedBy:uid,updatedAt:serverTimestamp()},{merge:true});
 await addDoc(collection(db,'auditLogs'),{actorUid:uid,actorType:'owner',action:'economy.settings.updated',targetType:'economy',targetId:'current',reason:`Economic settings and setup pricing updated under ${data.climate}`,immutable:true,createdAt:serverTimestamp()});
}

export async function createPropertyIncident(db,uid,data){
 if(!data.propertyDocId)throw new Error('Choose a property.');
 if(!data.incidentType)throw new Error('Choose an incident type.');
 if(!data.description?.trim()||data.description.trim().length<15)throw new Error('Enter a complete incident description.');
 const loss=Number(data.valueLossPercent||0);
 if(!Number.isFinite(loss)||loss<0||loss>100)throw new Error('Value loss must be between 0 and 100 percent.');
 const propertyRef=doc(db,'properties',data.propertyDocId),eventRef=doc(collection(db,'institutionEvents')),auditRef=doc(collection(db,'auditLogs')),notificationRef=doc(collection(db,'notifications'));
 await runTransaction(db,async tx=>{
  const propertySnap=await tx.get(propertyRef);if(!propertySnap.exists())throw new Error('Property no longer exists.');
  const property=propertySnap.data(),previousValue=Number(property.currentValue||property.purchasePrice||0),newValue=Math.max(0,Math.round(previousValue*(1-loss/100)*100)/100),eventId=code('PINC');
  const conditionAfter=data.conditionAfter||(loss>=75?'critical':loss>=40?'damaged':loss>0?'fair':property.condition||'good');
  tx.update(propertyRef,{currentValue:newValue,condition:conditionAfter,lastIncidentId:eventId,lastIncidentAt:serverTimestamp(),updatedAt:serverTimestamp()});
  tx.set(eventRef,{eventId,title:data.title?.trim()||`${String(data.incidentType).replaceAll('-',' ')} at ${property.name}`,description:data.description.trim(),eventType:'property-incident',incidentType:data.incidentType,severity:data.severity||'moderate',propertyDocId:data.propertyDocId,propertyId:property.propertyId,propertyName:property.name,propertyOwnerUid:property.ownerUid,previousValue,newValue,valueLossPercent:loss,conditionAfter,status:'active',createdBy:uid,createdAt:serverTimestamp()});
  tx.set(notificationRef,{recipientUid:property.ownerUid,type:'property-incident',title:`Incident reported at ${property.name}`,message:data.description.trim(),read:false,createdAt:serverTimestamp()});
  tx.set(auditRef,{actorUid:uid,actorType:'owner',action:'property.incident.created',targetType:'property',targetId:property.propertyId,reason:data.description.trim(),immutable:true,createdAt:serverTimestamp()});
 });
}

export async function applyEconomyEvent(db,uid,data){
 if(!data.title?.trim()||data.title.trim().length<3)throw new Error('Enter an event title.');
 if(!data.description?.trim()||data.description.trim().length<15)throw new Error('Enter a complete event description.');
 if(!ECONOMY_EVENT_TARGETS.includes(data.target))throw new Error('Choose properties, businesses, or investments.');
 const percent=Number(data.percentChange||0);
 if(!Number.isFinite(percent)||percent<-95||percent>500||percent===0)throw new Error('Percent change must be between -95% and +500%, and cannot be zero.');
 const collectionName=data.target;
 const snap=await getDocs(collection(db,collectionName));
 const records=map(snap);
 const eventId=code('EEVT');
 for(let start=0;start<records.length;start+=200){
  const batch=writeBatch(db);
  records.slice(start,start+200).forEach(item=>{
   const ref=doc(db,collectionName,item.id);
   if(collectionName==='properties'){
    const previous=Number(item.currentValue||item.purchasePrice||0);batch.update(ref,{currentValue:Math.max(0,Math.round(previous*(1+percent/100)*100)/100),lastEconomyEventId:eventId,updatedAt:serverTimestamp()});
   }else if(collectionName==='businesses'){
    const previous=Number(item.cashReserves||0);batch.update(ref,{cashReserves:Math.max(0,Math.round(previous*(1+percent/100)*100)/100),lastEconomyEventId:eventId,updatedAt:serverTimestamp()});
   }else{
    const previous=Number(item.currentValue||item.principal||0);const next=Math.max(0,Math.round(previous*(1+percent/100)*100)/100);batch.update(ref,{currentValue:next,totalReturn:next-Number(item.principal||0),lastEconomyEventId:eventId,updatedAt:serverTimestamp()});
   }
   if(item.ownerUid)batch.set(doc(collection(db,'notifications')),{recipientUid:item.ownerUid,type:'economy-event',title:data.title.trim(),message:`${data.description.trim()} Impact: ${percent>0?'+':''}${percent}% on ${collectionName}.`,read:false,createdAt:serverTimestamp()});
  });
  await batch.commit();
 }
 await addDoc(collection(db,'institutionEvents'),{eventId,title:data.title.trim(),description:data.description.trim(),eventType:'economy-impact',target:collectionName,percentChange:percent,affectedRecords:records.length,status:'completed',createdBy:uid,createdAt:serverTimestamp()});
 await addDoc(collection(db,'auditLogs'),{actorUid:uid,actorType:'owner',action:'economy.event.applied',targetType:collectionName,targetId:eventId,reason:`${data.title.trim()}: ${percent}% impact applied to ${records.length} record(s).`,immutable:true,createdAt:serverTimestamp()});
 return{eventId,count:records.length};
}

export async function createInstitutionEvent(db,uid,data){if(data.title.trim().length<3||data.description.trim().length<15)throw new Error('Enter a complete event title and description.');await addDoc(collection(db,'institutionEvents'),{eventId:code('EVT'),title:data.title.trim(),description:data.description.trim(),eventType:data.eventType||'institution',startsAt:data.startsAt||null,endsAt:data.endsAt||null,status:data.status||'scheduled',modifierType:data.modifierType||'none',modifierValue:Number(data.modifierValue||0),createdBy:uid,createdAt:serverTimestamp(),updatedAt:serverTimestamp()});}
export async function createAchievement(db,uid,data){if(data.name.trim().length<3||data.description.trim().length<10)throw new Error('Enter a complete achievement.');await addDoc(collection(db,'achievements'),{achievementId:code('ACH'),name:data.name.trim(),description:data.description.trim(),category:data.category||'customer',points:Number(data.points||0),badge:data.badge||'award',active:true,createdBy:uid,createdAt:serverTimestamp()});}
export async function recordOwnerOverride(db,uid,data){if(data.reason.trim().length<10)throw new Error('A detailed override reason is required.');const record={overrideId:code('OVR'),actorUid:uid,targetCollection:data.targetCollection.trim(),targetId:data.targetId.trim(),field:data.field.trim(),previousValue:data.previousValue||null,newValue:data.newValue||null,reason:data.reason.trim(),status:'recorded',immutable:true,createdAt:serverTimestamp()};await addDoc(collection(db,'ownerOverrides'),record);await addDoc(collection(db,'auditLogs'),{actorUid:uid,actorType:'owner',action:'owner.override.recorded',targetType:record.targetCollection,targetId:record.targetId,reason:record.reason,immutable:true,createdAt:serverTimestamp()});}

export async function distributePayroll(db,ownerUid,center,data){
 const amount=Number(data.amount);if(!Number.isFinite(amount)||amount<=0)throw new Error('Enter a payroll amount greater than zero.');if(amount>100000)throw new Error('A single payroll payment cannot exceed 100,000.');if((data.description||'').trim().length<3)throw new Error('Enter a payroll description.');
 let recipients=center.users.filter(x=>x.accountStatus==='active'&&x.uid);if(data.mode==='one'){const q=(data.target||'').trim().toLowerCase();recipients=recipients.filter(x=>String(x.customerId||'').toLowerCase()===q||String(x.username||'').toLowerCase()===q||String(x.displayName||'').toLowerCase()===q);if(!recipients.length)throw new Error('No active customer matched that Customer ID, username, or exact display name.');}
 const checking=new Map(center.accounts.filter(a=>a.type==='checking'&&a.status==='active').map(a=>[a.ownerUid,a]));const payable=recipients.filter(r=>checking.has(r.uid));if(!payable.length)throw new Error('No matching customer has an active checking account.');const runId=code('PAY');
 for(let start=0;start<payable.length;start+=200){const batch=writeBatch(db);payable.slice(start,start+200).forEach(recipient=>{const account=checking.get(recipient.uid),transactionId=code('TXN');batch.update(doc(db,'accounts',account.id),{balance:increment(amount),availableBalance:increment(amount),lastOperationId:runId,updatedAt:serverTimestamp()});batch.set(doc(db,'transactions',transactionId),{transactionId,operationId:runId,ownerUid:recipient.uid,customerId:recipient.customerId,accountId:account.id,type:'payroll',direction:'credit',amount,source:'Apex Financial Group',description:data.description.trim(),status:'completed',createdAt:serverTimestamp()});});await batch.commit();}
 await addDoc(collection(db,'auditLogs'),{actorUid:ownerUid,actorType:'owner',action:'payroll.distributed',targetType:'payrollRun',targetId:runId,payrollRunId:runId,recipientCount:payable.length,amountPerRecipient:amount,totalAmount:amount*payable.length,description:data.description.trim(),reason:`Paid ${payable.length} customer(s) ${amount} each: ${data.description.trim()}`,immutable:true,createdAt:serverTimestamp()});return{runId,count:payable.length,total:amount*payable.length};
}
export function verifyRecord(data,query){const q=query.trim().toLowerCase();if(!q)return[];const sources=[...data.users.map(x=>({type:'Customer',id:x.customerId,name:x.displayName||x.username,status:x.accountStatus})),...data.staffProfiles.map(x=>({type:'Staff',id:x.staffId,name:x.position,status:x.staffStatus})),...data.businesses.map(x=>({type:'Business',id:x.businessId,name:x.name,status:x.status}))];return sources.filter(x=>String(x.id||'').toLowerCase()===q||String(x.name||'').toLowerCase().includes(q)).slice(0,10);}
