import { collection, doc, getDoc, getDocs, serverTimestamp, writeBatch } from 'firebase/firestore';

const rows = snap => snap.docs.map(d => ({ id: d.id, ...d.data() }));
const managementWords = ['manager','director','executive','chief','president','vice president','owner'];
const rankScore = (rank, index = 0) => Number(rank?.level ?? rank?.rankLevel ?? rank?.priority ?? rank?.order ?? index + 1);
const nameOf = value => String(value || '').trim();
const isManagementName = name => managementWords.some(word => nameOf(name).toLowerCase().includes(word));

export async function loadStaffManagement(db, uid) {
  const [bootstrapSnap, actorSnap, permissionSnap, staffSnap, ranksSnap, departmentsSnap, branchesSnap, usersSnap] = await Promise.all([
    getDoc(doc(db, 'system', 'bootstrap')),
    getDoc(doc(db, 'staffProfiles', uid)),
    getDoc(doc(db, 'staffPermissions', uid)),
    getDocs(collection(db, 'staffProfiles')),
    getDocs(collection(db, 'ranks')),
    getDocs(collection(db, 'departments')),
    getDocs(collection(db, 'branches')),
    getDocs(collection(db, 'users')),
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

  const staff = rows(staffSnap).map(profile => {
    const rank = ranks.find(r => r.id === profile.rankId || r.name === profile.rankName);
    return {
      ...profile,
      uid: profile.uid || profile.id,
      rankScore: Number(profile.rankLevel ?? rank?.score ?? 0),
      displayName: profile.displayName || users[profile.id]?.displayName || users[profile.id]?.username || profile.staffId || 'Staff member',
      username: users[profile.id]?.username || '',
      protectedOwner: profile.id === ownerUid,
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
    updatedAt: serverTimestamp(),
  });

  batch.set(doc(db, 'careerEvents', eventId), {
    eventId,
    staffUid: target.uid,
    staffId: target.staffId,
    type: action,
    previousRankId: target.rankId || null,
    previousRankName: target.rankName || null,
    newRankId: selectedRank.id,
    newRankName: selectedRank.name,
    previousDepartmentId: target.departmentId || null,
    newDepartmentId: selectedDepartment?.id || target.departmentId || null,
    previousBranchId: target.branchId || null,
    newBranchId: selectedBranch?.id || target.branchId || null,
    position: form.position.trim() || target.position || selectedRank.name,
    reason: form.reason.trim(),
    actorUid: actor.uid,
    actorStaffId: actor.staffId || null,
    immutable: true,
    createdAt: serverTimestamp(),
  });

  batch.set(doc(db, 'auditLogs', auditId), {
    actorUid: actor.uid,
    actorType: context.isOwner ? 'owner' : 'staff',
    action: `staff.${action}`,
    targetType: 'staff',
    targetId: target.staffId || target.uid,
    reason: form.reason.trim(),
    immutable: true,
    createdAt: serverTimestamp(),
  });

  await batch.commit();
  return action;
}
