<script lang="ts">
  import { link } from '@keenmate/svelte-spa-router';
  import active from '@keenmate/svelte-spa-router/active';
  import { push } from '@keenmate/svelte-spa-router';
  import { clearSession, session } from '../../lib/shared/stores/session';
  import {
    clearSupportSession,
    supportSession,
  } from '../../lib/shared/stores/support-session';

  const links = [
    { href: '/platform/schools', label: 'Tenants' },
    { href: '/platform/national-calendar', label: 'National calendar' },
    { href: '/platform/support-sessions', label: 'Support sessions' },
  ] as const;

  const handleSignOut = async () => {
    clearSupportSession();
    clearSession();
    await push('/login');
  };

  const handleLeaveSupport = () => {
    clearSupportSession();
  };
</script>

<header class="border-b border-slate-200 bg-white">
  <div class="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3">
    <nav class="flex flex-wrap items-center gap-1 text-sm" aria-label="Platform">
      {#each links as item (item.href)}
        <a
          use:link
          use:active={{
            className: 'bg-violet-50 font-medium text-violet-800',
            inactiveClassName: 'text-slate-600 hover:bg-slate-50 hover:text-slate-900',
          }}
          href={item.href}
          class="rounded-md px-2.5 py-1.5"
        >
          {item.label}
        </a>
      {/each}
    </nav>
    <div class="flex items-center gap-3 text-sm text-slate-600">
      {#if $supportSession}
        <span class="rounded-full bg-amber-50 px-3 py-1 text-amber-800">
          Support: {$supportSession.schoolName ?? $supportSession.schoolId}
          <button
            type="button"
            class="ml-2 font-medium underline"
            onclick={handleLeaveSupport}
          >
            Leave
          </button>
        </span>
      {/if}
      <span>{$session?.identity.displayName ?? $session?.identity.email ?? 'Platform'}</span>
      <button
        type="button"
        class="rounded-lg border border-slate-300 px-3 py-1 text-slate-700 hover:bg-slate-50"
        onclick={handleSignOut}
      >
        Sign out
      </button>
    </div>
  </div>
</header>
