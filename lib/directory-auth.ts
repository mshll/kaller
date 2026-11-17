import { getApps, initializeApp } from "firebase/app"
import { getAuth, signInAnonymously } from "firebase/auth"

const app = getApps().find((app) => app.name === "menodag-search") ?? initializeApp({
  apiKey: "AIzaSyCTuVUrjkGThzMxgUrYty96ENcD35ZeeAU",
}, "menodag-search")
const auth = getAuth(app)
let signingIn: ReturnType<typeof signInAnonymously> | undefined

/** Reuse the directory's anonymous session; the SDK refreshes expiring ID tokens. */
export async function getSearchToken(forceRefresh = false): Promise<string> {
  const user = auth.currentUser ?? (await (signingIn ??= signInAnonymously(auth).finally(() => {
    signingIn = undefined
  }))).user
  return user.getIdToken(forceRefresh)
}
