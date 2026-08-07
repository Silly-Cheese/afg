import { addDoc, collection, doc, getDoc, getDocs, query, runTransaction, serverTimestamp, updateDoc, where } from 'firebase/firestore';

export const DEPARTMENTS = [
  ['customer-services', 'Customer Services'],
  ['banking-operations', 'Banking Operations'],
  ['lending-underwriting', 'Lending & Underwriting'],
  ['collections-recovery', 'Collections & Recovery'],
  ['business-commercial', 'Business & Commercial Services'],
  ['fraud-investigations', 'Fraud & Investigations'],
  ['risk-compliance', 'Risk & Compliance'],
  ['internal-audit', 'Internal Audit'],
  ['human-resources', 'Human Resources'],
  ['training-development', 'Training & Development'],
  ['technology-systems', 'Technology & Systems'],
].map(([id, name]) => ({ id, name }));

export const POSITIONS = [
  ['customer-services', 'Customer Service Representative'],
  ['banking-operations', 'Account Services Representative'],
  ['lending-underwriting', 'Loan Processor'],
  ['collections-recovery', 'Collections Representative'],
  ['business-commercial', 'Business Account Specialist'],
  ['fraud-investigations', 'Fraud Review Specialist'],
  ['risk-compliance', 'Compliance Analyst'],
  ['internal-audit', 'Junior Internal Auditor'],
  ['human-resources', 'HR Assistant'],
  ['training-development', 'Training Assistant'],
  ['technology-systems', 'Technical Support Specialist'],
].map(([departmentId, name]) => ({ departmentId, name }));

const stamp = () => new Date().toISOString();
const event = (status, label, actorType, actorUid) => ({ status, label, actorType, actorUid, createdAt: stamp() });
const makeStaffId = () => `STF-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;

export async function getHiringAccess(db, uid) {
  const [bootstrap, permission, staff] = await Promise.all([
    getDoc(doc(db, 'system', 'bootstrap')),
    getDoc(doc(db, 'staffPermissions', uid)),
    getDoc(doc(db, 'staffProfiles', uid)),
  ]);

  const isOwner = bootstrap.exists() && bootstrap.data().ownerUid === uid;
  const permissions = permission.exists() ? permission.data().permissions || [] : [];

  return {
    isOwner,
    permissions,
    profile: staff.exists() ? staff.data() : null,
    mayReview: isOwner || permissions.some((value) => [
      'staff.applications.view',
      'staff.applications.review',
      'staff.applications.decide',
      'staff.manage',
      'hr.manage',
      'owner.override_all',
    ].includes(value)),
  };
}

export async function loadStaffApplications(db, uid, all = false) {
  const request = all
    ? query(collection(db, 'applications'), where('category', '==', 'staff'))
    : query(collection(db, 'applications'), where('applicantUid', '==', uid), where('category', '==', 'staff'));
  const snap = await getDocs(request);
  return snap.docs
    .map((item) => ({ id: item.id, ...item.data() }))
    .sort((a, b) => (b.updatedAt?.seconds || 0) - (a.updatedAt?.seconds || 0));
}

export async function loadOrganization(db) {
  const [branches, departments] = await Promise.all([
    getDocs(collection(db, 'branches')),
    getDocs(collection(db, 'departments')),
  ]);

  return {
    branches: branches.docs.map((item) => ({ id: item.id, ...item.data() })).filter((item) => item.active !== false),
    departments: departments.docs.map((item) => ({ id: item.id, ...item.data() })).filter((item) => item.active !== false),
  };
}

export async function createStaffApplication(db, userRecord, form) {
  if (!userRecord?.uid || !userRecord?.customerId) throw new Error('Your customer identity is incomplete. Refresh the page and try again.');
  if (!form.departmentId || !form.position || form.motivation.trim().length < 25) {
    throw new Error('Complete the department, position, and motivation fields.');
  }

  const responses = {
    departmentId: form.departmentId,
    preferredBranchId: form.preferredBranchId || 'capital',
    position: form.position,
    availability: form.availability.trim(),
    experience: form.experience.trim(),
    skills: form.skills.trim(),
    motivation: form.motivation.trim(),
    scenario: form.scenario.trim(),
  };

  const ref = await addDoc(collection(db, 'applications'), {
    applicationId: `APP-STF-${crypto.randomUUID().slice(0, 8).toUpperCase()}`,
    applicantUid: userRecord.uid,
    customerId: userRecord.customerId,
    applicationType: 'staff-application',
    applicationName: 'Staff Application',
    category: 'staff',
    status: 'draft',
    currentStep: 1,
    responses,
    applicantMessages: [],
    timeline: [event('draft', 'Staff application draft created', 'customer', userRecord.uid)],
    assignedReviewerUid: null,
    internalNotesCount: 0,
    uploadsAllowed: false,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  await updateDoc(ref, {
    status: 'submitted',
    submittedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    timeline: [
      event('draft', 'Staff application draft created', 'customer', userRecord.uid),
      event('submitted', 'Staff application submitted', 'customer', userRecord.uid),
    ],
  });

  return ref.id;
}

export async function advanceHiring(db, id, reviewer, action, data = {}) {
  const ref = doc(db, 'applications', id);
  const snap = await getDoc(ref);
  if (!snap.exists()) throw new Error('Application not found.');
  const application = snap.data();
  if (application.category !== 'staff') throw new Error('This is not a staff application.');

  const labels = {
    screen: 'Initial screening completed',
    interview: 'Interview requested',
    interviewed: 'Interview completed',
    department: 'Department review started',
    executive: 'Executive review started',
    conditional: 'Conditional offer issued',
    deny: 'Application denied',
  };

  const statuses = {
    screen: 'initial-screening',
    interview: 'interview-requested',
    interviewed: 'interview-completed',
    department: 'department-review',
    executive: 'executive-review',
    conditional: 'conditionally-accepted',
    deny: 'denied',
  };

  const status = statuses[action];
  if (!status) throw new Error('Invalid hiring action.');

  const message = (data.message || '').trim();
  const update = {
    status,
    assignedReviewerUid: reviewer.uid,
    assignedReviewerName: reviewer.name,
    updatedAt: serverTimestamp(),
    timeline: [...(application.timeline || []), event(status, labels[action], 'staff', reviewer.uid)],
    hiringReview: {
      score: Number(data.score || 0),
      recommendation: data.recommendation || '',
      notes: (data.notes || '').trim(),
      reviewedBy: reviewer.uid,
      reviewedAt: stamp(),
    },
  };

  if (message) {
    update.applicantMessages = [
      ...(application.applicantMessages || []),
      { direction: 'staff-to-customer', message, createdAt: stamp(), actorUid: reviewer.uid },
    ];
  }

  await updateDoc(ref, update);
}

export async function appointStaff(db, id, reviewer, appointment) {
  if ((appointment.reason || '').trim().length < 10) throw new Error('Enter an appointment reason.');

  const applicationRef = doc(db, 'applications', id);

  await runTransaction(db, async (transaction) => {
    const applicationSnap = await transaction.get(applicationRef);
    if (!applicationSnap.exists()) throw new Error('Application not found.');

    const application = applicationSnap.data();
    if (application.category !== 'staff' || ['accepted', 'denied', 'withdrawn'].includes(application.status)) {
      throw new Error('This application cannot be appointed.');
    }

    const uid = application.applicantUid;
    const userRef = doc(db, 'users', uid);
    const profileRef = doc(db, 'staffProfiles', uid);
    const permissionRef = doc(db, 'staffPermissions', uid);

    const [userSnap, profileSnap] = await Promise.all([
      transaction.get(userRef),
      transaction.get(profileRef),
    ]);

    if (!userSnap.exists()) throw new Error('Applicant account not found.');
    if (profileSnap.exists()) throw new Error('This applicant already has a staff profile.');

    const idValue = makeStaffId();
    const departmentId = appointment.departmentId || application.responses?.departmentId;
    const branchId = appointment.branchId || application.responses?.preferredBranchId || 'capital';
    const position = appointment.position || application.responses?.position || 'Staff Trainee';
    const permissions = ['staff.portal.access', 'academy.staff.view', 'policies.view', 'tasks.view'];

    transaction.update(applicationRef, {
      status: 'accepted',
      appointment: {
        staffId: idValue,
        rankId: 'rank-1',
        rankName: 'Staff Trainee',
        departmentId,
        branchId,
        position,
        probation: true,
        appointedBy: reviewer.uid,
        appointedAt: stamp(),
        ownerOverride: Boolean(appointment.ownerOverride),
        reason: appointment.reason.trim(),
      },
      updatedAt: serverTimestamp(),
      timeline: [
        ...(application.timeline || []),
        event('accepted', 'Appointed as Staff Trainee', reviewer.isOwner ? 'owner' : 'staff', reviewer.uid),
      ],
    });

    const existingRoles = Array.isArray(userSnap.data().roles) ? userSnap.data().roles : ['customer'];
    transaction.update(userRef, {
      staffId: idValue,
      primaryRole: userSnap.data().primaryRole || 'customer',
      roles: [...new Set([...existingRoles, 'staff'])],
      updatedAt: serverTimestamp(),
    });

    transaction.set(profileRef, {
      uid,
      staffId: idValue,
      customerId: application.customerId,
      rankId: 'rank-1',
      rankName: 'Staff Trainee',
      rankLevel: 1,
      position,
      departmentId,
      branchId,
      staffStatus: 'trainee',
      probationStatus: 'active',
      protectedAccount: false,
      hiredAt: serverTimestamp(),
      appointedBy: reviewer.uid,
      applicationId: application.applicationId,
    });

    transaction.set(permissionRef, {
      uid,
      permissions,
      isOwner: false,
      globalOverride: false,
      updatedAt: serverTimestamp(),
      updatedBy: reviewer.uid,
    });

    transaction.set(doc(collection(db, 'trainingAssignments')), {
      assignmentId: `TRN-${crypto.randomUUID().slice(0, 8).toUpperCase()}`,
      staffUid: uid,
      staffId: idValue,
      type: 'onboarding',
      courses: [
        'afg-orientation',
        'professional-conduct',
        'customer-privacy',
        'fictional-information-safety',
        'conflict-of-interest',
      ],
      status: 'assigned',
      required: true,
      assignedBy: reviewer.uid,
      assignedAt: serverTimestamp(),
    });

    transaction.set(doc(collection(db, 'staffAppointments')), {
      applicationId: application.applicationId,
      staffUid: uid,
      staffId: idValue,
      departmentId,
      branchId,
      position,
      rankId: 'rank-1',
      ownerOverride: Boolean(appointment.ownerOverride),
      reason: appointment.reason.trim(),
      appointedBy: reviewer.uid,
      immutable: true,
      createdAt: serverTimestamp(),
    });

    transaction.set(doc(collection(db, 'auditLogs')), {
      actorUid: reviewer.uid,
      actorType: appointment.ownerOverride ? 'owner' : 'staff',
      action: appointment.ownerOverride ? 'staff.appointment.overridden' : 'staff.appointment.created',
      targetType: 'staff',
      targetId: idValue,
      reason: appointment.reason.trim(),
      immutable: true,
      createdAt: serverTimestamp(),
    });
  });
}
