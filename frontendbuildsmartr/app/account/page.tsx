import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import Image from "next/image";

export default async function AccountPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/");
  }

  const metadata = user.user_metadata;
  const avatarUrl = metadata?.avatar_url ?? metadata?.picture ?? null;
  const fullName = metadata?.full_name ?? metadata?.name ?? "Unknown";
  const email = user.email ?? metadata?.email ?? "No email";
  const provider = user.app_metadata?.provider ?? "Unknown";
  const emailVerified = metadata?.email_verified ?? false;
  const createdAt = new Date(user.created_at).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  const lastSignIn = user.last_sign_in_at
    ? new Date(user.last_sign_in_at).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "Never";

  return (
    <div className="min-h-screen bg-background p-4 sm:p-6 md:p-8 pt-16 md:pt-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-6 sm:mb-8">Profile</h1>

        {/* Profile Card */}
        <div className="bg-surface border border-border rounded-xl p-4 sm:p-6 mb-4 sm:mb-6">
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 sm:gap-6 mb-6 text-center sm:text-left">
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt="Profile"
                className="w-20 h-20 sm:w-24 sm:h-24 rounded-full object-cover shrink-0"
              />
            ) : (
              <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-accent flex items-center justify-center shrink-0">
                <span className="text-2xl sm:text-3xl font-bold text-background">
                  {fullName.charAt(0).toUpperCase()}
                </span>
              </div>
            )}
            <div className="min-w-0">
              <h2 className="text-xl sm:text-2xl font-semibold text-foreground truncate">{fullName}</h2>
              <p className="text-muted-foreground text-sm sm:text-base break-all">{email}</p>
              <div className="flex items-center justify-center sm:justify-start gap-2 mt-2 flex-wrap">
                <span
                  className={`px-2 py-1 text-xs rounded-full ${
                    emailVerified
                      ? "bg-green-500/20 text-green-400"
                      : "bg-yellow-500/20 text-yellow-400"
                  }`}
                >
                  {emailVerified ? "Verified" : "Unverified"}
                </span>
                <span className="px-2 py-1 text-xs rounded-full bg-accent/20 text-accent capitalize">
                  {provider}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Account Details */}
        <div className="bg-surface border border-border rounded-xl p-4 sm:p-6 mb-4 sm:mb-6">
          <h3 className="text-base sm:text-lg font-semibold text-foreground mb-4">Account Details</h3>
          <div className="space-y-4">
            <DetailRow label="User ID" value={user.id} />
            <DetailRow label="Email" value={email} />
            <DetailRow label="Full Name" value={fullName} />
            <DetailRow label="Provider" value={provider} />
            <DetailRow label="Created" value={createdAt} />
            <DetailRow label="Last Sign In" value={lastSignIn} />
          </div>
        </div>

        {/* Provider Info */}
        {user.identities && user.identities.length > 0 && (
          <div className="bg-surface border border-border rounded-xl p-4 sm:p-6">
            <h3 className="text-base sm:text-lg font-semibold text-foreground mb-4">Connected Accounts</h3>
            <div className="space-y-3 sm:space-y-4">
              {user.identities.map((identity) => {
                const identityAvatar =
                  (identity.identity_data as { avatar_url?: string; picture?: string })?.avatar_url ??
                  (identity.identity_data as { avatar_url?: string; picture?: string })?.picture ??
                  null;

                return (
                  <div
                    key={identity.identity_id}
                    className="flex flex-col sm:flex-row sm:items-center justify-between p-3 sm:p-4 bg-muted/20 rounded-lg gap-3 sm:gap-4"
                  >
                    <div className="flex items-center gap-3">
                      {identityAvatar ? (
                        <img
                          src={identityAvatar}
                          alt={`${identity.provider} avatar`}
                          className="w-10 h-10 rounded-full object-cover shrink-0"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-accent/20 flex items-center justify-center shrink-0">
                          <span className="text-sm font-semibold text-accent capitalize">
                            {identity.provider.charAt(0).toUpperCase()}
                          </span>
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="font-medium text-foreground capitalize">{identity.provider}</p>
                        <p className="text-sm text-muted-foreground truncate">
                          {(identity.identity_data as { email?: string })?.email ?? "No email"}
                        </p>
                      </div>
                    </div>
                    <span className="text-xs text-muted-foreground sm:shrink-0">
                      Connected {identity.created_at ? new Date(identity.created_at).toLocaleDateString() : "Unknown"}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4">
      <span className="text-sm text-muted-foreground w-32 shrink-0">{label}</span>
      <span className="text-foreground break-all">{value}</span>
    </div>
  );
}
