<script lang="ts">
  import { link } from '@keenmate/svelte-spa-router';

  const appName =
    import.meta.env.VITE_APP_NAME ??
    import.meta.env.PUBLIC_APP_NAME ??
    'EduAI Nepal';
</script>

<main class="mx-auto flex min-h-screen max-w-2xl flex-col justify-center px-4 py-12">
  <div class="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
    <p class="text-sm font-medium uppercase tracking-wide text-emerald-700">
      Web companion
    </p>
    <h1 class="mt-2 text-3xl font-semibold text-slate-900">{appName}</h1>
    <p class="mt-3 text-slate-600">
      Svelte SPA + Tailwind. Business logic lives in the NestJS API — this app
      is a thin client only.
    </p>
    <div class="mt-6 flex flex-wrap gap-3">
      <a
        use:link
        href="/login"
        class="inline-flex items-center rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
      >
        Sign in
      </a>
      <a
        use:link
        href="/health"
        class="inline-flex items-center rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-800 hover:bg-slate-50"
      >
        API health check
      </a>
    </div>
  </div>
</main>
