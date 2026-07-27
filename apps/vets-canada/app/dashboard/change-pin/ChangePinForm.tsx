"use client";

import { useFormState, useFormStatus } from "react-dom";
import { changePinAction, type ChangePinState } from "./actions";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn-primary w-full" disabled={pending}>
      {pending ? "Saving…" : "Save PIN"}
    </button>
  );
}

export default function ChangePinForm() {
  const [state, formAction] = useFormState<ChangePinState, FormData>(
    changePinAction,
    {}
  );

  return (
    <form action={formAction} className="space-y-4">
      <div>
        <label className="label" htmlFor="newPin">
          New PIN
        </label>
        <input
          id="newPin"
          name="newPin"
          type="password"
          inputMode="numeric"
          pattern="\d{4}"
          maxLength={4}
          autoComplete="off"
          required
          className="input tracking-[0.5em] text-center text-2xl"
          placeholder="••••"
        />
      </div>
      <div>
        <label className="label" htmlFor="confirmPin">
          Confirm New PIN
        </label>
        <input
          id="confirmPin"
          name="confirmPin"
          type="password"
          inputMode="numeric"
          pattern="\d{4}"
          maxLength={4}
          autoComplete="off"
          required
          className="input tracking-[0.5em] text-center text-2xl"
          placeholder="••••"
        />
      </div>
      {state.error && (
        <p className="rounded-md bg-military/10 px-3 py-2 text-sm font-semibold text-military">
          {state.error}
        </p>
      )}
      <SubmitButton />
    </form>
  );
}
