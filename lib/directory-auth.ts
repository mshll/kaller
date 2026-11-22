import { getApps, initializeApp } from "firebase/app"
import { getAuth, signInAnonymously } from "firebase/auth"

const app = getApps().find((app) => app.name === "menodag-search") ?? initializeApp({
  apiKey: "AIzaSyCTuVUrjkGThzMxgUrYty96ENcD35ZeeAU",
}, "menodag-search")
const auth = getAuth(app)
let signingIn: ReturnType<typeof signInAnonymously> | undefined

/** Reuse the directory's anonymous session; the SDK refreshes expiring ID tokens. */
export async function getSearchToken(forceRefresh: boolean, signal: AbortSignal): Promise<string> {
  signal.throwIfAborted()
  return new Promise((resolve, reject) => {
    const cancel = () => reject(signal.reason)
    signal.addEventListener("abort", cancel, { once: true })
    const user = auth.currentUser ? Promise.resolve(auth.currentUser) :
      (signingIn ??= signInAnonymously(auth).finally(() => {
        signingIn = undefined
      })).then((credential) => credential.user)
    user.then((user) => user.getIdToken(forceRefresh)).then(resolve, reject)
      .finally(() => signal.removeEventListener("abort", cancel))
  })
}
