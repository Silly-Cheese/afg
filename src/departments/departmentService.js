import{addDoc,collection,doc,getDoc,getDocs,query,serverTimestamp,updateDoc,where}from'firebase/firestore';

export const DEPARTMENT_CATALOG=[
 {id:'customer-services',name:'Customer Services',accent:'#2F6FED',permissions:['support.view','support.manage'],workTypes:['Customer inquiry','Account assistance','Complaint','Escalation']},
 {id:'banking-operations',name:'Banking Operations',accent:'#336B59',permissions:['accounts.view','transactions.review'],workTypes:['Account service','Transaction review','Correction request','Account maintenance']},
 {id:'lending-underwriting',name:'Lending & Underwriting',accent:'#315C9B',permissions:['applications.view','applications.review'],workTypes:['Application review','Underwriting review','Policy exception','Portfolio review']},
 {id:'collections-recovery',name:'Collections & Recovery',accent:'#A06A24',permissions:['loans.view','collections.manage'],workTypes:['Past-due review','Payment arrangement','Settlement review','Recovery escalation']},
 {id:'business-commercial',name:'Business & Commercial Services',accent:'#5B4C9C',permissions:['business.view','commercial.review'],workTypes:['Business registration','Commercial review','Business support','Commercial escalation']},
 {id:'fraud-investigations',name:'Fraud & Investigations',accent:'#8F3535',permissions:['fraud.view','investigations.manage'],workTypes:['Alert review','Transaction investigation','Account review','Investigation escalation']},
 {id:'risk-compliance',name:'Risk & Compliance',accent:'#5E6875',permissions:['compliance.view','compliance.manage'],workTypes:['Compliance review','Policy violation','Risk assessment','Corrective action']},
 {id:'internal-audit',name:'Internal Audit',accent:'#4D5560',permissions:['audit.view','audit.manage'],workTypes:['Branch audit','Department audit','Action review','Remediation check']},
 {id:'human-resources',name:'Human Resources',accent:'#3F7B65',permissions:['staff.applications.view','staff.manage'],workTypes:['Staff application','Employee request','Performance matter','HR escalation']},
 {id:'training-development',name:'Training & Development',accent:'#7B5B99',permissions:['academy.staff.view','training.manage'],workTypes:['Training assignment','Certification review','Course request','Training escalation']},
 {id:'technology-systems',name:'Technology & Systems',accent:'#5846A3',permissions:['technology.view','systems.manage'],workTypes:['Technical issue','Account recovery','Security review','Feature request']},
 {id:'executive-office',name:'Executive Office',accent:'#C9A227',permissions:['executive.view','owner.override_all'],workTypes:['Executive review','Policy decision','Branch escalation','Institution directive']}
];

const mapDocs=s=>s.docs.map(d=>({id:d.id,...d.data()}));
async function safe(loader,fallback=[]){try{return await loader()}catch{return fallback}}
export async function loadDepartmentOperations(db,uid){
 const[bootstrap,profileSnap,permissionSnap,directorySnap]=await Promise.all([getDoc(doc(db,'system','bootstrap')),getDoc(doc(db,'staffProfiles',uid)),getDoc(doc(db,'staffPermissions',uid)),getDocs(collection(db,'staffProfiles'))]);
 const isOwner=bootstrap.exists()&&bootstrap.data().ownerUid===uid;
 const profile=profileSnap.exists()?profileSnap.data():(isOwner?{uid,staffId:'STF-000001',rankName:'Founder & Owner',position:'Founder and Owner',departmentId:'executive-office',branchId:'capital',staffStatus:'active'}:null);
 const permissions=permissionSnap.exists()?permissionSnap.data().permissions||[]:[];
 if(!profile&&!isOwner)return{access:{allowed:false,isOwner:false,permissions:[]}};
 const manager=isOwner||permissions.includes('staff.manage')||permissions.includes('owner.override_all');
 const tasks=await safe(async()=>mapDocs(await getDocs(manager?collection(db,'staffTasks'):query(collection(db,'staffTasks'),where('assigneeUid','==',uid)))));
 const applications=await safe(async()=>mapDocs(await getDocs(collection(db,'applications'))));
 const loans=await safe(async()=>mapDocs(await getDocs(collection(db,'loans'))));
 const announcements=await safe(async()=>mapDocs(await getDocs(collection(db,'staffAnnouncements'))));
 return{access:{allowed:true,isOwner,manager,permissions},profile,tasks,applications,loans,announcements,directory:mapDocs(directorySnap)};
}
export async function createDepartmentWorkItem(db,actor,data){
 if(!data.departmentId||!data.assigneeUid||data.title.trim().length<3)throw new Error('Choose a department, assignee, and title.');
 const department=DEPARTMENT_CATALOG.find(x=>x.id===data.departmentId);if(!department)throw new Error('Invalid department.');
 await addDoc(collection(db,'staffTasks'),{taskId:`OPS-${crypto.randomUUID().slice(0,8).toUpperCase()}`,title:data.title.trim(),description:data.description.trim(),assigneeUid:data.assigneeUid,departmentId:data.departmentId,workType:data.workType||department.workTypes[0],priority:data.priority||'normal',status:'assigned',relatedCustomerUid:data.relatedCustomerUid.trim()||null,conflictRestricted:Boolean(data.relatedCustomerUid&&data.relatedCustomerUid===data.assigneeUid),assignedBy:actor,createdAt:serverTimestamp(),updatedAt:serverTimestamp()});
}
export async function updateDepartmentWorkItem(db,id,uid,status,note=''){
 const ref=doc(db,'staffTasks',id),snap=await getDoc(ref);if(!snap.exists())throw new Error('Work item not found.');const item=snap.data();
 if(item.assigneeUid!==uid)throw new Error('Only the assigned staff member may update this work item.');
 if(item.conflictRestricted)throw new Error('This work item is blocked by a conflict of interest.');
 await updateDoc(ref,{status,completionNote:note.trim(),completedAt:status==='completed'?serverTimestamp():null,updatedAt:serverTimestamp()});
}
