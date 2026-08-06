import React, { useMemo, useState } from 'react';
import { createUserWithEmailAndPassword, getAuth, updateProfile } from 'firebase/auth';
import { collection, doc, serverTimestamp, writeBatch } from 'firebase/firestore';
import {
  ArrowLeft,
  ArrowRight,
  BadgeCheck,
  Building2,
  Check,
  CircleDollarSign,
  Crown,
  Landmark,
  LockKeyhole,
  ShieldCheck,
  Sparkles,
  UserRoundCog,
} from 'lucide-react';

const steps = [
  { id: 'institution', label: 'Institution', icon: Landmark },
  { id: 'owner', label: 'Founder', icon: Crown },
  { id: 'financial', label: 'Defaults', icon: CircleDollarSign },
  { id: 'organization', label: 'Organization', icon: Building2 },
  { id: 'review', label: 'Finalize', icon: ShieldCheck },
];

const defaultDepartments = [
  ['customer-services', 'Customer Services', '#2F6FED'],
  ['banking-operations', 'Banking Operations', '#336B59'],
  ['lending-underwriting', 'Lending & Underwriting', '#315C9B'],
  ['collections-recovery', 'Collections & Recovery', '#A06A24'],
  ['business-commercial', 'Business & Commercial Services', '#5B4C9C'],
  ['fraud-investigations', 'Fraud & Investigations', '#8F3535'],
  ['risk-compliance', 'Risk & Compliance', '#5E6875'],
  ['internal-audit', 'Internal Audit', '#4D5560'],
  ['human-resources', 'Human Resources', '#3F7B65'],
  ['training-development', 'Training & Development', '#7B5B99'],
  ['technology-systems', 'Technology & Systems', '#5846A3'],
  ['executive-office', 'Executive Office', '#C9A227'],
];

const defaultBranches = [
  ['capital', 'Capital Branch', true],
  ['north', 'North Branch', false],
  ['south', 'South Branch', false],
  ['east', 'East Branch', false],
  ['west', 'West Branch', false],
];

const defaultRanks = [
  [1, 'Staff Trainee', 'entry'],
  [2, 'Financial Services Associate', 'entry'],
  [3, 'Financial Services Specialist', 'professional'],
  [4, 'Senior Financial Services Specialist', 'professional'],
  [5, 'Department Supervisor', 'supervisory'],
  [6, 'Assistant Branch Manager', 'supervisory'],
  [7, 'Branch Manager', 'supervisory'],
  [8, 'Regional Manager', 'senior-management'],
  [9, 'Director of Operations', 'senior-management'],
  [10, 'Executive Director', 'executive'],
  [11, 'Deputy Chief Executive', 'executive'],
  [12, 'Chief Executive Officer', 'executive'],
  [13, 'Founder & Owner', 'ownership'],
];

const allOwnerPermissions = [
  'owner.override_all',
  'owner.manage_all',
  'owner.view_all',
  'owner.assign_any_role',
  'owner.modify_any_record',
  'owner.bypass_workflow',
  'owner.restore_records',
  'owner.reverse_decisions',
  'owner.manage_permissions',
  'owner.manage_system',
];

function normalizeUsername(value) {
  return value.trim().toLowerCase().replace(/[^a-z0-9._-]/g, '');
}

function ownerAuthEmail(username) {
  return `${normalizeUsername(username)}@users.afg-game.local`;
}

function StepHeader({ currentStep }) {
  return (
    <div className="bootstrap-stepper" aria-label="Setup progress">
      {steps.map((step, index) => {
        const Icon = step.icon;
        const state = index < currentStep ? 'complete' : index === currentStep ? 'active' : '';
        return (
          <div className={`bootstrap-step ${state}`} key={step.id}>
            <span className="bootstrap-step-icon">{index < currentStep ? <Check size={17} /> : <Icon size={17} />}</span>
            <span>{step.label}</span>
          </div>
        );
      })}
    </div>
  );
}

function Field({ label, helper, ...props }) {
  return (
    <label className="bootstrap-field">
      <span>{label}</span>
      <input {...props} />
      {helper && <small>{helper}</small>}
    </label>
  );
}

function SelectField({ label, children, ...props }) {
  return (
    <label className="bootstrap-field">
      <span>{label}</span>
      <select {...props}>{children}</select>
    </label>
  );
}

export default function BootstrapApp({ firebaseApp, db }) {
  const [currentStep, setCurrentStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [complete, setComplete] = useState(false);
  const [form, setForm] = useState({
    institutionName: 'Apex Financial Group',
    abbreviation: 'AFG',
    motto: "Building Tomorrow's Success.",
    ownerUsername: '',
    ownerDisplayName: '',
    ownerDiscordUsername: '',
    ownerPassword: '',
    ownerPasswordConfirm: '',
    currencyName: 'Apex Dollars',
    currencySymbol: '$',
    startingBalance: '2500',
    startingTrustScore: '600',
    headquartersBranch: 'capital',
  });

  const ownerEmail = useMemo(() => ownerAuthEmail(form.ownerUsername || 'owner'), [form.ownerUsername]);

  function update(name, value) {
    setForm((previous) => ({ ...previous, [name]: value }));
    setError('');
  }

  function validateStep() {
    if (currentStep === 0 && (!form.institutionName.trim() || !form.abbreviation.trim() || !form.motto.trim())) {
      return 'Complete all institution identity fields.';
    }
    if (currentStep === 1) {
      if (normalizeUsername(form.ownerUsername).length < 3) return 'The owner username must contain at least three valid characters.';
      if (form.ownerDisplayName.trim().length < 2) return 'Enter the Founder and Owner display name.';
      if (form.ownerPassword.length < 8) return 'The owner password must contain at least eight characters.';
      if (form.ownerPassword !== form.ownerPasswordConfirm) return 'The owner passwords do not match.';
    }
    if (currentStep === 2) {
      const balance = Number(form.startingBalance);
      const score = Number(form.startingTrustScore);
      if (!Number.isFinite(balance) || balance < 0) return 'Starting balance must be zero or greater.';
      if (!Number.isFinite(score) || score < 300 || score > 850) return 'Starting Trust Score must be between 300 and 850.';
    }
    return '';
  }

  function next() {
    const validationError = validateStep();
    if (validationError) {
      setError(validationError);
      return;
    }
    setCurrentStep((value) => Math.min(value + 1, steps.length - 1));
  }

  async function finalizeBootstrap() {
    const validationError = validateStep();
    if (validationError) {
      setError(validationError);
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      const auth = getAuth(firebaseApp);
      const credential = await createUserWithEmailAndPassword(auth, ownerEmail, form.ownerPassword);
      await updateProfile(credential.user, { displayName: form.ownerDisplayName.trim() });

      const uid = credential.user.uid;
      const batch = writeBatch(db);
      const createdAt = serverTimestamp();
      const customerId = 'CUS-OWNER';
      const staffId = 'STF-000001';

      batch.set(doc(db, 'system', 'bootstrap'), {
        status: 'complete',
        version: 1,
        ownerUid: uid,
        completedAt: createdAt,
        locked: true,
        publicRegistrationEnabled: true,
      });

      batch.set(doc(db, 'systemSettings', 'main'), {
        institutionName: form.institutionName.trim(),
        abbreviation: form.abbreviation.trim().toUpperCase(),
        motto: form.motto.trim(),
        currencyName: form.currencyName.trim(),
        currencySymbol: form.currencySymbol.trim() || '$',
        startingCustomerBalance: Number(form.startingBalance),
        startingTrustScore: Number(form.startingTrustScore),
        headquartersBranchId: form.headquartersBranch,
        registrationEnabled: true,
        maintenanceMode: false,
        uploadsEnabled: false,
        simulationOnly: true,
        ownerUid: uid,
        initializedAt: createdAt,
      });

      batch.set(doc(db, 'users', uid), {
        uid,
        username: normalizeUsername(form.ownerUsername),
        usernameLower: normalizeUsername(form.ownerUsername),
        displayName: form.ownerDisplayName.trim(),
        discordUsername: form.ownerDiscordUsername.trim(),
        authEmail: ownerEmail,
        customerId,
        staffId,
        role: 'owner',
        accountStatus: 'active',
        protectedAccount: true,
        createdAt,
      });

      batch.set(doc(db, 'usernames', normalizeUsername(form.ownerUsername)), { uid, createdAt });

      batch.set(doc(db, 'customerProfiles', uid), {
        uid,
        customerId,
        displayName: form.ownerDisplayName.trim(),
        discordUsername: form.ownerDiscordUsername.trim(),
        classification: ['customer', 'premium-customer'],
        accountStatus: 'active',
        homeBranchId: form.headquartersBranch,
        trustScore: Number(form.startingTrustScore),
        reputation: 100,
        customerSince: createdAt,
      });

      batch.set(doc(db, 'staffProfiles', uid), {
        uid,
        staffId,
        rankId: 'rank-13',
        rankName: 'Founder & Owner',
        position: 'Founder & Owner',
        departmentId: 'executive-office',
        branchId: form.headquartersBranch,
        staffStatus: 'active',
        protectedAccount: true,
        hiredAt: createdAt,
        appointedBy: uid,
      });

      batch.set(doc(db, 'staffPermissions', uid), {
        uid,
        permissions: allOwnerPermissions,
        isOwner: true,
        globalOverride: true,
        updatedAt: createdAt,
        updatedBy: uid,
      });

      batch.set(doc(db, 'accounts', `${uid}-checking`), {
        accountId: 'ACC-OWNER-CHK',
        ownerUid: uid,
        customerId,
        type: 'checking',
        name: 'Founder Checking',
        balance: Number(form.startingBalance),
        availableBalance: Number(form.startingBalance),
        status: 'active',
        createdAt,
      });

      batch.set(doc(db, 'accounts', `${uid}-savings`), {
        accountId: 'ACC-OWNER-SAV',
        ownerUid: uid,
        customerId,
        type: 'savings',
        name: 'Founder Savings',
        balance: 0,
        availableBalance: 0,
        status: 'active',
        createdAt,
      });

      defaultDepartments.forEach(([id, name, accent], order) => {
        batch.set(doc(db, 'departments', id), {
          departmentId: id,
          name,
          accentColor: accent,
          order: order + 1,
          active: true,
          createdAt,
          createdBy: uid,
        });
      });

      defaultBranches.forEach(([id, name, headquarters], order) => {
        batch.set(doc(db, 'branches', id), {
          branchId: id,
          name,
          headquarters,
          order: order + 1,
          active: true,
          managerUid: headquarters ? uid : null,
          createdAt,
          createdBy: uid,
        });
      });

      defaultRanks.forEach(([level, name, tier]) => {
        batch.set(doc(db, 'ranks', `rank-${level}`), {
          rankId: `rank-${level}`,
          level,
          name,
          tier,
          active: true,
          createdAt,
          createdBy: uid,
        });
      });

      const auditRef = doc(collection(db, 'auditLogs'));
      batch.set(auditRef, {
        auditId: auditRef.id,
        action: 'system.bootstrap.completed',
        actorUid: uid,
        actorStaffId: staffId,
        targetType: 'system',
        targetId: 'bootstrap',
        reason: 'Initial institution setup and protected owner account creation.',
        branchId: form.headquartersBranch,
        departmentId: 'executive-office',
        timestamp: createdAt,
        immutable: true,
      });

      await batch.commit();
      setComplete(true);
    } catch (bootstrapError) {
      const messages = {
        'auth/email-already-in-use': 'That owner username has already been used in Firebase Authentication.',
        'auth/weak-password': 'Choose a stronger owner password.',
        'auth/operation-not-allowed': 'Enable Email/Password authentication in Firebase before bootstrapping.',
        'permission-denied': 'Firestore rejected the bootstrap. Deploy the Phase 2A security rules first.',
      };
      setError(messages[bootstrapError?.code] || bootstrapError?.message || 'Bootstrap failed.');
    } finally {
      setSubmitting(false);
    }
  }

  if (complete) {
    return (
      <main className="bootstrap-shell bootstrap-complete">
        <section className="bootstrap-success-card">
          <span className="bootstrap-success-icon"><BadgeCheck size={44} /></span>
          <span className="bootstrap-kicker">INSTITUTION INITIALIZED</span>
          <h1>{form.institutionName} is ready.</h1>
          <p>Your protected Founder and Owner account, headquarters branch, departments, staff ranks, permissions, financial defaults, and first audit record have been created.</p>
          <div className="bootstrap-summary-grid">
            <div><small>Owner</small><strong>{form.ownerDisplayName}</strong></div>
            <div><small>Username</small><strong>{normalizeUsername(form.ownerUsername)}</strong></div>
            <div><small>Staff ID</small><strong>STF-000001</strong></div>
            <div><small>Customer ID</small><strong>CUS-OWNER</strong></div>
          </div>
          <button className="button button-gold button-large" type="button" onClick={() => window.location.reload()}>
            Enter Apex Financial Group <ArrowRight size={18} />
          </button>
          <small>The bootstrap wizard is now permanently locked.</small>
        </section>
      </main>
    );
  }

  return (
    <main className="bootstrap-shell">
      <div className="bootstrap-layout">
        <aside className="bootstrap-aside">
          <div className="bootstrap-brand">
            <span><Landmark /></span>
            <div><strong>Apex Financial Group</strong><small>Institution Bootstrap</small></div>
          </div>
          <div className="bootstrap-aside-copy">
            <span className="bootstrap-kicker"><Sparkles size={14} /> PHASE 2A</span>
            <h1>Found the institution.</h1>
            <p>This secure, one-time process establishes the root account and installs AFG's organizational foundation.</p>
          </div>
          <div className="bootstrap-security-list">
            <div><LockKeyhole /><span><strong>One-time setup</strong><small>Unavailable after completion</small></span></div>
            <div><Crown /><span><strong>Protected ownership</strong><small>Global authority and override access</small></span></div>
            <div><ShieldCheck /><span><strong>Audited initialization</strong><small>First privileged action is recorded</small></span></div>
          </div>
          <p className="bootstrap-disclaimer">Fictional financial simulation only. No real financial services or document uploads.</p>
        </aside>

        <section className="bootstrap-main">
          <StepHeader currentStep={currentStep} />
          <div className="bootstrap-panel">
            {currentStep === 0 && (
              <>
                <div className="bootstrap-panel-heading"><span className="bootstrap-kicker">STEP 1 OF 5</span><h2>Institution identity</h2><p>Confirm the official identity displayed throughout the platform.</p></div>
                <div className="bootstrap-form-grid">
                  <Field label="Institution name" value={form.institutionName} onChange={(event) => update('institutionName', event.target.value)} />
                  <Field label="Abbreviation" value={form.abbreviation} maxLength={8} onChange={(event) => update('abbreviation', event.target.value)} />
                  <Field label="Official motto" value={form.motto} onChange={(event) => update('motto', event.target.value)} />
                </div>
              </>
            )}

            {currentStep === 1 && (
              <>
                <div className="bootstrap-panel-heading"><span className="bootstrap-kicker">STEP 2 OF 5</span><h2>Founder and Owner</h2><p>Create the protected root account. This account can override every institutional workflow.</p></div>
                <div className="bootstrap-callout"><UserRoundCog /><div><strong>No public owner registration</strong><p>This is the only workflow permitted to create the Founder and Owner account.</p></div></div>
                <div className="bootstrap-form-grid two">
                  <Field label="Owner username" value={form.ownerUsername} autoComplete="username" onChange={(event) => update('ownerUsername', event.target.value)} helper={`Internal authentication identity: ${ownerEmail}`} />
                  <Field label="Display name" value={form.ownerDisplayName} onChange={(event) => update('ownerDisplayName', event.target.value)} />
                  <Field label="Discord username" value={form.ownerDiscordUsername} onChange={(event) => update('ownerDiscordUsername', event.target.value)} helper="Optional, but recommended for server verification." />
                  <span />
                  <Field label="Password" type="password" value={form.ownerPassword} autoComplete="new-password" onChange={(event) => update('ownerPassword', event.target.value)} />
                  <Field label="Confirm password" type="password" value={form.ownerPasswordConfirm} autoComplete="new-password" onChange={(event) => update('ownerPasswordConfirm', event.target.value)} />
                </div>
              </>
            )}

            {currentStep === 2 && (
              <>
                <div className="bootstrap-panel-heading"><span className="bootstrap-kicker">STEP 3 OF 5</span><h2>Financial defaults</h2><p>Set the opening values used when Phase 2B creates customer identities.</p></div>
                <div className="bootstrap-form-grid two">
                  <Field label="Currency name" value={form.currencyName} onChange={(event) => update('currencyName', event.target.value)} />
                  <Field label="Currency symbol" value={form.currencySymbol} maxLength={4} onChange={(event) => update('currencySymbol', event.target.value)} />
                  <Field label="Starting customer balance" type="number" min="0" step="1" value={form.startingBalance} onChange={(event) => update('startingBalance', event.target.value)} />
                  <Field label="Starting Financial Trust Score" type="number" min="300" max="850" value={form.startingTrustScore} onChange={(event) => update('startingTrustScore', event.target.value)} />
                </div>
                <div className="bootstrap-callout neutral"><CircleDollarSign /><div><strong>Simulation values only</strong><p>These balances and scores have no real-world monetary or credit value.</p></div></div>
              </>
            )}

            {currentStep === 3 && (
              <>
                <div className="bootstrap-panel-heading"><span className="bootstrap-kicker">STEP 4 OF 5</span><h2>Organizational foundation</h2><p>Install the approved branches, departments, and thirteen-level staff hierarchy.</p></div>
                <SelectField label="Headquarters branch" value={form.headquartersBranch} onChange={(event) => update('headquartersBranch', event.target.value)}>
                  {defaultBranches.map(([id, name]) => <option value={id} key={id}>{name}</option>)}
                </SelectField>
                <div className="bootstrap-install-grid">
                  <div><strong>5</strong><span>Branches</span><small>Capital, North, South, East, West</small></div>
                  <div><strong>12</strong><span>Departments</span><small>Operations through Executive Office</small></div>
                  <div><strong>13</strong><span>Staff ranks</span><small>Trainee through Founder & Owner</small></div>
                  <div><strong>10</strong><span>Owner permissions</span><small>Global administration and override authority</small></div>
                </div>
              </>
            )}

            {currentStep === 4 && (
              <>
                <div className="bootstrap-panel-heading"><span className="bootstrap-kicker">STEP 5 OF 5</span><h2>Review and initialize</h2><p>Creating the institution is permanent. The bootstrap closes after the database commit succeeds.</p></div>
                <div className="bootstrap-review">
                  <div><small>Institution</small><strong>{form.institutionName}</strong><span>{form.abbreviation.toUpperCase()} · {form.motto}</span></div>
                  <div><small>Founder and Owner</small><strong>{form.ownerDisplayName}</strong><span>@{normalizeUsername(form.ownerUsername)} · Founder & Owner</span></div>
                  <div><small>Financial defaults</small><strong>{form.currencySymbol}{Number(form.startingBalance || 0).toLocaleString()} opening balance</strong><span>Starting Trust Score: {form.startingTrustScore}</span></div>
                  <div><small>Organization</small><strong>{defaultBranches.find(([id]) => id === form.headquartersBranch)?.[1]}</strong><span>5 branches · 12 departments · 13 ranks</span></div>
                </div>
                <label className="bootstrap-confirmation"><input type="checkbox" required /><span>I understand that this creates the protected root account and permanently closes the public bootstrap process.</span></label>
              </>
            )}

            {error && <div className="bootstrap-error" role="alert">{error}</div>}

            <div className="bootstrap-actions">
              <button className="button button-ghost" type="button" disabled={currentStep === 0 || submitting} onClick={() => { setCurrentStep((value) => Math.max(value - 1, 0)); setError(''); }}><ArrowLeft size={17} /> Back</button>
              {currentStep < steps.length - 1 ? (
                <button className="button button-gold" type="button" onClick={next}>Continue <ArrowRight size={17} /></button>
              ) : (
                <button className="button button-gold" type="button" disabled={submitting} onClick={finalizeBootstrap}>{submitting ? 'Initializing institution…' : 'Initialize Apex Financial Group'} <ShieldCheck size={17} /></button>
              )}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
