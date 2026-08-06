import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Navigate } from 'react-router-dom';
import { getApp, getApps, initializeApp } from 'firebase/app';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { Landmark } from 'lucide-react';
import ProgressionPage from './ProgressionPage.jsx';
import '../styles.css';
import '../customer/phase2b.css';
import './phase4.css';

const firebaseConfig={apiKey:'AIzaSyCG7LQR2vM2r68Y414jToA1_CDmUE_Ncdw',authDomain:'afg-game.firebaseapp.com',projectId:'afg-game',storageBucket:'afg-game.firebasestorage.app',messagingSenderId:'779966850290',appId:'1:779966850290:web:24f48af23a2e6cae2d9c6b'};
const app=getApps().length?getApp():initializeApp(firebaseConfig);
const auth=getAuth(app);
const db=getFirestore(app);

function Entry(){
  const [state,setState]=useState({loading:true,user:null});
  useEffect(()=>onAuthStateChanged(auth,user=>setState({loading:false,user})),[]);
  if(state.loading)return <div className="loading-screen"><Landmark/><strong>Apex Financial Group</strong><span>Loading secure progression…</span></div>;
  if(!state.user)return <Navigate to="/signin" replace/>;
  return <ProgressionPage auth={auth} db={db} user={state.user}/>;
}

createRoot(document.getElementById('root')).render(<React.StrictMode><BrowserRouter><Entry/></BrowserRouter></React.StrictMode>);
