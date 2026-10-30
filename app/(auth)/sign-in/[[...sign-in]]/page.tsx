import { SignIn } from "@clerk/nextjs";
import { appearanceClerk } from "@/lib/branding/tema";
import { TEMA_BIOTEAM } from "@/lib/branding/tokens";

const appearance = {
  ...appearanceClerk(TEMA_BIOTEAM),
  elements: {
    footerAction: { display: "none" },
  },
};

export default function SignInPage() {
  return <SignIn appearance={appearance} />;
}
