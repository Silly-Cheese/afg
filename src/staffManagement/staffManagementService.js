import { collection, doc, getDoc, getDocs, query, runTransaction, serverTimestamp, where, writeBatch } from 'firebase/firestore';

const rows = snap => snap.docs.map(d => ({ id: d.id, ...d.data() }));
const managementWords = ['manager','director','executive','chief','president','vice president','owner'];
const rankScore = (rank, index = 0) => Number(rank?.level ?? rank?.rankLevel ?? rank?.priority ?? rank?.order ?? index + 1);
const nameOf = value => String(value || '').trim();
const isManagementName = name => managementWords.some(word => nameOf(name).toLowerCase().includes(word));

function reviewScore(review) {
  if (!review) return 0;
  if (Number(review.overallScore) > 0) return Number(review.overallScore);
  const values = Object.values(review.scores || {}).map(Number).filter(value => value > 0);
  return values.length ? values.reduce((a,b)=>a+b,0)/values.length : 0;
}

export async function loadStaffManagement(db, uid) {
  const [bootstrapSnap, actorSnap, permissionSnap, staffSnap, ranksSnap, departmentsSnap, branchesSnap, usersSnap, reviewsSnap, trainingSnap, requestsSnap] = await Promise.all([
    getDoc(doc(db, 'system', 'bootstrap')),
    getDoc(doc(db, 'staffProfiles', uid)),
    getDoc(doc(db, 'staffPermissions', uid)),
    getDocs(collection(db, 'staffProfiles')),
    getDocs(collection(db, 'ranks')),
    getDocs(collection(db, 'departments')),
    getDocs(collection(db, 'branches')),
    getDocs(collection(db, 'users')),
    getDocs(collection(db, 'performanceReviews')),
    getDocs(collection(db, 'trainingAssignments')),
    getDocs(collection(db, 'careerRequests')),
  ]);

  const ownerUid = bootstrapSnap.exists() ? bootstrapSnap.data().ownerUid : null;
  const isOwner = ownerUid === uid;
  const actor = actorSnap.exists() ? { uid, ...actorSnap.data() } : (isOwner ? { uid, staffId: 'STF-000001', rankName: 'Founder & Owner', position: 'Founder and Owner' } : null);
  const permissions = permissionSnap.exists() ? permissionSnap.data().permissions || [] : [];
  const canManage = isOwner || permissions.includes('staff.manage') || permissions.includes('owner.override_all') || isManagementName(actor?.rankName) || isManagementName(actor?.position);

  const ranks = rows(ranksSnap).map((rank, index) => ({ ...rank, score: rankScore(rank, index), name: rank.name || rank.rankName || rank.title || rank.id })).sort((a, b) => a.score - b.score);
  const actorRank = ranks.find(r => r.id === actor?.rankId || r.name === actor?.rankName);
  const actorScore = isOwner ? Number.MAX_SAFE_INTEGER : Number(actor?.rankLevel ?? actorRank?.score ?? 0);
  const users = Object.fromEntries(rows(usersSnap).map(user => [user.id, user]));
  const reviews = rows(reviewsSnap);
  const training = rows(trainingSnap);
  const requests = rows(requestsSnap);

  const staff = rows(staffSnap).map(profile => {
    const staffUid = profile.uid || profile.id;
    const rank = ranks.find(r => r.id === profile.rankId || r.name === profile.rankName);
    const staffReviews = reviews.filter(item => item.staffUid === staffUid).sort((a,b)=>(b.createdAt?.seconds||0)-(a.createdAt?.seconds||0));
    const staffTraining = training.filter(item => item.staffUid === staffUid);
    const required = staffTraining.filter(item => item.required !== false);
    const completed = required.filter(item => item.status === 'completed');
    const latest = staffReviews[0];
    const score = reviewScore(latest);
    const readiness = {
      trainingComplete: required.length === 0 || completed.length >= required.length,
      probationComplete: ['completed','exempt','inactive'].includes(profile.probationStatus),
      performanceReady: score >= 3.5,
      disciplineClear: profile.disciplinaryStatus !== 'active',
      latestScore: Math.round(score * 10) / 10,
      completedTraining: completed.length,
      requiredTraining: required.length,
    };
    readiness.ready = readiness.trainingComplete && readiness.probationComplete && readiness.performanceReady && readiness.disciplineClear;
    return {
      ...profile,
      uid: staffUid,
      rankScore: Number(profile.rankLevel ?? rank?.score ?? 0),
      displayName: profile.displayName || users[profile.id]?.displayName || users[profile.id]?.username || profile.staffId || 'Staff member',
      username: users[profile.id]?.username || '',
      protectedOwner: profile.id === ownerUid,
      readiness,
      pendingPromotionRequest: requests.find(item => item.staffUid === staffUid && item.type === 'promotion' && item.status === 'submitted') || null,
    };
  }).filter(profile => profile.staffStatus !== 'terminated');

  return {
    allowed: canManage,
    isOwner,
    ownerUid,
    actor,
    actorScore,
    permissions,
    staff,
    ranks,
    departments: rows(departmentsSnap).map(x => ({ ...x, name: x.name || x.departmentName || x.id })),
    branches: rows(branchesSnap).map(x => ({ ...x, name: x.name || x.branchName || x.id })),
    promotionRequests: requests.filter(item => item.type === 'promotion' && item.status === 'submitted'),
  };
}

export async function applyStaffManagementAction(db, actor, context, target, form) {
  if (!context.allowed) throw new Error('Management access is required.');
  if (!target?.uid) throw new Error('Select a staff member.');
  if (target.uid === context.ownerUid) throw new Error('The Founder and Owner account is protected.');
  if (target.uid === actor.uid) throw new Error('You cannot promote, demote, or transfer yourself.');
  if (!context.isOwner && target.rankScore >= context.actorScore) throw new Error('You may only manage staff below your current rank.');
  if (form.reason.trim().length < 10) throw new Error('Enter a written reason of at least 10 characters.');

  const selectedRank = context.ranks.find(r => r.id === form.rankId);
  const selectedDepartment = context.departments.find(d => d.id === form.departmentId);
  const selectedBranch = context.branches.find(b => b.id === form.branchId);
  if (!selectedRank) throw new Error('Choose a valid rank.');
  if (!context.isOwner && selectedRank.score >= context.actorScore) throw new Error('You cannot assign a rank equal to or above your own.');

  const action = selectedRank.score > target.rankScore ? 'promotion' : selectedRank.score < target.rankScore ? 'demotion' : 'staff-update';
  const eventId = `CAR-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
  const auditId = `AUD-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
  const batch = writeBatch(db);
  const profileRef = doc(db, 'staffProfiles', target.uid);

  batch.update(profileRef, {
    rankId: selectedRank.id,
    rankName: selectedRank.name,
    rankLevel: selectedRank.score,
    position: form.position.trim() || target.position || selectedRank.name,
    departmentId: selectedDepartment?.id || form.departmentId || target.departmentId,
    departmentName: selectedDepartment?.name || target.departmentName || null,
    branchId: selectedBranch?.id || form.branchId || target.branchId,
    branchName: selectedBranch?.name || target.branchName || null,
    lastCareerAction: action,
    lastCareerReason: form.reason.trim(),
    lastCareerActionBy: actor.uid,
    lastCareerActionAt: serverTimestamp(),
    lastPromotionAt: action === 'promotion' ? serverTimestamp() : target.lastPromotionAt || null,
    updatedAt: serverTimestamp(),
  });

  batch.set(doc(db, 'careerEvents', eventId), {
    eventId, staffUid: target.uid, staffId: target.staffId, type: action,
    previousRankId: target.rankId || null, previousRankName: target.rankName || null,
    newRankId: selectedRank.id, newRankName: selectedRank.name,
    previousDepartmentId: target.departmentId || null, newDepartmentId: selectedDepartment?.id || target.departmentId || null,
    previousBranchId: target.branchId || null, newBranchId: selectedBranch?.id || target.branchId || null,
    position: form.position.trim() || target.position || selectedRank.name, reason: form.reason.trim(),
    actorUid: actor.uid, actorStaffId: actor.staffId || null, readinessAtDecision: target.readiness || null,
    immutable: true, createdAt: serverTimestamp(),
  });

  batch.set(doc(db, 'auditLogs', auditId), {
    actorUid: actor.uid, actorType: context.isOwner ? 'owner' : 'staff', action: `staff.${action}`,
    targetType: 'staff', targetId: target.staffId || target.uid, reason: form.reason.trim(), immutable: true, createdAt: serverTimestamp(),
  });

  if (target.pendingPromotionRequest && action === 'promotion') {
    batch.update(doc(db, 'careerRequests', target.pendingPromotionRequest.id), {
      status: 'approved', decisionReason: form.reason.trim(), decidedBy: actor.uid,
      decidedAt: serverTimestamp(), updatedAt: serverTimestamp(), ownerOverride: context.isOwner,
    });
  }

  await batch.commit();
  return action;
}

export async function denyPromotionRequest(db, actor, context, target, reason) {
  if (!context.allowed || !target?.pendingPromotionRequest) throw new Error('No pending promotion request is available.');
  if (target.uid === context.ownerUid || target.uid === actor.uid) throw new Error('This request cannot be managed here.');
  if (!context.isOwner && target.rankScore >= context.actorScore) throw new Error('You may only manage staff below your current rank.');
  if (String(reason || '').trim().length < 10) throw new Error('Enter a denial reason of at least 10 characters.');
  const batch = writeBatch(db);
  batch.update(doc(db, 'careerRequests', target.pendingPromotionRequest.id), {
    status: 'denied', decisionReason: reason.trim(), decidedBy: actor.uid,
    decidedAt: serverTimestamp(), updatedAt: serverTimestamp(), ownerOverride: context.isOwner,
  });
  batch.set(doc(collection(db, 'auditLogs')), {
    actorUid: actor.uid, actorType: context.isOwner ? 'owner' : 'staff', action: 'career.promotion.denied',
    targetType: 'staff', targetId: target.staffId || target.uid, reason: reason.trim(), immutable: true, createdAt: serverTimestamp(),
  });
  await batch.commit();
}
