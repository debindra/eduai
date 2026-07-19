<script lang="ts">
  import { link, push } from '@keenmate/svelte-spa-router';
  import Alert from '../shared/Alert.svelte';
  import { toErrorMessage } from '../../lib/shared/errors';
  import { requestRecoveryOtp, verifyRecoveryOtpAndSetPassword } from './api';

  let step = $state<'request' | 'verify'>('request');
  let phone = $state('');
  let otp = $state('');
  let newPassword = $state('');
  let loading = $state(false);
  let message = $state<string | null>(null);
  let error = $state<string | null>(null);

  const handleRequestOtp = async (event: SubmitEvent) => {
    event.preventDefault();
    loading = true;
    error = null;
    message = null;
    try {
      const response = await requestRecoveryOtp({ identifier: phone });
      message = response.message;
      step = 'verify';
    } catch (err) {
      error = toErrorMessage(err, 'Could not send OTP');
    } finally {
      loading = false;
    }
  };

  const handleVerify = async (event: SubmitEvent) => {
    event.preventDefault();
    loading = true;
    error = null;
    try {
      await verifyRecoveryOtpAndSetPassword({
        identifier: phone,
        otp,
        newPassword,
      });
      push('/login');
    } catch (err) {
      error = toErrorMessage(err, 'Verification failed');
    } finally {
      loading = false;
    }
  };
</script>

<main class="mx-auto flex min-h-screen max-w-md flex-col justify-center px-4 py-12">
  <div class="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
    <a use:link href="/login" class="text-sm font-medium text-emerald-700 hover:underline">
      ← Back to sign in
    </a>
    <h1 class="mt-4 text-2xl font-semibold text-slate-900">Password recovery</h1>
    <p class="mt-2 text-sm text-slate-600">
      WhatsApp OTP first, SMS fallback. Not a sign-in method.
    </p>

    {#if step === 'request'}
      <form class="mt-6 space-y-4" onsubmit={handleRequestOtp}>
        <div>
          <label for="phone" class="block text-sm font-medium text-slate-700">
            Mobile number
          </label>
          <input
            id="phone"
            name="phone"
            type="tel"
            required
            bind:value={phone}
            class="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600"
          />
        </div>

        <Alert message={error} />

        <button
          type="submit"
          disabled={loading}
          class="w-full rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-60"
        >
          {loading ? 'Sending…' : 'Send recovery OTP'}
        </button>
      </form>
    {:else}
      <Alert variant="success" message={message} class="mt-4" />

      <form class="mt-6 space-y-4" onsubmit={handleVerify}>
        <div>
          <label for="otp" class="block text-sm font-medium text-slate-700">OTP</label>
          <input
            id="otp"
            name="otp"
            type="text"
            inputmode="numeric"
            required
            bind:value={otp}
            class="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600"
          />
        </div>

        <div>
          <label for="newPassword" class="block text-sm font-medium text-slate-700">
            New password
          </label>
          <input
            id="newPassword"
            name="newPassword"
            type="password"
            autocomplete="new-password"
            required
            bind:value={newPassword}
            class="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600"
          />
        </div>

        <Alert message={error} />

        <button
          type="submit"
          disabled={loading}
          class="w-full rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-60"
        >
          {loading ? 'Verifying…' : 'Set new password'}
        </button>
      </form>
    {/if}
  </div>
</main>
