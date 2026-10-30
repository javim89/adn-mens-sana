import { SignUp } from "@clerk/nextjs";
import { appearanceClerk } from "@/lib/branding/tema";
import { TEMA_BIOTEAM } from "@/lib/branding/tokens";

const appearance = appearanceClerk(TEMA_BIOTEAM);

export default function SignUpPage() {
  return <SignUp appearance={appearance} />;
}
