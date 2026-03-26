import type { AuthUser } from "@/auth-routing"

import RegistrationsShell from "./RegistrationsShell"
import { useRegistrationsTabShellProps } from "./useRegistrationsTabShellProps"

export default function RegistrationsTab({ user }: { user: AuthUser | null }) {
  const shellProps = useRegistrationsTabShellProps(user)
  return <RegistrationsShell {...shellProps} />
}
