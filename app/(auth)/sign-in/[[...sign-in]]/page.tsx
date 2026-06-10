import { SignIn } from "@clerk/nextjs";

const appearance = {
  variables: {
    colorPrimary: "#121A61",
    colorBackground: "#ffffff",
    fontFamily: "Inter, sans-serif",
  },
};

export default function SignInPage() {
  return <SignIn appearance={appearance} />;
}
