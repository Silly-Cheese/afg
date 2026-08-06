import { addDoc, collection, doc, getDoc, getDocs, query, runTransaction, serverTimestamp, updateDoc, where } from 'firebase/firestore';

export const FINANCIAL_PRODUCTS = [
  ['personal-loan','Personal Loan'],['emergency-loan','Emergency Loan'],['vehicle-financing','Vehicle Financing'],['mortgage','Home Mortgage'],['student-loan','Student Loan'],['business-startup','Business Startup Loan'],['business-financing','Business Expansion Loan'],['equipment-loan','Equipment Loan'],['commercial-property','Commercial Property Loan'],['debt-consolidation','Debt Consolidation Loan']
].map(([id,name])=>({id,name,category:'financial'}));

const closed=['approved','denied','withdrawn','expired','offer-declined','accepted'];
const stamp=()=>new Date().toISOString();
const event=(status,label,actorType,actorUid)=>({status,label,actorType,actorUid,createdAt:stamp()});

export async function getStaffAccess(db,uid){
  const [bootstrap,staff,permissions]=await Promise.all([
    getDoc(doc(db,'system','bootstrap')),
    getDoc(doc(db,'staffProfiles',uid)),
    getDoc(doc(db,'staffPermissions',uid))
  ]);
  const isOwner=bootstrap.exists()&&bootstrap.data().ownerUid===uid;
  const profile=staff.exists()?staff.data():null;
  const grants=permissions.exists()?permissions.data().permissions||[]:[];
  const mayReview=isOwner||grants.some(p=>['applications.view','applications.review','applications.claim','applications.approve','applications.deny','owner.override_all'].includes(p));
  return {isOwner,profile,permissions:grants,mayReview};
}

export async function loadLendingQueue(db){
  const snap=await getDocs(query(collection(db,'applications'),where('category','==','financial')));
  return snap.docs.map(d=>({id:d.id,...d.data()})).sort((a,b)=>(b.updatedAt?.seconds||0)-(a.updatedAt?.seconds||0));
}

export async function loadCustomerDecision(db,applicationId,uid){
  const snap=await getDoc(doc(db,'applications',applicationId));
  if(!snap.exists()||snap.data().applicantUid!==uid)throw new Error('Application not found.');
  return {id:snap.id,...snap.data()};
}

export async function claimApplication(db,id,staff){
  const ref=doc(db,'applications',id);const snap=await getDoc(ref);if(!snap.exists())throw new Error('Application not found.');
  const data=snap.data();if(data.category!=='financial')throw new Error('This is not a financial application.');
  if(closed.includes(data.status))throw new Error('This application is closed.');
  await updateDoc(ref,{status:'assigned',assignedReviewerUid:staff.uid,assignedReviewerName:staff.name,assignedAt:serverTimestamp(),updatedAt:serverTimestamp(),timeline:[...(data.timeline||[]),event('assigned',`Assigned to ${staff.name}`,'staff',staff.uid)]});
}

export async function saveAnalysis(db,id,staff,analysis){
  const ref=doc(db,'applications',id);const snap=await getDoc(ref);if(!snap.exists())throw new Error('Application not found.');
  const data=snap.data();if(data.assignedReviewerUid&&data.assignedReviewerUid!==staff.uid&&!staff.isOwner)throw new Error('This application is assigned to another reviewer.');
  const amount=Number(data.responses?.amount||0),income=Number(data.responses?.income||0),debt=Number(data.responses?.existingDebt||0);
  const calculated={requestedAmount:amount,monthlyIncome:income,existingMonthlyDebt:debt,debtToIncome:income>0?Math.round((debt/income)*1000)/10:null,scoreReviewed:Number(analysis.scoreReviewed||0),riskRating:analysis.riskRating||'moderate',capacityAssessment:analysis.capacityAssessment.trim(),collateralAssessment:analysis.collateralAssessment.trim(),reviewSummary:analysis.reviewSummary.trim(),policyExceptions:analysis.policyExceptions.trim(),reviewedBy:staff.uid,reviewedAt:stamp()};
  await updateDoc(ref,{status:'department-review',assignedReviewerUid:staff.uid,assignedReviewerName:staff.name,underwritingAnalysis:calculated,internalNotesCount:Number(data.internalNotesCount||0)+1,updatedAt:serverTimestamp(),timeline:[...(data.timeline||[]),event('department-review','Financial analysis completed','staff',staff.uid)]});
}

export async function requestInformation(db,id,staff,message){
  if(message.trim().length<10)throw new Error('Provide a clear information request.');
  const ref=doc(db,'applications',id);const snap=await getDoc(ref);const data=snap.data();
  await updateDoc(ref,{status:'information-requested',applicantMessages:[...(data.applicantMessages||[]),{direction:'staff-to-customer',message:message.trim(),createdAt:stamp(),actorUid:staff.uid}],updatedAt:serverTimestamp(),timeline:[...(data.timeline||[]),event('information-requested','Additional information requested','staff',staff.uid)]});
}

export async function submitRecommendation(db,id,staff,recommendation){
  const ref=doc(db,'applications',id);const snap=await getDoc(ref);const data=snap.data();
  if(!data.underwritingAnalysis)throw new Error('Complete financial analysis first.');
  await updateDoc(ref,{status:'final-review',recommendation:{outcome:recommendation.outcome,amount:Number(recommendation.amount||0),termMonths:Number(recommendation.termMonths||0),interestRate:Number(recommendation.interestRate||0),conditions:recommendation.conditions.trim(),rationale:recommendation.rationale.trim(),recommendedBy:staff.uid,recommendedAt:stamp()},updatedAt:serverTimestamp(),timeline:[...(data.timeline||[]),event('final-review','Recommendation submitted for final decision','staff',staff.uid)]});
}

export async function issueDecision(db,id,staff,decision){
  const ref=doc(db,'applications',id);
  await runTransaction(db,async tx=>{
    const snap=await tx.get(ref);if(!snap.exists())throw new Error('Application not found.');const data=snap.data();
    const approved=decision.outcome==='approved';
    const terms=approved?{approvedAmount:Number(decision.amount||data.recommendation?.amount||0),termMonths:Number(decision.termMonths||data.recommendation?.termMonths||0),interestRate:Number(decision.interestRate||data.recommendation?.interestRate||0),paymentFrequency:'monthly',conditions:decision.conditions.trim(),expiresAt:decision.expiresAt||null}:null;
    const letter={letterId:`LTR-${crypto.randomUUID().slice(0,8).toUpperCase()}`,decision:decision.outcome,subject:approved?'Financing approval':'Financing decision',body:decision.letterBody.trim(),issuedBy:staff.uid,issuedByName:staff.name,issuedAt:stamp()};
    tx.update(ref,{status:approved?'approved':'denied',decision:{outcome:decision.outcome,reason:decision.reason.trim(),decidedBy:staff.uid,decidedByName:staff.name,decidedAt:stamp(),ownerOverride:Boolean(decision.ownerOverride)},approvedTerms:terms,decisionLetter:letter,updatedAt:serverTimestamp(),timeline:[...(data.timeline||[]),event(approved?'approved':'denied',approved?'Application approved':'Application denied','staff',staff.uid)]});
    tx.set(doc(collection(db,'lendingDecisions')),{applicationId:data.applicationId,applicationDocId:id,applicantUid:data.applicantUid,customerId:data.customerId,outcome:decision.outcome,terms,reason:decision.reason.trim(),letterId:letter.letterId,decidedBy:staff.uid,ownerOverride:Boolean(decision.ownerOverride),immutable:true,createdAt:serverTimestamp()});
    tx.set(doc(collection(db,'auditLogs')),{actorUid:staff.uid,actorType:decision.ownerOverride?'owner':'staff',action:decision.ownerOverride?'lending.decision.overridden':'lending.decision.issued',targetType:'application',targetId:data.applicationId,reason:decision.reason.trim(),immutable:true,createdAt:serverTimestamp()});
  });
}

export async function respondToOffer(db,id,uid,response){
  const ref=doc(db,'applications',id);
  await runTransaction(db,async tx=>{
    const snap=await tx.get(ref);if(!snap.exists())throw new Error('Application not found.');const data=snap.data();
    if(data.applicantUid!==uid||data.status!=='approved')throw new Error('This offer is not available.');
    const accepted=response==='accept';
    tx.update(ref,{status:accepted?'accepted':'offer-declined',customerResponse:{response:accepted?'accepted':'declined',respondedAt:stamp()},updatedAt:serverTimestamp(),timeline:[...(data.timeline||[]),event(accepted?'accepted':'offer-declined',accepted?'Customer accepted approved terms':'Customer declined approved terms','customer',uid)]});
    if(accepted){
      const loanId=`LN-${crypto.randomUUID().slice(0,8).toUpperCase()}`;
      tx.set(doc(db,'loans',loanId),{loanId,applicationId:data.applicationId,applicationDocId:id,ownerUid:uid,customerId:data.customerId,productType:data.applicationType,productName:data.applicationName,originalPrincipal:data.approvedTerms.approvedAmount,remainingPrincipal:data.approvedTerms.approvedAmount,interestRate:data.approvedTerms.interestRate,termMonths:data.approvedTerms.termMonths,paymentFrequency:data.approvedTerms.paymentFrequency,status:'pending-activation',servicingStatus:'awaiting-phase-7',createdAt:serverTimestamp()});
    }
  });
}
