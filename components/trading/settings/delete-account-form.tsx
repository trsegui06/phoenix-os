"use client";

import { deleteAccountFormAction } from "@/app/actions/trading-settings";
import { PendingSubmitButton } from "@/components/ui/pending-submit-button";

export function DeleteAccountForm({ accountId }: { accountId: string }) {
  return (
    <form
      action={deleteAccountFormAction}
      onSubmit={(event) => {
        if (
          !window.confirm(
            "Delete this Trading Account? This account can only be deleted if it has never been used.",
          )
        )
          event.preventDefault();
      }}
      className="mt-4 border-t border-slate-800 pt-4 sm:col-span-2"
    >
      <input type="hidden" name="id" value={accountId} />
      <p className="mb-3 text-xs text-slate-400">
        This account can only be deleted if it has never been used.
      </p>
      <PendingSubmitButton
        pendingLabel="Deleting Trading Account…"
        className="rounded-lg border border-red-800 px-3 py-2 text-sm font-semibold text-red-200 hover:border-red-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-500 disabled:cursor-wait disabled:opacity-60"
      >
        Delete account
      </PendingSubmitButton>
    </form>
  );
}
