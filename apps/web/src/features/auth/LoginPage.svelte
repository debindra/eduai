<script lang="ts">
  import { link, push } from '@keenmate/svelte-spa-router';
  import { login } from './api';

  let identifier = $state('');
  let password = $state('');
  let loading = $state(false);
  let error = $state<string | null>(null);

  const handleSubmit = async (event: SubmitEvent) => {
    event.preventDefault();
    loading = true;
    error = null;
    try {
      const response = await login({ identifier, password });
      if (response.memberType === 'admin') {
        push('/admin/calendar');
      } else {
        push('/teacher/sweep');
      }
    } catch (err) {
      error = err instanceof Error ? err.message : 'Login failed';
    } finally {
      loading = false;
    }
  };
</script>

<main class="mx-auto flex min-h-screen max-w-md flex-col justify-center px-4 py-12">
  <div class="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
    <h1 class="text-2xl font-semibold text-slate-900">Sign in</h1>
    <p class="mt-2 text-sm text-slate-600">
      Email or mobile number + password. Phone OTP is for recovery only.
    </p>

    <form class="mt-6 space-y-4" onsubmit={handleSubmit}>
      <div>
        <label for="identifier" class="block text-sm font-medium text-slate-700">
          Username
        </label>
        <input
          id="identifier"
          name="identifier"
          type="text"
          autocomplete="username"
          required
          bind:value={identifier}
          class="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600"
        />
      </div>

      <div>
        <label for="password" class="block text-sm font-medium text-slate-700">
          Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autocomplete="current-password"
          required
          bind:value={password}
          class="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600"
        />
      </div>

      {#if error}
        <p class="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
          {error}
        </p>
      {/if}

      <button
        type="submit"
        disabled={loading}
        class="w-full rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-60"
      >
        {loading ? 'Signing in…' : 'Sign in'}
      </button>
    </form>

    <p class="mt-4 text-center text-sm text-slate-600">
      <a use:link href="/login/recovery" class="font-medium text-emerald-700 hover:underline">
        Forgot password?
      </a>
    </p>
  </div>
</main>
