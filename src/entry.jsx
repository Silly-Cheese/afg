import React from 'react';
import {createRoot} from 'react-dom/client';
import {initializeApp} from 'firebase/app';
import {getAuth,onAuthStateChanged} from 'firebase/auth';
import {doc,getDoc,getFirestore} from 'firebase/firestore';
import BootstrapApp from './bootstrap/BootstrapApp.jsx';
import './styles.css';import './bootstrap/bootstrap.css';import './stabilization.css';

const firebaseConfig={apiKey:'AIzaSyCG7LQR2vM2r68Y414jToA1_CDmUE_Ncdw',authDomain:'afg-game.firebaseapp.com',projectId:'afg-game',storageBucket:'afg-game.firebasestorage.app',messagingSenderId:'779966850290',appId:'1:779966850290:web:24f48af23a2e6cae2d9c6b'};
const app=initializeApp(firebaseConfig),auth=getAuth(app),db=getFirestore(app),root=createRoot(document.getElementById('root'));
const basePath=import.meta.env.BASE_URL.replace(/\/$/,'');
const recovery=new URLSearchParams(window.location.search),recoveredRoute=recovery.get('route');
if(recoveredRoute){const q=decodeURIComponent(recovery.get('q')||''),h=decodeURIComponent(recovery.get('h')||'');window.history.replaceState({},'',`${basePath}${recoveredRoute.startsWith('/')?recoveredRoute:`/${recoveredRoute}`}${q}${h}`)}
const appPath=window.location.pathname.startsWith(basePath)?window.location.pathname.slice(basePath.length)||'/':window.location.pathname;
const pageUrl=(path='/')=>`${basePath}${path.startsWith('/')?path:`/${path}`}`;

document.addEventListener('click',event=>{const anchor=event.target.closest?.('a');if(!anchor||event.defaultPrevented||event.button!==0)return;const href=anchor.getAttribute('href');if(!href||!href.startsWith('/')||href.startsWith(`${basePath}/`)||href.startsWith('//'))return;event.preventDefault();window.location.assign(pageUrl(href));});
function Loading(){return <main className="bootstrap-loading"><div className="bootstrap-spinner"/><strong>Apex Financial Group</strong><span>Checking institution status…</span></main>}
const managementTitle=(rankName='')=>/Manager|Director|Executive|Chief|President|Owner/i.test(rankName);

async function getNavigationAccess(user){if(!user)return{signedIn:false,isOwner:false,isStaff:false,isManager:false,isLending:false,permissions:[]};const[bootstrapSnap,staffSnap,permissionsSnap]=await Promise.all([getDoc(doc(db,'system','bootstrap')),getDoc(doc(db,'staffProfiles',user.uid)),getDoc(doc(db,'staffPermissions',user.uid))]);const isOwner=bootstrapSnap.exists()&&bootstrapSnap.data().ownerUid===user.uid,staff=staffSnap.exists()?staffSnap.data():null,permissions=permissionsSnap.exists()?permissionsSnap.data().permissions||[]:[],isStaff=isOwner||Boolean(staff&&staff.staffStatus!=='terminated'),isManager=isOwner||permissions.includes('staff.manage')||permissions.includes('owner.override_all')||managementTitle(staff?.rankName),isLending=isOwner||permissions.some(p=>['applications.view','applications.review','applications.claim','applications.approve','applications.deny','loans.view','owner.override_all'].includes(p));return{signedIn:true,isOwner,isStaff,isManager,isLending,permissions};}
const routeRules={'/owner-control':a=>a.isOwner,'/account-management':a=>a.isOwner,'/property-management':a=>a.isOwner,'/staff-management':a=>a.isManager,'/departments':a=>a.isStaff,'/staff':a=>a.isStaff,'/career-center':a=>a.isStaff,'/lending':a=>a.isLending,'/economy-center':a=>a.signedIn,'/academy-center':a=>a.signedIn,'/careers':a=>a.signedIn,'/loans':a=>a.signedIn,'/applications':a=>a.signedIn,'/progression':a=>a.signedIn};
function pathFromAnchor(anchor){try{const url=new URL(anchor.href,window.location.origin);let path=url.pathname;if(basePath&&path.startsWith(basePath))path=path.slice(basePath.length)||'/';return path.replace(/\/$/,'')||'/'}catch{return''}}

function installPermissionAwareNavigation(access){
 const applyVisibility=()=>document.querySelectorAll('a[href]').forEach(anchor=>{const path=pathFromAnchor(anchor),rule=routeRules[path];if(!rule)return;const visible=Boolean(rule(access));anchor.hidden=!visible;anchor.setAttribute('aria-hidden',visible?'false':'true');if(!visible)anchor.setAttribute('tabindex','-1');else anchor.removeAttribute('tabindex')});
 const inject=()=>{
  applyVisibility();
  const nav=document.querySelector('.portal-sidebar nav');if(!nav||nav.dataset.afgNavReady==='true')return;
  nav.dataset.afgNavReady='true';
  const existingPaths=new Set(Array.from(nav.querySelectorAll('a[href]')).map(pathFromAnchor));
  const sections=[
   ['YOUR AFG',[[ '/progression','★','Progression & Trust',access.signedIn],['/applications','▤','Applications',access.signedIn],['/loans','◈','Loan Center',access.signedIn],['/careers','◆','Careers & Staff',access.signedIn],['/academy-center','●','Financial Academy',access.signedIn],['/economy-center','◇','Business & Economy',access.signedIn]]],
   ['STAFF',[[ '/staff','■','Staff Workspace',access.isStaff],['/departments','▦','Department Operations',access.isStaff],['/career-center','▲','Career & Branch Center',access.isStaff],['/lending','▣','Lending & Underwriting',access.isLending]]],
   ['MANAGEMENT',[[ '/staff-management','⚙','Staff Management',access.isManager],['/account-management','◉','Account Management',access.isOwner],['/property-management','▥','Property Management',access.isOwner],['/owner-control','◆','Owner Control Center',access.isOwner]]],
  ];
  sections.forEach(([title,items])=>{const actual=items.filter(([path,,,allowed])=>allowed&&!existingPaths.has(path));if(!actual.length)return;const group=document.createElement('div');group.className='portal-group afg-nav-group';group.dataset.afgGenerated='true';group.textContent=title;nav.appendChild(group);actual.forEach(([href,icon,text])=>{const link=document.createElement('a');link.href=pageUrl(href);link.dataset.afgGenerated='true';link.innerHTML=`<span aria-hidden="true">${icon}</span><span>${text}</span>`;nav.appendChild(link);existingPaths.add(href)})});
 };
 inject();new MutationObserver(()=>{applyVisibility();inject()}).observe(document.body,{childList:true,subtree:true});
}
function waitForAuth(){return new Promise(resolve=>{const unsubscribe=onAuthStateChanged(auth,user=>{unsubscribe();resolve(user)})})}
async function start(){root.render(<Loading/>);try{const snap=await getDoc(doc(db,'system','bootstrap'));if(!snap.exists()||snap.data()?.status!=='complete'){root.render(<BootstrapApp firebaseApp={app} db={db}/>);return}const authUser=await waitForAuth(),navigationAccess=await getNavigationAccess(authUser);root.unmount();installPermissionAwareNavigation(navigationAccess);if(appPath==='/signin')return import('./auth/loginEntry.jsx');if(appPath==='/progression')return import('./progression/progressionEntry.jsx');if(appPath==='/applications')return import('./applications/applicationEntry.jsx');if(appPath==='/lending')return import('./lending/lendingEntry.jsx');if(appPath==='/loans')return import('./servicing/servicingEntry.jsx');if(appPath==='/careers')return import('./staffing/staffingEntry.jsx');if(appPath==='/staff')return import('./staff/staffEntry.jsx');if(appPath==='/staff-management')return import('./staffManagement/staffManagementEntry.jsx');if(appPath==='/account-management')return import('./accountManagement/accountManagementEntry.jsx');if(appPath==='/property-management')return import('./propertyManagement/propertyManagementEntry.jsx');if(appPath==='/departments')return import('./departments/departmentEntry.jsx');if(appPath==='/academy-center')return import('./academy/academyEntry.jsx');if(appPath==='/career-center')return import('./careers/careerEntry.jsx');if(appPath==='/economy-center')return import('./economy/economyEntry.jsx');if(appPath==='/owner-control')return import('./admin/adminEntry.jsx');await import('./main.jsx')}catch(error){root.render(<main className="bootstrap-loading bootstrap-error-screen"><strong>Institution status unavailable</strong><span>{error?.message||'The bootstrap status could not be checked.'}</span><button className="button button-gold" onClick={()=>location.reload()}>Try again</button></main>)}}
start();
