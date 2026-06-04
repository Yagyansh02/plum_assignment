import { SignIn } from "@clerk/nextjs";

export default function SignInPage() {
  return (
    <div className="relative flex min-h-screen items-center justify-center bg-plum-950 px-4 py-16">
      {/* Background glow */}
      <div className="pointer-events-none absolute inset-0" aria-hidden="true">
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 h-96 w-96 rounded-full bg-plum-purple/15 blur-3xl" />
      </div>

      <div className="relative z-10 w-full max-w-md">
        {/* Logo */}
        <div className="mb-8 text-center">
          <span className="text-3xl font-black text-plum-red">plum</span>
          <p className="mt-2 text-sm text-white/60">
            Sign in to access your claims dashboard
          </p>
        </div>

        <SignIn
          appearance={{
            variables: {
              colorPrimary: "#e11d48",
              colorBackground: "#1a0a2e",
              colorText: "#ffffff",
              colorTextSecondary: "rgba(255,255,255,0.7)",
              colorInputBackground: "#12061f",
              colorInputText: "#ffffff",
              colorDanger: "#fb7185",
              borderRadius: "0.75rem",
              fontFamily: "Inter, system-ui, sans-serif",
            },
            elements: {
              rootBox: "w-full",
              card: "!bg-[#1a0a2e] !border !border-white/8 !shadow-2xl",
              headerTitle: "!text-white",
              headerSubtitle: "!text-white/70",
              socialButtonsBlockButton:
                "!border !border-white/10 !bg-white/5 hover:!bg-white/10 !transition-colors",
              socialButtonsBlockButtonText: "!text-white !font-medium",
              lastAuthenticationStrategyBadge:
                "!bg-white/90 !text-black !font-medium",
              dividerLine: "!bg-white/10",
              dividerText: "!text-white/50",
              formFieldLabel: "!text-white/80",
              formFieldInput:
                "!bg-[#12061f] !border-white/10 !text-white focus:!border-[#e11d48]",
              formButtonPrimary:
                "!bg-[#e11d48] hover:!bg-[#be123c] !text-white !font-semibold",
              footerActionText: "!text-white/70",
              footerActionLink:
                "!text-[#e11d48] hover:!text-[#fb7185] !font-semibold",
              identityPreviewText: "!text-white",
              formFieldSuccessText: "!text-emerald-400",
              formFieldInfoText: "!text-white/70",
            },
          }}
        />
      </div>
    </div>
  );
}
