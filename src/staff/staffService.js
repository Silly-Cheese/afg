import{addDoc,collection,doc,getDoc,getDocs,query,serverTimestamp,updateDoc,where}from'firebase/firestore';

export async function loadStaffWorkspace(db,uid){
 const[bootstrap,userSnap,profileSnap,permissionSnap,tasksSnap,trainingSnap,policiesSnap,announcementsSnap,directorySnap]=await Promise.all([
  getDoc(doc(db,'system','bootstrap')),getDoc(doc(db,'users',uid)),getDoc(doc(db,'staffProfiles',uid)),getDoc(doc(db,'staffPermissions',uid)),
  getDocs(query(collection(db,'staffTasks'),where('assigneeUid','==',uid))),getDocs(query(collection(db,'trainingAssignments'),where('staffUid','==',uid))),
  getDocs(collection(db,'policies')),getDocs(collection(db,'staffAnnouncements')),getDocs(collection(db,'staffProfiles'))
 ]);
 const isOwner=bootstrap.exists()&&bootstrap.data().ownerUid===uid;
 const permissions=permissionSnap.exists()?permissionSnap.data().permissions||[]:[];
 const profile=profileSnap.exists()?profileSnap.data():(isOwner?{uid,staffId:'STF-000001',rankName:'Founder & Owner',position:'Founder and Owner',departmentId:'executive-office',branchId:'capital',staffStatus:'active',probationStatus:'exempt'}:null);
 const usersByUid={};for(const p of directorySnap.docs){const u=await getDoc(doc(db,'users',p.id));usersByUid[p.id]=u.exists()?u.data():{};}
 return{access:{isOwner,allowed:isOwner||Boolean(profile),permissions},user:userSnap.data(),profile,
  tasks:tasksSnap.docs.map(x=>({id:x.id,...x.data()})).sort((a,b)=>(b.createdAt?.seconds||0)-(a.createdAt?.seconds||0)),
  training:trainingSnap.docs.map(x=>({id:x.id,...x.data()})),policies:policiesSnap.docs.map(x=>({id:x.id,...x.data()})).filter(x=>x.active!==false),
  announcements:announcementsSnap.docs.map(x=>({id:x.id,...x.data()})).filter(x=>x.active!==false).sort((a,b)=>(b.createdAt?.seconds||0)-(a.createdAt?.seconds||0)),
  directory:directorySnap.docs.map(x=>({uid:x.id,...x.data(),displayName:usersByUid[x.id]?.displayName||usersByUid[x.id]?.username||'',permissions:x.id===uid?permissions:[]})).filter(x=>x.staffStatus!=='terminated')};
}
export async function completeTask(db,id,uid){const ref=doc(db,'staffTasks',id),snap=await getDoc(ref);if(!snap.exists()||snap.data().assigneeUid!==uid)throw new Error('Task not found.');await updateDoc(ref,{status:'completed',completedAt:serverTimestamp(),updatedAt:serverTimestamp()});}
export async function createTask(db,actorUid,data){if(!data.assigneeUid||data.title.trim().length<3)throw new Error('Choose a staff member and enter a task title.');await addDoc(collection(db,'staffTasks'),{taskId:`TSK-${crypto.randomUUID().slice(0,8).toUpperCase()}`,title:data.title.trim(),description:data.description.trim(),assigneeUid:data.assigneeUid,priority:data.priority||'normal',status:'assigned',assignedBy:actorUid,createdAt:serverTimestamp(),updatedAt:serverTimestamp()});}
export async function createPolicy(db,actorUid,data){if(data.title.trim().length<3||data.body.trim().length<20)throw new Error('Enter a title and complete policy body.');await addDoc(collection(db,'policies'),{policyNumber:`AFG-${Date.now().toString().slice(-6)}`,title:data.title.trim(),body:data.body.trim(),departmentId:data.departmentId||'all',version:1,active:true,createdBy:actorUid,createdAt:serverTimestamp(),updatedAt:serverTimestamp()});}
export async function createAnnouncement(db,actorUid,data){if(data.title.trim().length<3||data.body.trim().length<10)throw new Error('Enter a complete announcement.');await addDoc(collection(db,'staffAnnouncements'),{announcementId:`ANN-${crypto.randomUUID().slice(0,8).toUpperCase()}`,title:data.title.trim(),body:data.body.trim(),audience:data.audience||'staff',active:true,createdBy:actorUid,createdAt:serverTimestamp()});}
export async function updatePermissions(db,actorUid,targetUid,permissions){if(!targetUid)throw new Error('Select a staff member.');const bootstrap=await getDoc(doc(db,'system','bootstrap'));if(bootstrap.exists()&&bootstrap.data().ownerUid===targetUid)throw new Error('Owner permissions are protected and cannot be replaced.');await updateDoc(doc(db,'staffPermissions',targetUid),{permissions:[...new Set(permissions)],updatedBy:actorUid,updatedAt:serverTimestamp()});await addDoc(collection(db,'auditLogs'),{actorUid,actorType:'staff',action:'staff.permissions.updated',targetType:'staff',targetId:targetUid,reason:'Permission package updated through Staff Workspace',immutable:true,createdAt:serverTimestamp()});}
