<script lang="ts">
  import { onMount } from 'svelte';
  import AdminNav from '../shared/AdminNav.svelte';
  import {
    accountStatusLabel,
    subjectRequiredForBand,
    teacherLabel,
    validateRollNumber,
    validateSubjectForBand,
    type BandShape,
    type ChildShape,
    type ChildStatus,
    type SectionShape,
    type TeacherRosterShape,
    type TeacherSectionShape,
  } from './roster-logic';
  import * as api from './api';

  let sections = $state<SectionShape[]>([]);
  let children = $state<ChildShape[]>([]);
  let assignments = $state<TeacherSectionShape[]>([]);
  let teachers = $state<TeacherRosterShape[]>([]);
  let bands = $state<BandShape[]>([]);
  let selectedSectionId = $state<string | null>(null);
  let loading = $state(true);
  let error = $state<string | null>(null);
  let busy = $state(false);

  // Create section form
  let newSectionName = $state('');
  let newSectionBandId = $state('');
  let newSectionGrade = $state('');

  // Create child form
  let newChildName = $state('');
  let newChildRoll = $state('');

  // Assignment form
  let assignTeacherId = $state('');
  let assignSubjectId = $state('');
  let assignIsClassTeacher = $state(false);

  // Invite form
  let inviteEmail = $state('');
  let invitePhone = $state('');
  let inviteName = $state('');
  let inviteMessage = $state<string | null>(null);

  const selectedSection = $derived(
    sections.find((s) => s.id === selectedSectionId) ?? null,
  );
  const selectedBand = $derived(
    bands.find((b) => b.id === selectedSection?.bandId) ?? null,
  );
  const sectionChildren = $derived(
    children.filter((c) => c.sectionId === selectedSectionId),
  );
  const sectionAssignments = $derived(
    assignments.filter((a) => a.sectionId === selectedSectionId),
  );

  async function refreshAll() {
    const [secs, kids, assigns, teach, bandList] = await Promise.all([
      api.listSections(),
      api.listChildren(),
      api.listTeacherSections(),
      api.listTeachers(),
      api.listBands(),
    ]);
    sections = secs;
    children = kids;
    assignments = assigns;
    teachers = teach;
    bands = bandList;
    if (!selectedSectionId && secs.length > 0) {
      selectedSectionId = secs[0].id;
    }
    if (selectedSectionId && !secs.some((s) => s.id === selectedSectionId)) {
      selectedSectionId = secs[0]?.id ?? null;
    }
    if (!newSectionBandId && bandList.length > 0) {
      newSectionBandId = bandList[0].id;
    }
  }

  onMount(async () => {
    try {
      await refreshAll();
    } catch (err) {
      error = err instanceof Error ? err.message : 'Failed to load roster';
    } finally {
      loading = false;
    }
  });

  const run = async (fn: () => Promise<void>) => {
    busy = true;
    error = null;
    inviteMessage = null;
    try {
      await fn();
    } catch (err) {
      error = err instanceof Error ? err.message : 'Request failed';
    } finally {
      busy = false;
    }
  };

  const handleCreateSection = () =>
    run(async () => {
      if (!newSectionName.trim() || !newSectionBandId) {
        throw new Error('Section name and band are required');
      }
      await api.createSection({
        name: newSectionName.trim(),
        bandId: newSectionBandId,
        grade: newSectionGrade.trim() || undefined,
      });
      newSectionName = '';
      newSectionGrade = '';
      await refreshAll();
    });

  const handleDeleteSection = (sectionId: string) =>
    run(async () => {
      await api.deleteSection(sectionId);
      await refreshAll();
    });

  const handleCreateChild = () =>
    run(async () => {
      if (!selectedSectionId) throw new Error('Select a section first');
      if (!newChildName.trim()) throw new Error('Child name is required');
      const rollErr = validateRollNumber(newChildRoll);
      if (rollErr) throw new Error(rollErr);
      await api.createChild({
        sectionId: selectedSectionId,
        name: newChildName.trim(),
        rollNumber: newChildRoll.trim() || undefined,
      });
      newChildName = '';
      newChildRoll = '';
      await refreshAll();
    });

  const handleChildStatus = (childId: string, status: ChildStatus) =>
    run(async () => {
      await api.updateChildStatus(childId, status);
      await refreshAll();
    });

  const handleAssign = () =>
    run(async () => {
      if (!selectedSectionId) throw new Error('Select a section first');
      if (!assignTeacherId) throw new Error('Select a teacher');
      const subjectId = subjectRequiredForBand(selectedBand)
        ? assignSubjectId || null
        : null;
      const subjectErr = validateSubjectForBand(selectedBand, subjectId);
      if (subjectErr) throw new Error(subjectErr);
      await api.createTeacherSection({
        teacherId: assignTeacherId,
        sectionId: selectedSectionId,
        subjectId,
        isClassTeacher: assignIsClassTeacher,
      });
      assignTeacherId = '';
      assignSubjectId = '';
      assignIsClassTeacher = false;
      await refreshAll();
    });

  const handleUnassign = (assignmentId: string) =>
    run(async () => {
      await api.deleteTeacherSection(assignmentId);
      await refreshAll();
    });

  const handleInvite = () =>
    run(async () => {
      if (!inviteEmail.trim() && !invitePhone.trim()) {
        throw new Error('Provide email or phone');
      }
      if (inviteEmail.trim() && invitePhone.trim()) {
        throw new Error('Provide email or phone, not both');
      }
      const result = await api.inviteTeacher({
        email: inviteEmail.trim() || undefined,
        phone: invitePhone.trim() || undefined,
        displayName: inviteName.trim() || undefined,
        memberType: 'teacher',
      });
      inviteMessage = `Invite sent (${result.delivery}). Identity ${result.identityId.slice(0, 8)}…`;
      inviteEmail = '';
      invitePhone = '';
      inviteName = '';
      await refreshAll();
    });

  const bandName = (bandId: string | null) =>
    bands.find((b) => b.id === bandId)?.nameEn ?? bandId?.slice(0, 8) ?? '—';

  const teacherName = (teacherId: string) => {
    const t = teachers.find((x) => x.teacherId === teacherId);
    return t ? teacherLabel(t) : teacherId.slice(0, 8);
  };
</script>

<AdminNav />

<main class="mx-auto max-w-5xl px-4 py-8">
  <h1 class="text-2xl font-semibold text-slate-900">School roster</h1>
  <p class="mt-1 text-sm text-slate-600">
    Sections, children, teacher assignments, and invites. Structural provisioning only — no
    assessment data.
  </p>

  {#if loading}
    <p class="mt-6 text-sm text-slate-500">Loading…</p>
  {:else}
    {#if error}
      <p class="mt-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800" role="alert">
        {error}
      </p>
    {/if}
    {#if inviteMessage}
      <p class="mt-4 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800" data-testid="invite-ok">
        {inviteMessage}
      </p>
    {/if}

    <div class="mt-8 grid gap-8 lg:grid-cols-3">
      <!-- Sections column -->
      <section class="rounded-xl border border-slate-200 bg-white p-4 shadow-sm" aria-label="Sections">
        <h2 class="text-sm font-semibold uppercase tracking-wide text-slate-500">Sections</h2>
        <ul class="mt-3 space-y-1" data-testid="section-list">
          {#each sections as section}
            <li>
              <button
                type="button"
                class="flex w-full items-center justify-between rounded-md px-2 py-1.5 text-left text-sm {selectedSectionId ===
                section.id
                  ? 'bg-emerald-50 font-medium text-emerald-900'
                  : 'text-slate-700 hover:bg-slate-50'}"
                onclick={() => (selectedSectionId = section.id)}
              >
                <span>{section.name}</span>
                <span class="text-xs text-slate-400">{bandName(section.bandId)}</span>
              </button>
            </li>
          {:else}
            <li class="text-sm text-slate-500">No sections yet</li>
          {/each}
        </ul>

        <form
          class="mt-4 space-y-2 border-t border-slate-100 pt-4"
          onsubmit={(e) => {
            e.preventDefault();
            handleCreateSection();
          }}
        >
          <p class="text-xs font-medium text-slate-600">Add section</p>
          <input
            class="w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm"
            placeholder="Name"
            bind:value={newSectionName}
            data-testid="section-name"
          />
          <select
            class="w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm"
            bind:value={newSectionBandId}
            data-testid="section-band"
          >
            {#each bands as band}
              <option value={band.id}>{band.nameEn}</option>
            {/each}
          </select>
          <input
            class="w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm"
            placeholder="Grade label (optional)"
            bind:value={newSectionGrade}
          />
          <button
            type="submit"
            class="w-full rounded-md bg-emerald-700 px-2 py-1.5 text-sm text-white hover:bg-emerald-800 disabled:opacity-50"
            disabled={busy}
            data-testid="create-section"
          >
            Create section
          </button>
        </form>

        {#if selectedSectionId}
          <button
            type="button"
            class="mt-3 w-full rounded-md border border-red-200 px-2 py-1.5 text-sm text-red-700 hover:bg-red-50 disabled:opacity-50"
            disabled={busy}
            onclick={() => handleDeleteSection(selectedSectionId!)}
            data-testid="delete-section"
          >
            Delete selected section
          </button>
        {/if}
      </section>

      <!-- Children + assignments -->
      <section class="space-y-6 lg:col-span-2">
        {#if !selectedSection}
          <p class="text-sm text-slate-500">Select or create a section to manage children and assignments.</p>
        {:else}
          <div class="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <h2 class="text-sm font-semibold uppercase tracking-wide text-slate-500">
              Children — {selectedSection.name}
            </h2>
            <ul class="mt-3 divide-y divide-slate-100" data-testid="child-list">
              {#each sectionChildren as child}
                <li class="flex flex-wrap items-center justify-between gap-2 py-2 text-sm">
                  <div>
                    <span class="font-medium text-slate-900">{child.name}</span>
                    {#if child.rollNumber}
                      <span class="ml-2 text-slate-500">#{child.rollNumber}</span>
                    {/if}
                    <span class="ml-2 rounded bg-slate-100 px-1.5 py-0.5 text-xs text-slate-600"
                      >{child.status}</span
                    >
                  </div>
                  <div class="flex gap-1">
                    {#if child.status === 'active'}
                      <button
                        type="button"
                        class="rounded border border-slate-200 px-2 py-0.5 text-xs hover:bg-slate-50"
                        disabled={busy}
                        onclick={() => handleChildStatus(child.id, 'promoted')}
                      >
                        Promote
                      </button>
                      <button
                        type="button"
                        class="rounded border border-slate-200 px-2 py-0.5 text-xs hover:bg-slate-50"
                        disabled={busy}
                        onclick={() => handleChildStatus(child.id, 'exited')}
                      >
                        Exit
                      </button>
                    {/if}
                  </div>
                </li>
              {:else}
                <li class="py-2 text-sm text-slate-500">No children in this section</li>
              {/each}
            </ul>
            <form
              class="mt-3 flex flex-wrap gap-2 border-t border-slate-100 pt-3"
              onsubmit={(e) => {
                e.preventDefault();
                handleCreateChild();
              }}
            >
              <input
                class="min-w-[10rem] flex-1 rounded-md border border-slate-300 px-2 py-1.5 text-sm"
                placeholder="Child name"
                bind:value={newChildName}
                data-testid="child-name"
              />
              <input
                class="w-24 rounded-md border border-slate-300 px-2 py-1.5 text-sm"
                placeholder="Roll #"
                bind:value={newChildRoll}
                data-testid="child-roll"
              />
              <button
                type="submit"
                class="rounded-md bg-emerald-700 px-3 py-1.5 text-sm text-white hover:bg-emerald-800 disabled:opacity-50"
                disabled={busy}
                data-testid="create-child"
              >
                Add child
              </button>
            </form>
          </div>

          <div class="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <h2 class="text-sm font-semibold uppercase tracking-wide text-slate-500">
              Teacher assignments
            </h2>
            <ul class="mt-3 divide-y divide-slate-100" data-testid="assignment-list">
              {#each sectionAssignments as row}
                <li class="flex items-center justify-between gap-2 py-2 text-sm">
                  <div>
                    <span class="font-medium">{teacherName(row.teacherId)}</span>
                    {#if row.isClassTeacher}
                      <span class="ml-2 rounded bg-amber-50 px-1.5 py-0.5 text-xs text-amber-800"
                        >class teacher</span
                      >
                    {/if}
                    {#if row.subjectId}
                      <span class="ml-2 text-xs text-slate-500"
                        >{selectedBand?.subjects.find((s) => s.id === row.subjectId)?.nameEn ??
                          row.subjectId.slice(0, 8)}</span
                      >
                    {:else}
                      <span class="ml-2 text-xs text-slate-400">no subject (pre-primary)</span>
                    {/if}
                  </div>
                  <button
                    type="button"
                    class="rounded border border-slate-200 px-2 py-0.5 text-xs text-red-700 hover:bg-red-50"
                    disabled={busy}
                    onclick={() => handleUnassign(row.id)}
                  >
                    Unassign
                  </button>
                </li>
              {:else}
                <li class="py-2 text-sm text-slate-500">No assignments yet</li>
              {/each}
            </ul>
            <form
              class="mt-3 grid gap-2 border-t border-slate-100 pt-3 sm:grid-cols-2"
              onsubmit={(e) => {
                e.preventDefault();
                handleAssign();
              }}
            >
              <select
                class="rounded-md border border-slate-300 px-2 py-1.5 text-sm"
                bind:value={assignTeacherId}
                data-testid="assign-teacher"
              >
                <option value="">Select teacher</option>
                {#each teachers as t}
                  <option value={t.teacherId}>{teacherLabel(t)}</option>
                {/each}
              </select>
              {#if subjectRequiredForBand(selectedBand)}
                <select
                  class="rounded-md border border-slate-300 px-2 py-1.5 text-sm"
                  bind:value={assignSubjectId}
                  data-testid="assign-subject"
                >
                  <option value="">Select subject</option>
                  {#each selectedBand?.subjects ?? [] as subj}
                    <option value={subj.id}>{subj.nameEn}</option>
                  {/each}
                </select>
              {:else}
                <p class="text-xs text-slate-500 self-center">Subject not required for this band</p>
              {/if}
              <label class="flex items-center gap-2 text-sm text-slate-700">
                <input type="checkbox" bind:checked={assignIsClassTeacher} />
                Class teacher
              </label>
              <button
                type="submit"
                class="rounded-md bg-emerald-700 px-3 py-1.5 text-sm text-white hover:bg-emerald-800 disabled:opacity-50"
                disabled={busy}
                data-testid="create-assignment"
              >
                Assign
              </button>
            </form>
          </div>
        {/if}

        <!-- Teachers + invite -->
        <div class="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <h2 class="text-sm font-semibold uppercase tracking-wide text-slate-500">Teachers</h2>
          <ul class="mt-3 divide-y divide-slate-100" data-testid="teacher-list">
            {#each teachers as t}
              <li class="flex justify-between py-2 text-sm">
                <span class="font-medium text-slate-900">{teacherLabel(t)}</span>
                <span class="text-xs text-slate-500">{accountStatusLabel(t.accountStatus)}</span>
              </li>
            {:else}
              <li class="py-2 text-sm text-slate-500">No teachers yet — invite below</li>
            {/each}
          </ul>
          <form
            class="mt-3 grid gap-2 border-t border-slate-100 pt-3 sm:grid-cols-2"
            onsubmit={(e) => {
              e.preventDefault();
              handleInvite();
            }}
          >
            <p class="sm:col-span-2 text-xs font-medium text-slate-600">Invite teacher</p>
            <input
              class="rounded-md border border-slate-300 px-2 py-1.5 text-sm"
              placeholder="Display name"
              bind:value={inviteName}
              data-testid="invite-name"
            />
            <input
              class="rounded-md border border-slate-300 px-2 py-1.5 text-sm"
              placeholder="Email"
              bind:value={inviteEmail}
              data-testid="invite-email"
            />
            <input
              class="rounded-md border border-slate-300 px-2 py-1.5 text-sm"
              placeholder="Phone (mobile-only)"
              bind:value={invitePhone}
              data-testid="invite-phone"
            />
            <button
              type="submit"
              class="rounded-md bg-slate-800 px-3 py-1.5 text-sm text-white hover:bg-slate-900 disabled:opacity-50"
              disabled={busy}
              data-testid="invite-submit"
            >
              Send invite
            </button>
          </form>
        </div>
      </section>
    </div>
  {/if}
</main>
