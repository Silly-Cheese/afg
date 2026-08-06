import React,{useEffect}from'react';
import{createRoot}from'react-dom/client';
import{getApp}from'firebase/app';
import{getAuth,onAuthStateChanged}from'firebase/auth';
import{collection,doc,getDoc,getDocs,getFirestore,query,where}from'firebase/firestore';
import LendingPage from'./LendingPage.jsx';
import{registerExistingApprovedLoan}from'./lendingRepair.js';

function ApprovedLoanRepair(){
  useEffect(()=>{
    const app=getApp(),auth=getAuth(app),db=getFirestore(app);
    return onAuthStateChanged(auth,async user=>{
      if(!user)return;
      try{
        const bootstrap=await getDoc(doc(db,'system','bootstrap'));
        if(!bootstrap.exists()||bootstrap.data().ownerUid!==user.uid)return;
        const approved=await getDocs(query(collection(db,'applications'),where('status','==','approved')));
        for(const application of approved.docs){
          if(!application.data().registeredLoanDocId){
            await registerExistingApprovedLoan(db,application.id,user.uid);
          }
        }
      }catch(error){
        console.error('Approved-loan repair failed:',error);
      }
    });
  },[]);
  return null;
}

createRoot(document.getElementById('root')).render(<React.StrictMode><ApprovedLoanRepair/><LendingPage/></React.StrictMode>);
